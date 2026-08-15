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

  it('never reaches into spikes/ — throwaway measurement code stays outside the app', () => {
    // spikes/charts-harness has its OWN package.json with both chart renderers.
    // It imports the app's domain layer; the app must never import it back,
    // or the "no renderer installed" assertion above would be true in name only.
    const offenders = files
      .filter(({ body }) => /from ['"][^'"]*\bspikes\//.test(body))
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it('keeps PromQL and Prometheus out of everything but the data layer', () => {
    // DEFAULT-DENY, matching eslint.config.js. Checking only `app/` and
    // `components/` would exempt src/hooks, src/stores, and every directory
    // nobody has created yet — which is exactly where the next screen's data
    // fetching would be written.
    const DATA_LAYER = ['services' + sep, 'config' + sep];

    const offenders = files
      .filter(({ rel }) => !DATA_LAYER.some((dir) => rel.startsWith(dir)))
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

  /**
   * Lints a snippet as if it lived at `asPath`. Returns the report, or '' when
   * ESLint found nothing to complain about.
   */
  function lintSnippet(asPath: string, source: string): string {
    const eslintBin = join(SRC, '..', 'node_modules', 'eslint', 'bin', 'eslint.js');
    try {
      execFileSync(
        process.execPath,
        [eslintBin, '--stdin', '--stdin-filename', asPath],
        { input: source, cwd: join(SRC, '..'), encoding: 'utf8' },
      );
      return '';
    } catch (error: unknown) {
      return String((error as { stdout?: string }).stdout ?? '');
    }
  }

  /**
   * The rules above assert the tree is clean TODAY. These assert the rule that
   * keeps it clean tomorrow is still working — a boundary that has silently
   * stopped enforcing is worse than none, because everyone assumes it holds.
   *
   * `src/features/` deliberately does not exist. An allow-list keyed on the
   * directories that happen to exist now would let the next one straight
   * through, so default-deny is tested where it actually earns its keep.
   */
  it.each([
    ['src/app/probe.tsx', "import { Button } from '@expo/ui/swift-ui';"],
    ['src/features/probe.tsx', "import { Button } from '@expo/ui/swift-ui';"],
    ['src/domain/probe.ts', "import { init } from 'echarts';"],
    ['src/features/metrics/probe.ts', "import { q } from '../../services/api/prometheus-management/prometheus';"],
    ['src/stores/probe.ts', "import { Chart } from 'victory-native';"],
  ])('rejects a forbidden import at %s', (path, statement) => {
    const report = lintSnippet(path, `${statement}\nexport default 1;\n`);

    expect(report).toContain('no-restricted-imports');
  }, 60_000);

  it('still allows the adapter directories their own imports', () => {
    // The mirror image: a boundary that rejects everything is equally broken,
    // and would be caught here rather than by a confusing failure in the
    // surface layer.
    expect(
      lintSnippet(
        'src/components/ui/probe.tsx',
        "import { Button } from '@expo/ui/swift-ui';\nexport default Button;\n",
      ),
    ).not.toContain('no-restricted-imports');

    expect(
      lintSnippet(
        'src/services/api/probe.ts',
        "import { q } from './prometheus-management/prometheus';\nexport default q;\n",
      ),
    ).not.toContain('no-restricted-imports');
  }, 60_000);
});
