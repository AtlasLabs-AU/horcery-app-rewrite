/**
 * Alerts slice A0 — ground truth.
 *
 * Pulls the QA organization's alert TYPES and alert RULES from the production
 * API (READ-ONLY: GET requests only) and writes:
 *
 *   scratch/alerts/*.raw.json                     — untouched responses (gitignored)
 *   src/domain/alerts/__fixtures__/*.json         — anonymised, committed, used by tests
 *
 * Secrets are read from files, never from arguments or the terminal:
 *   EXPO_PUBLIC_FIREBASE_API_KEY          from ./.env.local          (gitignored)
 *   ARGENT_SECRET_HORCERY_QA_PASSWORD     from ~/.argent/secrets.env
 * If either is missing the script stops and says which — it never prompts.
 *
 * Run:  node scripts/pull-alert-fixtures.mts       (Node ≥ 23 strips types natively)
 *
 * See docs/handovers/Alerts_Implementation_Plan_for_Codex.md §2.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const QA_EMAIL = 'qa_atlas@atlaslabs.com.au';
const IDENTITY_HOST = 'https://identitytoolkit.googleapis.com/v1';

const ROOT = join(import.meta.dirname, '..');
const RAW_DIR = join(ROOT, 'scratch', 'alerts');
const FIXTURE_DIR = join(ROOT, 'src', 'domain', 'alerts', '__fixtures__');

// ---------------------------------------------------------------- secrets

function readEnvFile(path: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const local = readEnvFile(join(ROOT, '.env.local'));
const secrets = readEnvFile(join(homedir(), '.argent', 'secrets.env'));

const API_KEY = local.EXPO_PUBLIC_FIREBASE_API_KEY ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE_URL = (
  local.EXPO_PUBLIC_BASE_SERVICE_URL ??
  process.env.EXPO_PUBLIC_BASE_SERVICE_URL ??
  'https://api.magichoof.com/'
).replace(/\/?$/, '/');
const PASSWORD = secrets.ARGENT_SECRET_HORCERY_QA_PASSWORD;

const missing: string[] = [];
if (!API_KEY) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY in ./.env.local');
if (!PASSWORD) missing.push('ARGENT_SECRET_HORCERY_QA_PASSWORD in ~/.argent/secrets.env');
if (missing.length) {
  console.error(
    `Cannot run: missing ${missing.join(' and ')}.\n` +
      'Ask Inakshi to create/complete those files. Do not paste secrets into chat.',
  );
  process.exit(2);
}

// ---------------------------------------------------------------- auth

async function signIn(): Promise<string> {
  const res = await fetch(`${IDENTITY_HOST}/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: QA_EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  if (!res.ok) {
    // Surface Firebase's error CODE (e.g. INVALID_LOGIN_CREDENTIALS,
    // API_KEY_INVALID) — never the credentials themselves.
    let code = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      code = body.error?.message ?? '';
    } catch {
      /* no body */
    }
    throw new Error(`Firebase sign-in failed: HTTP ${res.status}${code ? ` ${code}` : ''}`);
  }
  const json = (await res.json()) as { idToken?: string };
  if (!json.idToken) throw new Error('Firebase sign-in returned no idToken');
  return json.idToken;
}

// ---------------------------------------------------------------- api (GET only)

interface Page<T> {
  data: T[];
  meta?: { has_next?: boolean; page_count?: number; count?: number };
}

async function getJson<T>(token: string, path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function getAllPages<T>(token: string, path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page < 200; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const body = await getJson<Page<T>>(token, `${path}${sep}page=${page}`);
    out.push(...(Array.isArray(body.data) ? body.data : []));
    if (!body.meta?.has_next) break;
  }
  return out;
}

// ---------------------------------------------------------------- anonymise

type Json = Record<string, unknown>;

function makeAliaser(prefix: string) {
  const map = new Map<string, string>();
  return (id: unknown): unknown => {
    if (typeof id !== 'string' || !id) return id;
    if (!map.has(id)) map.set(id, `${prefix}-${map.size + 1}`);
    return map.get(id);
  };
}

const ruleAlias = makeAliaser('rule');
const memberAlias = makeAliaser('member');
const targetAlias = makeAliaser('target'); // horses/stalls — object_type says which
const relAlias = makeAliaser('rel');

const DROP_KEYS = new Set([
  'created_by',
  'updated_by',
  'deleted_by',
  'created_by_id',
  'updated_by_id',
  // server-owned artefacts, never sent by the app
  'bucket_key',
  'rule_file_deleted_at',
]);

function anonymiseRule(rule: Json, orgAlias: string): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(rule)) {
    if (DROP_KEYS.has(key)) continue;
    switch (key) {
      case 'id':
        out[key] = ruleAlias(value);
        break;
      case 'organization_id':
        out[key] = orgAlias;
        break;
      case 'rule_application_ids':
        out[key] = Array.isArray(value) ? value.map(targetAlias) : value;
        break;
      case 'rule_notification_ids':
        out[key] = Array.isArray(value) ? value.map(memberAlias) : value;
        break;
      case 'alert_application_rules':
        out[key] = Array.isArray(value)
          ? value.map((rel) => anonymiseRelation(rel as Json, targetAlias))
          : value;
        break;
      case 'alert_notification_rules':
        out[key] = Array.isArray(value)
          ? value.map((rel) => anonymiseRelation(rel as Json, memberAlias))
          : value;
        break;
      case 'alert_type':
        // may be an id string or an embedded object; both are product config
        out[key] = value;
        break;
      default:
        out[key] = value;
    }
  }
  return out;
}

