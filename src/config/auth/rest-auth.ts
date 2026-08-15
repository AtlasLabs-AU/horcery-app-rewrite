import * as SecureStore from 'expo-secure-store';

/**
 * Firebase authentication over REST.
 *
 * **Why this exists.** `@react-native-firebase` is a native module, so using it
 * means a development build — and Expo SDK 57 ships React Native as a
 * precompiled framework distributed through Swift Package Manager, which
 * RNFirebase refuses to link against ("SPM + static linkage is not supported").
 * Working around that costs a ~30 minute build per attempt.
 *
 * Firebase's Identity Toolkit exposes the same email/password sign-in over
 * plain HTTPS, using the same project and issuing the same ID token the API
 * already accepts. That needs no native module, so the app runs in Expo Go and
 * reloads in seconds.
 *
 * **This is a stand-in, not a destination.** It deliberately exposes the same
 * shape as the native module (`currentUser`, `getIdToken`, `onAuthStateChanged`,
 * `signInWithEmailAndPassword`, `signOut`) so that swapping back is a change to
 * one file — `src/config/firebase-rn/index.ts` — and nothing that consumes auth
 * has to change. Push notifications and Crashlytics still need the native
 * module when we get to them.
 */

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BUNDLE_ID = process.env.EXPO_PUBLIC_FIREBASE_BUNDLE_ID;
const IDENTITY_HOST = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_HOST = 'https://securetoken.googleapis.com/v1';
const REFRESH_KEY = 'horcery.auth.refreshToken';

/** Refresh this many ms before actual expiry, so requests never race it. */
const EXPIRY_MARGIN_MS = 60_000;

export interface AuthUser {
  uid: string;
  email: string | null;
  /**
   * `forceRefresh` mirrors the native SDK: it skips the local expiry check and
   * exchanges the refresh token now. Callers use it when the backend rejects a
   * token the clock said was still good.
   */
  getIdToken: (forceRefresh?: boolean) => Promise<string | undefined>;
}

type Listener = (user: AuthUser | null) => void;

interface Session {
  uid: string;
  email: string | null;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

let session: Session | null = null;
let restoring: Promise<void> | null = null;
let refreshing: Promise<string | undefined> | null = null;
const listeners = new Set<Listener>();

/**
 * True once the stored refresh token has been checked. Until then the module
 * has no answer, and reporting `null` would be reporting "signed out" — which
 * shows the sign-in screen to someone who is signed in.
 */
let bootstrapped = false;

/**
 * Incremented on every session change. An async token exchange captures this
 * before it awaits and re-checks it after, so a sign-in or sign-out that lands
 * mid-flight is never overwritten by the older request's result.
 */
let generation = 0;

function requireApiKey(): string {
  if (!API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_FIREBASE_API_KEY. Copy it from GoogleService-Info.plist ' +
        'into .env.local (see .env.example).',
    );
  }
  return API_KEY;
}

/** iOS-restricted API keys are validated against the bundle id. */
function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(BUNDLE_ID ? { 'X-Ios-Bundle-Identifier': BUNDLE_ID } : {}),
  };
}

function toUser(current: Session | null): AuthUser | null {
  if (!current) return null;
  return {
    uid: current.uid,
    email: current.email,
    getIdToken: (forceRefresh?: boolean) => getIdToken(forceRefresh),
  };
}

function emit() {
  const user = toUser(session);
  listeners.forEach((listener) => listener(user));
}

function setSession(next: Session | null) {
  session = next;
  generation += 1;
  if (next) {
    void SecureStore.setItemAsync(REFRESH_KEY, next.refreshToken);
  } else {
    void SecureStore.deleteItemAsync(REFRESH_KEY);
  }
  emit();
}

/**
 * Reads the `email` claim out of a Firebase ID token.
 *
 * The refresh endpoint returns only ids and tokens — no email — so a session
 * restored at startup has no email to carry over from a previous session in
 * memory. The ID token it returns does carry the claim, and the app needs it:
 * the user record is looked up by email. Returns null rather than throwing;
 * a session with an unreadable token is still a valid session.
 */
function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const claims = JSON.parse(atob(padded)) as { email?: unknown };
    return typeof claims.email === 'string' && claims.email
      ? claims.email
      : null;
  } catch {
    return null;
  }
}

async function exchangeRefreshToken(refreshToken: string): Promise<Session> {
  const response = await fetch(`${TOKEN_HOST}/token?key=${requireApiKey()}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status})`);
  }

  const data = (await response.json()) as {
    user_id: string;
    id_token: string;
    refresh_token: string;
    expires_in: string;
  };

  return {
    uid: data.user_id,
    email: emailFromIdToken(data.id_token) ?? session?.email ?? null,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  };
}

