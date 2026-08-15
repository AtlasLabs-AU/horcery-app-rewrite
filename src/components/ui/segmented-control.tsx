import type { SegmentedControlProps } from '@/components/ui/segmented-control-types';

export type {
  SegmentedOption,
  SegmentedControlProps,
} from '@/components/ui/segmented-control-types';

/**
 * Universal `SegmentedControl` — pick one of a short set of options.
 *
 * This base file is the WEB fallback and the type surface TypeScript reads.
 * The real implementations are `segmented-control.ios.tsx` (SwiftUI `Picker`,
 * segmented style) and `segmented-control.android.tsx` (Material 3
 * `SingleChoiceSegmentedButtonRow`); Metro picks per platform, so this body
 * never runs on a device.
 *
 * Web is future scope (§4); it renders nothing rather than a control that
 * looks operable and isn't (requirements §6b item 3).
 */
export function SegmentedControl<T extends string>(_props: SegmentedControlProps<T>) {
  return null;
}
