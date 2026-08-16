import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * PRINCIPLES #9 ("tokens, never literals") and the editorial colour rules
 * decided 2026-08-17 (tokens.ts header, requirements §4d): every hue the app
 * draws lives in `src/constants/tokens.ts`. Screens and components read it
 * through `useTokens()`.
 *
 * This test walks `src/app` and `src/components` and fails on:
 *  - a hex / rgb() / hsl() colour literal;
 *  - an import of the scaffold's `@/constants/theme` (Colors / Brand / Fyp).
 *
 * Exceptions are listed by file WITH a reason and an owner. An entry here is
 * a debt, not a licence: remove it when the file migrates. Never add one to
 * silence a new screen.
 */
const SRC = join(__dirname, '..');
const ROOTS = ['app', 'components'].map((dir) => join(SRC, dir));

/** file (relative to src) → why it may still name a colour. */
const EXCEPTIONS: Record<string, string> = {
  // R&D-only prototypes on rnd; never promoted (requirements §4e branch model).
  'app/(tabs)/explore.tsx': 'rnd prototype scaffolding; uses the legacy Fyp palette',
  'app/proto-stalls.tsx': 'rnd prototype scaffolding; uses the legacy Fyp palette',
  // Expo scaffold leftovers not yet migrated to tokens (task: theme.ts consolidation, §4d).
  'app/(tabs)/index.tsx': 'For You still reads BottomTabInset from theme.ts — layout constant, no colour',
  'app/(tabs)/more.tsx': 'reads BottomTabInset from theme.ts — layout constant, no colour',
  'app/_layout.tsx': 'session-loading spinner predates tokens; migrate with the auth slice',
  'components/themed-text.tsx': 'Expo scaffold; unused by rewrite screens',
  'components/themed-view.tsx': 'Expo scaffold; unused by rewrite screens',
  'components/animated-icon.tsx': 'Expo scaffold; unused by rewrite screens',
  'components/hint-row.tsx': 'Expo scaffold; unused by rewrite screens',
  'components/web-badge.tsx': 'Expo scaffold; unused by rewrite screens',
  'components/app-tabs.web.tsx': 'web tab bar; web is future scope (§4)',
  'components/ui/collapsible.tsx': 'Expo scaffold; unused by rewrite screens',
  // Brand-mandated third-party colours.
  'components/auth/auth-flow.tsx': 'Google "G" glyph is a Google brand colour; Apple/Google buttons follow vendor rules',
  // Overlay scrim.
  'app/menu.tsx': 'dim-behind scrim is black at partial opacity — a material, not a hue; token candidate',
};

const COLOR_LITERAL = /(['"`])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\1|\brgba?\(|\bhsla?\(/;
const SCAFFOLD_THEME_IMPORT = /from ['"]@\/constants\/theme['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('colour lives only in tokens.ts', () => {
  const files = ROOTS.flatMap((root) => walk(root));

  it('no screen or component names a colour literal or the scaffold palette', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(SRC, file);
      if (rel in EXCEPTIONS) continue;
      const body = readFileSync(file, 'utf8');
      const lines = body.split('\n');
      lines.forEach((line, i) => {
        if (COLOR_LITERAL.test(line) || SCAFFOLD_THEME_IMPORT.test(line)) {
          offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('every exception still exists and still needs to (no stale entries)', () => {
    const stale: string[] = [];
    for (const rel of Object.keys(EXCEPTIONS)) {
      const full = join(SRC, rel);
      let body: string;
      try {
        body = readFileSync(full, 'utf8');
      } catch {
        stale.push(`${rel}: file no longer exists`);
        continue;
      }
      if (!COLOR_LITERAL.test(body) && !SCAFFOLD_THEME_IMPORT.test(body)) {
        stale.push(`${rel}: clean now — remove its exception`);
      }
    }
    expect(stale).toEqual([]);
  });
});
