/**
 * Feature Flag Store
 * Zustand store for managing feature flag visibility across the app
 *
 * ## How It Works
 *
 * This is a **push-based system** - the store doesn't automatically detect changes.
 * External components must explicitly notify the store when stall metadata changes.
 *
 * ### Update Flow:
 * 1. External component watches for stall changes (typically in a layout/screen)
 * 2. Component calls `setStallContext(stall)` when stall changes
 * 3. Store extracts AppMetaData from stall and re-evaluates all flags
 * 4. Components using flag hooks automatically re-render
 *
 * ### Example Usage:
 * ```tsx
 * function AnimalDetailLayout() {
 *   const { stall } = useAnimalDetailStore();
 *   const setStallContext = useSetStallContext();
 *
 *   // Update feature flags whenever stall data changes
 *   useEffect(() => {
 *     setStallContext(stall); // Just pass the stall, store extracts metadata
 *   }, [stall, setStallContext]);
 *
 *   return <AnimalSummaryScreen />;
 * }
 *
 * function AnimalSummaryScreen() {
 *   // These hooks will automatically re-render when flags change
 *   const trends = useTrendFlags();
 *
 *   return (
 *     <>
 *       {trends.activenessHourly && <ActivenessChart />}
 *       {trends.rollingDaily && <RollingChart />}
 *     </>
 *   );
 * }
 * ```
 *
 * This design keeps the feature flag store decoupled from other stores
 * and gives you control over when flags are re-evaluated.
 */

import { create } from 'zustand';

import type { FypWidgetPreferences } from '@acme/config/constants/fyp-widget-options';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { getFypWidgetPreferences } from '@acme/config/constants/fyp-widget-options';
import { getRemoteBoolean } from '@acme/config/firebase-remote-config';

export interface FeatureFlags {
  prom: {
    stallOccupancy: boolean;
    humanInStall: boolean;
    humanNearStall: boolean;
    lyingDown: boolean;
    activeness: boolean;
    last24Hours: boolean;
    humanDetectedInSpace: boolean;
  };
  trends: {
    activenessHourly: boolean;
    activenessDaily: boolean;
    rollingHourly: boolean;
    rollingDaily: boolean;
    humanPresence: boolean;
    humanInteraction: boolean;
    urination: boolean;
    defecation: boolean;
  };
  environment: {
    climate: boolean;
    ambient: boolean;
  };
  intake: {
    enabled: boolean;
    waterEnabled: boolean;
    feedEnabled: boolean;
    animalWaterEnabled: boolean;
    animalFeedEnabled: boolean;
    stallWaterEnabled: boolean;
    stallFeedEnabled: boolean;
    waterConsumption: boolean;
    waterRefills: boolean;
    feedConsumption: boolean;
    feedRefills: boolean;
  };
  ui: {
    showPassportCard: boolean;
    showFeedbackCard: boolean;
    showAnimalSummaryWidget: boolean;
  };
  stats: {
    activeness: boolean;
  };
  fyp: {
    showSnapshots: boolean;
    showReview: boolean;
    showBehaviorTracker: boolean;
    showWaterIntake: boolean;
    showFeedIntake: boolean;
    showOrganizationDetails: boolean;
  };
}

export type FlagKey =
  | 'prom.stallOccupancy'
  | 'prom.humanInStall'
  | 'prom.humanNearStall'
  | 'prom.lyingDown'
  | 'prom.activeness'
  | 'prom.last24Hours'
  | 'prom.humanDetectedInSpace'
  | 'trends.activenessHourly'
  | 'trends.activenessDaily'
  | 'trends.rollingHourly'
  | 'trends.rollingDaily'
  | 'trends.humanPresence'
  | 'trends.humanInteraction'
  | 'trends.urination'
  | 'trends.defecation'
  | 'environment.climate'
  | 'environment.ambient'
  | 'intake.enabled'
  | 'intake.waterEnabled'
  | 'intake.feedEnabled'
  | 'intake.animalWaterEnabled'
  | 'intake.animalFeedEnabled'
  | 'intake.stallWaterEnabled'
  | 'intake.stallFeedEnabled'
  | 'intake.waterConsumption'
  | 'intake.waterRefills'
  | 'intake.feedConsumption'
  | 'intake.feedRefills'
  | 'ui.showPassportCard'
  | 'ui.showFeedbackCard'
  | 'ui.showAnimalSummaryWidget'
  | 'stats.activeness'
  | 'fyp.showSnapshots'
  | 'fyp.showReview'
  | 'fyp.showBehaviorTracker'
  | 'fyp.showWaterIntake'
  | 'fyp.showFeedIntake'
  | 'fyp.showOrganizationDetails';

