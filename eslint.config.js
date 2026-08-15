// Horcery rewrite — lint configuration.
//
// Beyond ordinary correctness rules, this file ENFORCES the architectural
// boundaries agreed in the requirements doc (§4, §4d, §6a). They are here rather
// than in review comments because an agentically-built app has no standing human
// reviewer to catch a drifting import.
//
// Three boundaries:
//   1. Platform-specific @expo/ui may only be imported inside the surface layer.
//   2. Chart renderer libraries may only be imported inside the chart adapter.
//   3. Screens and feature components may not reach for Prometheus/PromQL directly.
//
// Each has a narrow, named exception directory. Widening one is a decision to be
// logged in the requirements doc, not a quiet edit here.

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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

/** Raw metrics access — allowed in the data layer, not in screens/components. */
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
      'Screens and components must not author PromQL or call Prometheus directly. Consume a typed observation/chart model via a hook — see requirements §6a.',
  },
];

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

  // ---- Boundaries: screens (routes) --------------------------------------
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...PLATFORM_UI, ...CHART_RENDERERS, ...METRICS_INTERNALS] },
      ],
    },
  },

  // ---- Boundaries: feature components ------------------------------------
  // Applies to all of src/components; the exception blocks below re-open the
  // surface layer and the chart adapter for their own concerns.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...PLATFORM_UI, ...CHART_RENDERERS, ...METRICS_INTERNALS] },
      ],
    },
  },

  // ---- Boundaries: hooks, stores, constants ------------------------------
  {
    files: ['src/hooks/**/*.{ts,tsx}', 'src/stores/**/*.{ts,tsx}', 'src/constants/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...PLATFORM_UI, ...CHART_RENDERERS] },
      ],
    },
  },

  // ---- EXCEPTION: the surface layer --------------------------------------
  // Platform-specific UI is this directory's entire purpose. Chart renderers
  // and metrics access remain forbidden.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...CHART_RENDERERS, ...METRICS_INTERNALS] },
      ],
    },
  },

  // ---- EXCEPTION: the chart adapter --------------------------------------
  // Reserved for the renderer chosen by the §6a spike. Does not exist yet;
  // declared now so the boundary is in place before the first chart lands.
  // Platform-specific UI stays forbidden — charts route through the surface layer.
  {
    files: ['src/components/charts/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...PLATFORM_UI, ...METRICS_INTERNALS] },
      ],
    },
  },

  // ---- EXCEPTION: the data layer -----------------------------------------
  // src/services is where Prometheus access legitimately lives. It must never
  // import UI or renderers.
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/config/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...PLATFORM_UI, ...CHART_RENDERERS] },
      ],
    },
  },

  // ---- Tests -------------------------------------------------------------
  // The boundary test deliberately references forbidden module names as data.
  // Flat config does not honour `/* eslint-env jest */`, so test globals are
  // declared here instead.
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
      },
    },
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // ========================================================================
  // BASELINE — known violations that predate these rules.
  //
  // These are NOT approvals. Each entry is debt with a named owner-task. The
  // rules above are errors for all new and changed code; this block only stops
  // pre-existing violations from blocking CI on day one.
  //
  // THIS LIST MUST ONLY EVER SHRINK. Adding a file here requires the same
  // logged decision as widening a boundary. Delete each entry as its task lands.
  // ========================================================================

  // (Requirements §6b finding #1 — the three For You components that imported
  // @expo/ui/swift-ui directly — was CLEARED on 2026-08-15 by the universal
  // adapter task. They are now src/components/ui/{menu,segmented-control,icon},
  // which fork by platform inside the surface layer. No exemption remains;
  // the boundary is enforced with no holes. Keep it that way.)

  // Pre-existing React Compiler findings. Genuine correctness rules, but the
  // fixes change animation and hydration behaviour, which is out of scope for a
  // guardrails change on a HOLD SCOPE branch. Scheduled with the hardening slice.
  //   menu.tsx            — Animated.Value read from a ref during render
  //   use-color-scheme.web.ts — setState inside an effect (web hydration shim)
  {
    files: ['src/app/menu.tsx', 'src/hooks/use-color-scheme.web.ts'],
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