/**
 * Restores a session from the stored refresh token. Called once at startup so
 * the app does not ask for credentials it already has — the equivalent of the
 * native SDK's silent sign-in.
 */
export async function restoreSession(): Promise<void> {
  if (restoring) return restoring;

  restoring = (async () => {
    const startGeneration = generation;
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (refreshToken && generation === startGeneration) {
        const restored = await exchangeRefreshToken(refreshToken);
        // A password sign-in that completed while this was in flight wins.
        if (generation === startGeneration) {
          bootstrapped = true;
          setSession(restored);
          return;
        }
      }
    } catch {
      // A refresh token that no longer works means signed out, not broken.
      if (generation === startGeneration) {
        session = null;
        void SecureStore.deleteItemAsync(REFRESH_KEY);
      }
    }
    // Falls through when there was no stored token, the exchange failed, or a
    // newer session replaced this one — emit whatever the truth now is.
    bootstrapped = true;
    emit();
  })();

  return restoring;
}

export async function getIdToken(
  forceRefresh = false,
): Promise<string | undefined> {
  if (!session) return undefined;

  // The expiry check trusts the device clock. A clock running behind the
  // issuer makes an expired token look fresh, so callers that get a 401 can
  // pass `forceRefresh` to bypass this and settle it against the server.
  if (!forceRefresh && Date.now() < session.expiresAt - EXPIRY_MARGIN_MS) {
    return session.idToken;
  }

  // A screen mounts several queries at once and each asks for a token. Without
  // this, every one of them fires its own refresh and rewrites the keychain.
  if (refreshing) return refreshing;

  const startGeneration = generation;
  const expired = session;

  refreshing = (async () => {
    try {
      const refreshed = await exchangeRefreshToken(expired.refreshToken);
      if (generation !== startGeneration) {
        // Signed out, or signed in as someone else, while this was in flight.
        return session?.idToken;
      }
      setSession({ ...refreshed, email: refreshed.email ?? expired.email });
      return refreshed.idToken;
    } catch {
      if (generation === startGeneration) setSession(null);
      return undefined;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

export async function signInWithEmailAndPassword(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(
    `${IDENTITY_HOST}/accounts:signInWithPassword?key=${requireApiKey()}`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );

  const data = (await response.json()) as {
    localId?: string;
    email?: string;
    idToken?: string;
    refreshToken?: string;
    expiresIn?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.idToken) {
    // Firebase returns codes like INVALID_LOGIN_CREDENTIALS / USER_DISABLED.
    const code = data.error?.message ?? 'SIGN_IN_FAILED';
    const failure = new Error(code) as Error & { code: string };
    failure.code = code;
    throw failure;
  }

  setSession({
    uid: data.localId ?? '',
    email: data.email ?? email,
    idToken: data.idToken,
    refreshToken: data.refreshToken ?? '',
    expiresAt: Date.now() + Number(data.expiresIn ?? 3600) * 1000,
  });

  return toUser(session)!;
}

/**
 * Emails a password-reset link, the same call the native SDK makes
 * (`accounts:sendOobCode`, requestType PASSWORD_RESET). Firebase's own email
 * template and hosted reset page handle the rest — nothing to build app-side.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const response = await fetch(
    `${IDENTITY_HOST}/accounts:sendOobCode?key=${requireApiKey()}`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    },
  );

  const data = (await response.json()) as { error?: { message?: string } };
  if (!response.ok) {
    // EMAIL_NOT_FOUND is deliberately NOT surfaced to the UI as "no account" —
    // callers show the same success message either way, so the form can't be
    // used to probe which emails have accounts.
    const code = data.error?.message ?? 'RESET_FAILED';
    const failure = new Error(code) as Error & { code: string };
    failure.code = code;
    throw failure;
  }
}

export async function signOut(): Promise<void> {
  setSession(null);
}

export function onAuthStateChanged(listener: Listener): () => void {
  listeners.add(listener);
  if (bootstrapped) {
    // Report the current state immediately, matching the native SDK's behaviour.
    listener(toUser(session));
  } else {
    // Before the stored refresh token has been checked there is no state to
    // report: emitting null here would say "signed out" to a returning user and
    // flash the sign-in screen. Restoring settles first, then emits the truth.
    void restoreSession();
  }
  return () => listeners.delete(listener);
}

export function getCurrentUser(): AuthUser | null {
  return toUser(session);
}