export interface StallAppMetadata {
  hide_activeness?: boolean;
  hide_activeness_trend?: boolean;
  hide_rolling_trend?: boolean;
  hide_presence_trend?: boolean;
  hide_interaction_trend?: boolean;
  hide_activeness_stat?: boolean;
}

export interface FlagContext {
  stall?: IStall | null;
}

export interface FypContext {
  hasStallDevices: boolean;
  hasWaterDevices: boolean;
  hasFeedDevices: boolean;
  hasLocations: boolean;
  userPreferences?: FypWidgetPreferences | null;
}

interface FeatureFlagStore {
  flags: FeatureFlags;
  context: FlagContext;
  fypContext: FypContext;
  setContext: (context: FlagContext) => void;
  setStallContext: (stall: IStall | null) => void;
  setFypContext: (context: FypContext) => void;
  setIntakeEnabled: (enabled: boolean) => void;
  setWaterEnabled: (enabled: boolean) => void;
  setFeedEnabled: (enabled: boolean) => void;
  setAnimalWaterEnabled: (enabled: boolean) => void;
  setAnimalFeedEnabled: (enabled: boolean) => void;
  setStallWaterEnabled: (enabled: boolean) => void;
  setStallFeedEnabled: (enabled: boolean) => void;
  getFlag: (key: FlagKey) => boolean;
  refreshFlags: () => void;
}

/**
 * Helper: Merge new flags with preserved dynamic flags
 * This prevents intake and FYP flags from being reset when stall context changes
 */
function mergeWithPreservedFlags(
  newFlags: FeatureFlags,
  currentIntake: FeatureFlags['intake'],
  currentFyp: FeatureFlags['fyp'],
): FeatureFlags {
  return {
    ...newFlags,
    intake: {
      ...newFlags.intake, // Static flags (waterConsumption, waterRefills, etc.)
      // Preserve dynamic flags set by useIntakeFeatureFlag hook
      waterEnabled: currentIntake.waterEnabled,
      feedEnabled: currentIntake.feedEnabled,
      enabled: currentIntake.enabled,
      animalWaterEnabled: currentIntake.animalWaterEnabled,
      animalFeedEnabled: currentIntake.animalFeedEnabled,
      stallWaterEnabled: currentIntake.stallWaterEnabled,
      stallFeedEnabled: currentIntake.stallFeedEnabled,
    },
    fyp: currentFyp,
  };
}

/**
 * Evaluate all flags from remote config and stall metadata
 */
function evaluateFlags(context: FlagContext): FeatureFlags {
  const stallMeta = context.stall?.AppMetaData as StallAppMetadata | undefined;

  return {
    prom: {
      stallOccupancy: getRemoteBoolean('HIDE_STALL_OCCUPANCY') !== true,
      humanInStall: getRemoteBoolean('HIDE_HUMAN_IN_STALL') !== true,
      humanNearStall: getRemoteBoolean('HIDE_HUMAN_NEAR_STALL') !== true,
      lyingDown: getRemoteBoolean('HIDE_LYING_DOWN') !== true,
      activeness: stallMeta?.hide_activeness !== true,
      last24Hours: getRemoteBoolean('HIDE_LAST_24_HOURS') !== true,
      humanDetectedInSpace:
        getRemoteBoolean('HIDE_HUMAN_DETECTED_IN_SPACE') !== true,
    },
    trends: {
      // Global flag + stall-specific override
      activenessHourly:
        getRemoteBoolean('HIDE_TRENDS_ACTIVENESS') !== true ||
        stallMeta?.hide_activeness_trend !== true,
      activenessDaily:
        getRemoteBoolean('HIDE_TRENDS_ACTIVENESS') !== true ||
        stallMeta?.hide_activeness_trend !== true,
      rollingHourly:
        getRemoteBoolean('HIDE_TRENDS_ROLLING') !== true ||
        stallMeta?.hide_rolling_trend !== true,
      rollingDaily:
        getRemoteBoolean('HIDE_TRENDS_ROLLING') !== true ||
        stallMeta?.hide_rolling_trend !== true,
      humanPresence: stallMeta?.hide_presence_trend !== true,
      humanInteraction: stallMeta?.hide_interaction_trend !== true,
      urination: true,
      defecation: true,
    },
    environment: {
      climate: getRemoteBoolean('HIDE_ENVIRONMENT_CLIMATE') !== true,
      ambient: getRemoteBoolean('HIDE_ENVIRONMENT_AMBIENT') !== true,
    },
    intake: {
      enabled: false, // Set by component based on user check
      waterEnabled: false,
      feedEnabled: false,
      animalWaterEnabled: false,
      animalFeedEnabled: false,
      stallWaterEnabled: false,
      stallFeedEnabled: false,
      waterConsumption: true,
      waterRefills: true,
      feedConsumption: true,
      feedRefills: true,
    },
    ui: {
      showPassportCard: true,
      showFeedbackCard: true,
      showAnimalSummaryWidget: true,
    },
    stats: {
      activeness: stallMeta?.hide_activeness_stat !== true,
    },
    fyp: {
      showSnapshots: true,
      showReview: true,
      showBehaviorTracker: true,
      showWaterIntake: false,
      showFeedIntake: false,
      showOrganizationDetails: true,
    },
  };
}

