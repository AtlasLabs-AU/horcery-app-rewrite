import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queries } from '@acme/services';
import type { MemberType } from '@/config/enums/member-type';
import { useAuthStore } from '@acme/stores/authorization-states';

/**
 * Keeps `memberType` and `memberId` in the auth store in step with the
 * signed-in user's membership of the CURRENT organization.
 *
 * The shipping app does this in its tabs layout
 * (`member.list(user=<uid>, organization=<org>)` → `member_type`, `id`);
 * the rewrite never had it, so every permission check read `null` and every
 * user was a viewer (found on device building alerts A2, 2026-08-17). It
 * lives once, at the session gate, so Horses/Alerts/anything role-gated
 * reads the same answer. On org switch it refetches and re-sets.
 */
export function useMembershipSync() {
  const uid = useAuthStore((s) => s.uid);
  const organizationID = useAuthStore((s) => s.organizationID);
  const setMemberType = useAuthStore((s) => s.setMemberType);
  const setMemberId = useAuthStore((s) => s.setMemberId);

  const query = useQuery({
    ...queries.member.list(undefined, [
      { key: 'user', value: uid ?? '' },
      { key: 'organization', value: organizationID ?? '' },
      { key: 'deleted_at__isnull', value: 'true' },
    ]),
    enabled: !!uid && !!organizationID,
  });

  useEffect(() => {
    if (!organizationID) {
      setMemberType(null);
      setMemberId(null);
      return;
    }
    const member = query.data?.data?.[0];
    if (!member) return;
    setMemberType((member.member_type as MemberType | undefined) ?? null);
    setMemberId(member.id ?? null);
  }, [query.data, organizationID, setMemberType, setMemberId]);
}
