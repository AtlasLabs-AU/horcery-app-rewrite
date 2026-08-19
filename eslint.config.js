// Horcery rewrite — lint configuration.
//
// Beyond ordinary correctness rules, this file ENFORCES the architectural
// boundaries agreed in the requirements doc (§4, §4d, §6a). They are here rather
// than in review comments because an agentically-built app has no standing human
// reviewer to catch a drifting import.
//
// The boundaries are DEFAULT-DENY. Every file under src/ is forbidden all three
// import groups, and named adapter directories re-open exactly one each. This
// matters more than it sounds: an allow-list keyed on `src/app` and
// `src/components` silently exempts every directory nobody thought of —
// src/features, src/domain, src/widgets — which is precisely where the next
// screen will be written.
//
//   1. Platform-specific @expo/ui  → re-opened only in src/components/ui
//   2. Chart renderer libraries    → re-opened only in src/components/charts
//   3. Prometheus / PromQL access  → re-opened only in src/services, src/config
//
// Widening one is a decision to be logged in the requirements doc, not a quiet
// edit here. Pre-existing violations live in eslint.baseline.js, which is
// asserted by a test and can only shrink.

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const { baselineBlocks } = require('./eslint.baseline');

/** Platform-specific UI — allowed ONLY in src/components/ui (the surface layer). */
const PLATFORM_UI = [
  {
    group: ['@expo/ui/swift-ui', '@expo/ui/swift-ui/**'],
    message:
      'Platform-specific SwiftUI belongs in the surface layer (src/components/ui). Screens import universal @expo/ui only — see requirements §4d.',
  },
  {
    group: ['@expo/ui/jetpack-compose', '@expo/ui/jetpack-compose/**'],
    message:
      'Platform-specific Compose belongs in the surface layer (src/components/ui). Screens import universal @expo/ui only — see requirements §4d.',
  },
];

/** Chart renderers — allowed ONLY in src/components/charts (the chart adapter). */
const CHART_RENDERERS = [
  {
    group: [
      'echarts',
      'echarts/**',
      '@wuba/react-native-echarts',
      '@wuba/react-native-echarts/**',
      'react-native-echarts-pro',
      'victory-native',
      'victory-native/**',
      '@shopify/react-native-skia',
      '@shopify/react-native-skia/**',
    ],
    message:
      'Chart renderers are confined to the chart adapter (src/components/charts). Feature code consumes the renderer-independent chart model — see requirements §6a. No renderer is chosen yet; importing one here pre-empts the spike.',
  },
];

/** Raw metrics access — allowed in the data layer only. */
const METRICS_INTERNALS = [
  {
    group: [
      '**/services/api/prometheus-management/**',
      '**/services/api/federated-prometheus-management/**',
      '@acme/services/api/prometheus-management/**',
      '@acme/services/api/federated-prometheus-management/**',
      '**/prom-utils',
      '**/prom-utils/**',
    ],
    message:
      'PromQL and direct Prometheus calls belong in the data layer (src/services). Consume a typed observation/chart model via a hook — see requirements §6a.',
  },
];

/** ESLint needs the whole `patterns` array restated wherever a rule is re-declared. */
const restrict = (...groups) => ({
  'no-restricted-imports': ['error', { patterns: groups.flat() }],
});

module.exports = defineConfig([
  expoConfig,

  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'expo-env.d.ts',
      // Throwaway spike apps with their own dependencies (see jest.config.js).
      'spikes/**',
    ],
  },

  // ---- Correctness -------------------------------------------------------
  // exhaustive-deps as an ERROR, not a warning. The current app shipped a
  // customer-visible chart bug (People In Stall, prometheus-bar-chart-widget-v3)
  // for exactly this: a missing hook dependency that lint did not fail on.
  {
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  // ---- Boundaries: DEFAULT DENY across the whole source tree -------------
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: restrict(PLATFORM_UI, CHART_RENDERERS, METRICS_INTERNALS),
  },

  // ---- RE-OPEN: the surface layer ----------------------------------------
  // Platform-specific UI is this directory's entire purpose. Chart renderers
  // and metrics access stay denied.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: restrict(CHART_RENDERERS, METRICS_INTERNALS),
  },

  // ---- RE-OPEN: the chart adapter ----------------------------------------
  // Reserved for the renderer chosen by the §6a spike. Does not exist yet;
  // declared now so the boundary is in place before the first chart lands.
  // Platform-specific UI stays denied — charts route through the surface layer.
  {
    files: ['src/components/charts/**/*.{ts,tsx}'],
    rules: restrict(PLATFORM_UI, METRICS_INTERNALS),
  },

  // ---- RE-OPEN: the data layer -------------------------------------------
  // Where Prometheus access legitimately lives. It must never import UI or
  // renderers.
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/config/**/*.{ts,tsx}'],
    rules: restrict(PLATFORM_UI, CHART_RENDERERS),
  },

  // ---- RE-OPEN: UI-thread animation --------------------------------------
  // `react-hooks/immutability` (eslint-plugin-react-hooks 7.1.1, the React
  // Compiler's rule set) does not know what a Reanimated shared value is. It
  // sees a hook return being assigned to and reports "This value cannot be
  // modified" — for `x.value = 1` in a plain callback, which is the library's
  // entire API. Verified against a four-line probe component, not inferred
  // from our own code being unusual.
  //
  // A shared value is a deliberately mutable box living on the UI thread; it
  // is not React state and the compiler's immutability model does not apply to
  // it. The rule cannot be taught otherwise here: `environment.customHooks`
  // with `valueKind: 'mutable'` parses but changes nothing.
  //
  // So the rule is off for the one directory that owns gesture-driven
  // animation, and nowhere else — the same shape as the boundaries above, and
  // for the same reason: an allowance that names its directory cannot silently
  // spread to the next screen someone writes. Everything the compiler is
  // genuinely good at (exhaustive deps, set-state-in-effect, refs in render)
  // stays on in here.
  //
  // Widening this to another directory is a decision to record, not a quiet
  // edit. Revisit when eslint-plugin-react-hooks understands Reanimated.
  {
    files: ['src/components/timeline/**/*.{ts,tsx}'],
    rules: { 'react-hooks/immutability': 'off' },
  },

  // ---- Tests -------------------------------------------------------------
  // The boundary tests reference forbidden module names as data. Flat config
  // does not honour `/* eslint-env jest */`, so test globals are declared here.
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      'jest.setup.js',
      'jest.env.js',
      'jest.config.js',
    ],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        global: 'writable',
        // Installed by jest.setup.js — see test-globals.d.ts.
        expectConsole: 'readonly',
      },
    },
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // ---- Baseline ----------------------------------------------------------
  // Known pre-existing violations, each with a reason and an owning task. Kept
  // in eslint.baseline.js and asserted by src/__tests__/lint-baseline.test.ts,
  // which fails both on a new violation and on a stale exception. Last, so it
  // overrides everything above.
  ...baselineBlocks(),
]);
