import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import type { TargetKind } from '@/hooks/alerts/targets-selection-store';

export interface TargetRow {
  id: string;
  name: string;
  subtitle?: string;
  imageUri?: string;
  blurhash?: string;
}

/**
 * The pickable horses / stalls / members of the organization — every page
 * (`listComplete`), so a large barn is not silently truncated. Only the kind
 * the picker is open for is fetched.
 */
export function useTargets(kind: TargetKind) {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID;

  const members = useQuery({
    ...queries.member.listComplete(
      { ordering: 'first_name', include: 'user', deleted_at__isnull: true, page_size: 50 },
      [{ key: 'organization', value: organizationID ?? '' }],
    ),
    enabled: enabled && kind === 'members',
  });
  const horses = useQuery({
    ...queries.animal.listComplete({
      ordering: 'animal_name',
      deleted_at__isnull: true,
      organization_id: organizationID ?? '',
      page_size: 50,
    }),
    enabled: enabled && kind === 'horses',
  });
  const stalls = useQuery({
    ...queries.stall.listComplete({
      ordering: 'name',
      deleted_at__isnull: true,
      organization_id: organizationID ?? '',
      page_size: 50,
    }),
    enabled: enabled && kind === 'stalls',
  });

  const active = kind === 'members' ? members : kind === 'horses' ? horses : stalls;

  const rows = useMemo<TargetRow[]>(() => {
    if (kind === 'members') {
      return ((members.data ?? []) as {
        id: string;
        first_name?: string;
        last_name?: string;
        profile_image?: string | null;
        user?: { email?: string };
      }[]).map((m) => {
        const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || (m.user?.email ?? 'Member');
        return { id: m.id, name, subtitle: m.user?.email, imageUri: m.profile_image ?? undefined };
      });
    }
    if (kind === 'horses') {
      return ((horses.data ?? []) as {
        id: string;
        animal_name?: string;
        animal_image?: { small?: string; medium?: string } | null;
        animal_blur_hash?: string | null;
      }[]).map((h) => ({
        id: h.id,
        name: h.animal_name ?? 'Horse',
        imageUri: h.animal_image?.small ?? h.animal_image?.medium ?? undefined,
        blurhash: h.animal_blur_hash ?? undefined,
      }));
    }
    return ((stalls.data ?? []) as { id: string; name?: string; stall_blur_hash?: string | null }[]).map(
      (s) => ({ id: s.id, name: s.name ?? 'Stall', blurhash: s.stall_blur_hash ?? undefined }),
    );
  }, [kind, members.data, horses.data, stalls.data]);

  return {
    rows,
    isLoading: enabled && active.isLoading,
    isError: active.isError,
    refetch: active.refetch,
  };
}