function getFlagByKey(flags: FeatureFlags, key: FlagKey): boolean {
  const [category, flagName] = key.split('.') as [keyof FeatureFlags, string];
  const categoryFlags = flags[category] as Record<string, boolean>;
  return categoryFlags[flagName] ?? false;
}

function evaluateFypFlags(context: FypContext): FeatureFlags['fyp'] {
  const { hasWaterDevices, hasFeedDevices, userPreferences } = context;
  const prefs = getFypWidgetPreferences(userPreferences);

  return {
    showSnapshots: prefs.showSnapshots,
    showReview: prefs.showReview,
    showBehaviorTracker: prefs.showBehaviorTracker,
    showWaterIntake: hasWaterDevices && prefs.showWaterIntake,
    showFeedIntake: hasFeedDevices && prefs.showFeedIntake,
    showOrganizationDetails: prefs.showOrganizationDetails,
  };
}

const DEFAULT_FYP_CONTEXT: FypContext = {
  hasStallDevices: false,
  hasWaterDevices: false,
  hasFeedDevices: false,
  hasLocations: false,
  userPreferences: null,
};

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: evaluateFlags({}),
  context: {},
  fypContext: DEFAULT_FYP_CONTEXT,

  setContext: (context: FlagContext) => {
    set((state) => ({
      context,
      flags: mergeWithPreservedFlags(
        evaluateFlags(context),
        state.flags.intake,
        state.flags.fyp,
      ),
    }));
  },

  setStallContext: (stall: IStall | null) => {
    const context = { stall };
    set((state) => ({
      context,
      flags: mergeWithPreservedFlags(
        evaluateFlags(context),
        state.flags.intake,
        state.flags.fyp,
      ),
    }));
  },

  setFypContext: (fypContext: FypContext) => {
    set((state) => ({
      fypContext,
      flags: {
        ...state.flags,
        fyp: evaluateFypFlags(fypContext),
      },
    }));
  },

  setIntakeEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          enabled,
        },
      },
    }));
  },

  setWaterEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          waterEnabled: enabled,
        },
      },
    }));
  },

  setFeedEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          feedEnabled: enabled,
        },
      },
    }));
  },

  setAnimalWaterEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          animalWaterEnabled: enabled,
        },
      },
    }));
  },

  setAnimalFeedEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          animalFeedEnabled: enabled,
        },
      },
    }));
  },

  setStallWaterEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          stallWaterEnabled: enabled,
        },
      },
    }));
  },

  setStallFeedEnabled: (enabled: boolean) => {
    set((state) => ({
      flags: {
        ...state.flags,
        intake: {
          ...state.flags.intake,
          stallFeedEnabled: enabled,
        },
      },
    }));
  },

  getFlag: (key: FlagKey) => {
    return getFlagByKey(get().flags, key);
  },

  refreshFlags: () => {
    set((state) => ({
      flags: mergeWithPreservedFlags(
        evaluateFlags(state.context),
        state.flags.intake,
        state.flags.fyp,
      ),
    }));
  },
}));

// ============================================================================
// HOOKS - Convenient selectors for components
// ============================================================================

/**
 * Check if a specific flag is enabled
 *
 * @example
 * const isVisible = useFlag('prom.stallOccupancy');
 * if (isVisible) return <Chart />;
 */
export function useFlag(key: FlagKey): boolean {
  return useFeatureFlagStore((state) => {
    const [category, flagName] = key.split('.') as [keyof FeatureFlags, string];
    const categoryFlags = state.flags[category] as Record<string, boolean>;
    return categoryFlags[flagName] ?? false;
  });
}

export function useFypFlags(): FeatureFlags['fyp'] {
  return useFeatureFlagStore((state) => state.flags.fyp);
}

export function useSetFypContext(): (context: FypContext) => void {
  return useFeatureFlagStore((state) => state.setFypContext);
}