function anonymiseRelation(rel: Json, alias: (v: unknown) => unknown): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(rel)) {
    if (DROP_KEYS.has(key)) continue;
    if (key === 'id') out[key] = relAlias(value);
    else if (key === 'object_id' || key === 'member_id') out[key] = alias(value);
    else if (key === 'alert_rule') out[key] = ruleAlias(value);
    else if (key === 'organization_id') out[key] = 'org-qa';
    else out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------- main

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(FIXTURE_DIR, { recursive: true });

  const token = await signIn();

  // 1. organizations the QA user belongs to → pick the QA org
  const orgs = await getAllPages<Json>(
    token,
    'access_management/api/organization_management/organizations/?ordering=-created_at',
  );
  writeFileSync(join(RAW_DIR, 'organizations.raw.json'), JSON.stringify(orgs, null, 2));
  if (orgs.length === 0) throw new Error('QA user has no organizations');
  // The QA user belongs to several test organizations. Count rules in each
  // (GETs) and pull fixtures from the one with the MOST rules, or the one
  // named in QA_ORG_ID if set — the point of A0 is real rules, not an empty org.
  const preferred = process.env.QA_ORG_ID;
  let org = orgs[0] as { id: string; name?: string; timezone?: string };
  if (preferred) {
    const hit = (orgs as Array<{ id: string }>).find((o) => o.id === preferred);
    if (!hit) throw new Error('QA_ORG_ID is not one of the user\'s organizations');
    org = hit as typeof org;
  } else {
    let best = -1;
    for (const candidate of orgs as Array<{ id: string; name?: string; timezone?: string }>) {
      const page = await getJson<Page<Json>>(
        token,
        `alert_management/api/alert_handler/alert_rules/?organization_id=${candidate.id}&deleted_at__isnull=true&page=1`,
      );
      const n = page.meta?.count ?? (Array.isArray(page.data) ? page.data.length : 0);
      console.log(`  ${String(candidate.name ?? candidate.id).padEnd(28)} rules: ${n}  tz: ${candidate.timezone ?? 'MISSING'}`);
      if (n > best) {
        best = n;
        org = candidate;
      }
    }
  }
  console.log(`Organizations: ${orgs.length}. Using "${org.name ?? org.id}" (timezone: ${org.timezone ?? 'MISSING'})`);

  // 2. alert types (product configuration; committed as-is)
  const types = await getAllPages<Json>(
    token,
    'alert_management/api/alert_handler/alert_types/?deleted_at__isnull=true&ordering=name',
  );
  writeFileSync(join(RAW_DIR, 'alert-types.raw.json'), JSON.stringify(types, null, 2));
  // The committed fixture drops the server-side PromQL (`prometheus_metric_name`,
  // `AppMetaData.metric_templates`): the app never reads it, it is evaluation
  // internals, and the architecture keeps PromQL out of everything but the
  // data layer. Raw copy keeps it.
  const typeFixtures = types.map((t) => {
    const {
      prometheus_metric_name: _pm,
      prometheus_combined_metric_name: _pcm,
      ...rest
    } = t as Json & { prometheus_metric_name?: unknown; prometheus_combined_metric_name?: unknown };
    const meta = { ...((rest.AppMetaData as Json | undefined) ?? {}) };
    delete meta.metric_templates;
    return { ...rest, AppMetaData: meta };
  });
  writeFileSync(join(FIXTURE_DIR, 'alert-types.json'), JSON.stringify(typeFixtures, null, 2) + '\n');

  // 3. alert rules for the QA org (anonymised)
  const rules = await getAllPages<Json>(
    token,
    `alert_management/api/alert_handler/alert_rules/?organization_id=${org.id}&deleted_at__isnull=true&ordering=-created_at&include=alert_application_rules,alert_notification_rules`,
  );
  writeFileSync(join(RAW_DIR, 'alert-rules.raw.json'), JSON.stringify(rules, null, 2));
  const anonRules = rules.map((r) => anonymiseRule(r, 'org-qa'));
  writeFileSync(join(FIXTURE_DIR, 'alert-rules.json'), JSON.stringify(anonRules, null, 2) + '\n');

  // 4. organization zone only (no name/ids beyond what tests need)
  writeFileSync(
    join(FIXTURE_DIR, 'organization.json'),
    JSON.stringify({ id: 'org-qa', timezone: org.timezone ?? null }, null, 2) + '\n',
  );

  // 5. summary to stdout (for the A0 report)
  console.log(`\nAlert types: ${types.length}`);
  for (const t of types as Array<{ slug?: string; name?: string; threshold_type?: number; category?: number; AppMetaData?: Json }>) {
    const metaKeys = t.AppMetaData ? Object.keys(t.AppMetaData).sort().join(', ') : '—';
    console.log(`  ${String(t.slug ?? '(no slug)').padEnd(24)} threshold_type=${String(t.threshold_type).padEnd(3)} category=${t.category}  AppMetaData: ${metaKeys}`);
  }
  const bySlug = new Map<string, number>();
  for (const r of rules as Array<{ alert_type?: unknown }>) {
    const at = r.alert_type;
    const id = typeof at === 'string' ? at : (at as { id?: string })?.id;
    const slug = (types as Array<{ id?: string; slug?: string }>).find((t) => t.id === id)?.slug ?? String(id);
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
  }
  console.log(`\nAlert rules in QA org: ${rules.length}`);
  for (const [slug, n] of bySlug) console.log(`  ${slug.padEnd(24)} ${n}`);
  const withMeta = (rules as Array<{ UNATTESTED_META_DATA?: Json }>).filter(
    (r) => r.UNATTESTED_META_DATA && Object.keys(r.UNATTESTED_META_DATA).length > 0,
  ).length;
  console.log(`Rules with non-empty UNATTESTED_META_DATA: ${withMeta}`);
  console.log(`\nWrote raw → ${RAW_DIR}\nWrote fixtures → ${FIXTURE_DIR}`);
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
