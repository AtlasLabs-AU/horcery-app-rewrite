import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BASELINE } = require('../../eslint.baseline');

/**
 * The lint baseline, held against reality.
 *
 * `npm run lint` runs with `--max-warnings=0`, so the build is only honest if
 * the list of tolerated pre-existing violations in `eslint.baseline.js` is
 * exactly the set of violations that actually remain. This test lints the tree
 * with the exceptions REMOVED and compares.
 *
 * It therefore fails in both directions, which is the point:
 *
 *   * a NEW violation cannot be smuggled in by adding an entry to the baseline
 *     — the file shows up here and in the diff;
 *   * a FIXED violation cannot leave its exception behind, quietly disabling a
 *     rule for a file that no longer needs it.
 *
 * The alternative — a hand-maintained list nobody re-checks — decays into a set
 * of permanently disabled rules within a few slices.
 */

const ROOT = join(__dirname, '..', '..');

interface LintResult {
  filePath: string;
  messages: { ruleId: string | null; severity: number; line: number }[];
}

/**
 * Lints the source tree with the baseline exceptions switched off.
 *
 * Run as a subprocess rather than through ESLint's Node API: the API resolves
 * file globs with a dynamic `import()`, which Jest's VM rejects unless the whole
 * suite runs with `--experimental-vm-modules`. Not worth reconfiguring the
 * runner over.
 */
function lintWithoutBaseline(): LintResult[] {
  const eslintBin = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

  try {
    execFileSync(process.execPath, [eslintBin, 'src', '--format', 'json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, HORCERY_IGNORE_LINT_BASELINE: '1' },
      maxBuffer: 32 * 1024 * 1024,
    });
    return [];
  } catch (error) {
    // ESLint exits non-zero whenever anything is reported; the JSON report is
    // still on stdout. A crash (bad config) produces no parseable JSON, and
    // rethrowing here is the correct outcome — the guard is broken.
    const stdout = String((error as { stdout?: string }).stdout ?? '');
    if (!stdout.trim().startsWith('[')) throw error;
    return JSON.parse(stdout) as LintResult[];
  }
}

describe('lint baseline', () => {
  it('names every file that still violates a rule — no more, no fewer', () => {
    const results = lintWithoutBaseline();

    const offenders = results
      .filter((result) => result.messages.length > 0)
      .map((result) => relative(ROOT, result.filePath))
      .sort();

    const declared = [...new Set(BASELINE.flatMap((e: { files: string[] }) => e.files))].sort();

    // A failure here reads directly:
    //   extra entries on the LEFT  = a new violation that must be fixed;
    //   extra entries on the RIGHT = a stale exception that must be deleted.
    expect(offenders).toEqual(declared);
  }, 120_000);

  it('documents every exception with a reason and an owning task', () => {
    for (const entry of BASELINE) {
      expect(entry.id).toBeTruthy();
      expect(entry.rules.length).toBeGreaterThan(0);
      // Not a rubber stamp: an exception without a stated reason and a task
      // that removes it is just a disabled rule.
      expect(entry.reason.length).toBeGreaterThan(40);
      expect(entry.owner.length).toBeGreaterThan(20);
    }
  });

  it('scopes exceptions to exact files, never to a directory', () => {
    const globby = BASELINE.flatMap((e: { files: string[] }) => e.files).filter((f: string) =>
      f.includes('*'),
    );

    // `src/components/**` would exempt every file added there later, including
    // ones nobody has written yet.
    expect(globby).toEqual([]);
  });
});
