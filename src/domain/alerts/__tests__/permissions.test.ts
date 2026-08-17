import { MemberType } from '@/config/enums/member-type';

import { canManageAlerts, permissionReason } from '../permissions';

describe('canManageAlerts — the shipping app mapping, now applied to create too', () => {
  it.each([
    [MemberType.ADMIN, { view: true, create: true, edit: true, delete: true }],
    [MemberType.EDITOR, { view: true, create: true, edit: true, delete: false }],
    [MemberType.VIEWER, { view: true, create: false, edit: false, delete: false }],
    [MemberType.GUEST, { view: true, create: false, edit: false, delete: false }],
    [MemberType.RESTRICTED, { view: true, create: false, edit: false, delete: false }],
    [null, { view: true, create: false, edit: false, delete: false }],
    [undefined, { view: true, create: false, edit: false, delete: false }],
  ])('%s', (memberType, expected) => {
    expect(canManageAlerts(memberType as MemberType | null | undefined)).toEqual(expected);
  });
});

describe('permissionReason — the sentence on a disabled control', () => {
  it('explains, per role, why', () => {
    expect(permissionReason(MemberType.VIEWER)).toBe('Only editors and admins can change alerts.');
    expect(permissionReason(MemberType.EDITOR)).toBe('Only admins can remove alerts.');
    expect(permissionReason(null)).toBe('Sign in to change alerts.');
  });
});
