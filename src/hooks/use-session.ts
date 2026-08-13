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
  const { setUser, setUid, setUserPreferences, setOrganization } =
    useAuthStore();

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

  useEffect(() => {
    const organization = organizationData?.data?.[0];
    if (organization?.id) {
      setOrganization(organization.id, organization.name ?? null);
    }
  }, [organizationData, setOrganization]);

  return {
    status,
    email,
    organization: organizationData?.data?.[0],
  };
}
