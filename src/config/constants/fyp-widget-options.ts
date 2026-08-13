export const WIDGET_OPTIONS = [
  { id: 'showOrganizationDetails', label: 'Organization Details' },
  { id: 'showSnapshots', label: 'Snapshots' },
  { id: 'showReview', label: 'Review' },
  { id: 'showBehaviorTracker', label: 'Behavior Tracker' },
  { id: 'showWaterIntake', label: 'Water Intake' },
  { id: 'showFeedIntake', label: 'Feed Intake' },
] as const;

export const TOP_LEVEL_WIDGET_OPTIONS = WIDGET_OPTIONS;

export type FypWidgetId = (typeof WIDGET_OPTIONS)[number]['id'];

export type FypWidgetPreferences = Record<FypWidgetId, boolean>;

const DEFAULT_FYP_WIDGET_PREFERENCES: FypWidgetPreferences = {
  showOrganizationDetails: true,
  showSnapshots: true,
  showReview: true,
  showBehaviorTracker: true,
  showWaterIntake: true,
  showFeedIntake: true,
};

export const getFypWidgetPreferences = (
  preferences?: Partial<FypWidgetPreferences> | null,
): FypWidgetPreferences => {
  return {
    ...DEFAULT_FYP_WIDGET_PREFERENCES,
    ...(preferences ?? {}),
  };
};
