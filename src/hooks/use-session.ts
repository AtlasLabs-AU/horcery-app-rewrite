import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  onAuthStateChanged,
  restoreSession,
} from '@acme/config/firebase-rn';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

/**
 * Establishes the signed-in session: Firebase auth state, then the user record
 * and the organization the app should show.
 *
 * Ported from the current app's `useUserAndOrganizationData`
 * (packages/widgets/src/login-form/index.tsx) with one deliberate omission —
 * that hook PATCHes default preferences (unit type, timezone) back to the user
 * when they are missing. This phase is read-only against the production API, so
 * the write is dropped; missing preferences fall back locally instead. It
 * returns when the rewrite has a backend it is allowed to write to.
 */
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  // Field selectors, not the whole store: this hook is mounted at the
  // navigation root, so subscribing to every field re-renders the root shell on
  // every auth write. Zustand keeps action references stable.
  const setUser = useAuthStore((s) => s.setUser);
  const setUid = useAuthStore((s) => s.setUid);
  const setUserPreferences = useAuthStore((s) => s.setUserPreferences);
  const setOrganization = useAuthStore((s) => s.setOrganization);
  const organizationID = useAuthStore((s) => s.organizationID);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setEmail(user?.email ?? null);
      setStatus(user ? 'signed-in' : 'signed-out');
    });
    // Silent sign-in from the stored refresh token, so a returning user is not
    // asked for credentials the app already holds.
    void restoreSession();
    return unsubscribe;
  }, []);

  const signedIn = status === 'signed-in' && !!email;

  const { data: userData, isSuccess: userSuccess } = useQuery({
    ...queries.user.list(undefined, [{ key: 'email', value: email ?? '' }]),
    enabled: signedIn,
  });

  const { data: organizationData } = useQuery({
    ...queries.organization.list({ ordering: '-created_at' }),
    enabled: signedIn && userSuccess,
  });

  useEffect(() => {
    if (!userSuccess) return;
    const user = userData?.data?.[0];
    if (!user?.uid) return;

    setUserPreferences(user.UserMetaData ?? null);
    setUid(user.uid);
    setUser(user);
  }, [userSuccess, userData, setUid, setUser, setUserPreferences]);

  /**
   * Seeds a default organization, and only seeds.
   *
   * The organization the user picks in the menu is written to this same store
   * field, and this list is one shared query cache entry — so an unconditional
   * `setOrganization(data[0])` here overwrites that choice on every sign-in and
   * on any refetch that changes the payload. Seed when nothing is chosen, or
   * when the chosen organization is no longer one the user belongs to (a stale
   * value left by a previous account on this device); otherwise leave it alone.
   */
  useEffect(() => {
    const list = organizationData?.data;
    if (!list?.length) return;
    if (organizationID && list.some((org) => org.id === organizationID)) return;

    const fallback = list[0];
    if (fallback?.id) {
      setOrganization(fallback.id, fallback.name ?? null);
    }
  }, [organizationData, organizationID, setOrganization]);

  const organizations = organizationData?.data;

  return {
    status,
    email,
    organization:
      organizations?.find((org) => org.id === organizationID) ??
      organizations?.[0],
  };
}
