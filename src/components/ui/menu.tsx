import type { MenuProps } from '@/components/ui/menu-types';

export type { MenuAction, MenuProps } from '@/components/ui/menu-types';

/**
 * Universal `Menu` — a dropdown anchored to its trigger.
 *
 * This base file is the WEB fallback and the type surface TypeScript reads.
 * The real implementations are `menu.ios.tsx` (SwiftUI `Menu`) and
 * `menu.android.tsx` (Material 3 `DropdownMenu`); Metro picks them per
 * platform, so this body never runs on a device.
 *
 * Web is future scope (§4). It renders nothing rather than a control that
 * looks tappable and isn't — the standing rule from requirements §6b item 3.
 */
export function Menu(_props: MenuProps) {
  return null;
}
