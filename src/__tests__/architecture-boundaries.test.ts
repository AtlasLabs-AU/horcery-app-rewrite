import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Seed test 3 — architectural boundaries.
 *
 * Lint enforces these on changed files; this test asserts them across the whole
 * tree, and — importantly — proves the LINT RULE ITSELF still fails a violation.
 * A boundary rule that silently stops working is worse than no rule, because
 * everyone assumes it is holding.
 *
 * Boundaries (requirements §4d, §6a):
 *   1. Platform-specific @expo/ui only inside src/components/ui.
 *   2. Chart renderers only inside src/components/charts.
 *   3. No PromQL / direct Prometheus access from screens or components.
 */

const SRC = join(__dirname, '..');

/**
 * Files exempted while their owner-task is outstanding. MUST ONLY SHRINK.
 *
 * Emptied 2026-08-15 by the universal-adapter task (H1): the three For You
 * components that imported `@expo/ui/swift-ui` directly were replaced by
 * `components/ui/{menu,segmented-control,icon}`, which fork by platform
 * INSIDE the surface layer. Nothing is exempt any more — keep it that way.
 */
const BASELINE = new Set<string>([]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
      out.push(full);
  }
  return out;
}

const files = sourceFiles(SRC).map((f) => ({
  rel: relative(SRC, f),
  body: readFileSync(f, 'utf8'),
}));

const importsFrom = (body: string, patterns: RegExp[]) =>
  patterns.some((p) => p.test(body));

describe('architecture boundaries', () => {
  it('finds source files to check (guards against a silently empty sweep)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('keeps platform-specific @expo/ui inside the surface layer', () => {
    const offenders = files
      .filter(({ rel }) => !rel.startsWith(join('components', 'ui')))
      .filter(({ rel }) => !BASELINE.has(rel))
      .filter(({ body }) =>
        importsFrom(body, [
          /from ['"]@expo\/ui\/swift-ui/,
          /from ['"]@expo\/ui\/jetpack-compose/,
        ]),
      )
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it('keeps chart renderers inside the chart adapter', () => {
    const offenders = files
      .filter(({ rel }) => !rel.startsWith(join('components', 'charts')))
      .filter(({ body }) =>
        importsFrom(body, [
          /from ['"]echarts/,
          /from ['"]@wuba\/react-native-echarts/,
          /from ['"]react-native-echarts-pro/,
          /from ['"]victory-native/,
          /from ['"]@shopify\/react-native-skia/,
        ]),
      )
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it('has no chart renderer installed yet — the §6a spike has not run', () => {
    const pkg = JSON.parse(
      readFileSync(join(SRC, '..', 'package.json'), 'utf8'),
    );
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    });
    const renderers = deps.filter((d) =>
      /echarts|victory-native|react-native-skia/.test(d),
    );

    // Delete this assertion when the spike concludes and a winner is adopted.
    expect(renderers).toEqual([]);
  });

  it('keeps PromQL and Prometheus services out of screens and components', () => {
    const offenders = files
      .filter(
        ({ rel }) => rel.startsWith('app' + sep) || rel.startsWith('components' + sep),
      )
      .filter(({ body }) =>
        importsFrom(body, [
          /prometheus-management/,
          /federated-prometheus-management/,
          /prom-utils/,
        ]),
      )
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it('still fails a fresh violation — proves the lint rule is live', () => {
    // Lint a violating snippet via stdin. If this stops erroring, the boundary
    // config has broken and every other assertion here is a false positive.
    let failed = false;
    let output = '';
    try {
      execFileSync(
        'npx',
        ['eslint', '--stdin', '--stdin-filename', 'src/app/probe.tsx'],
        {
          input: `import { Button } from '@expo/ui/swift-ui';\nexport default function P() { return Button; }\n`,
          cwd: join(SRC, '..'),
          encoding: 'utf8',
        },
      );
    } catch (e: unknown) {
      failed = true;
      output = String((e as { stdout?: string }).stdout ?? '');
    }

    expect(failed).toBe(true);
    expect(output).toContain('no-restricted-imports');
  }, 60_000);
});
