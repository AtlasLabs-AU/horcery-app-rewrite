/**
 * Who may do what with alert rules, by member type.
 *
 * Ports the MAPPING from the shipping app's `usePermissions` (ADMIN and
 * EDITOR may create/edit; only ADMIN may delete; VIEWER, GUEST and
 * RESTRICTED may only look) — not the hook. Enforced at the alerts route
 * layout, mirrored in the UI as disabled-with-reason controls, and enforced
 * again by the backend. Architecture §8.
 *
 * Note the shipping app gates DELETE only; create/save were left open. That
 * is a defect this closes (Horcery_Manage_Alerts_Review.md §3.2).
 */

import { MemberType } from '@/config/enums/member-type';

import type { AlertPermissions } from './types';

const NONE: AlertPermissions = { view: true, create: false, edit: false, delete: false };

export function canManageAlerts(memberType: MemberType | null | undefined): AlertPermissions {
  switch (memberType) {
    case MemberType.ADMIN:
      return { view: true, create: true, edit: true, delete: true };
    case MemberType.EDITOR:
      return { view: true, create: true, edit: true, delete: false };
    case MemberType.VIEWER:
    case MemberType.GUEST:
    case MemberType.RESTRICTED:
    default:
      return NONE;
  }
}

/** The sentence shown where a control is disabled for lack of permission. */
export function permissionReason(memberType: MemberType | null | undefined): string {
  if (memberType == null) return 'Sign in to change alerts.';
  const p = canManageAlerts(memberType);
  if (p.edit) return 'Only admins can remove alerts.';
  return 'Only editors and admins can change alerts.';
}
