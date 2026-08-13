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
  getIdToken: () => Promise<string | undefined>;
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
const listeners = new Set<Listener>();

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
    getIdToken: () => getIdToken(),
  };
}

function emit() {
  const user = toUser(session);
  listeners.forEach((listener) => listener(user));
}

function setSession(next: Session | null) {
  session = next;
  if (next) {
    void SecureStore.setItemAsync(REFRESH_KEY, next.refreshToken);
  } else {
    void SecureStore.deleteItemAsync(REFRESH_KEY);
  }
  emit();
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
    email: session?.email ?? null,
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
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) {
        emit();
        return;
      }
      setSession(await exchangeRefreshToken(refreshToken));
    } catch {
      // A refresh token that no longer works means signed out, not broken.
      setSession(null);
    }
  })();

  return restoring;
}

export async function getIdToken(): Promise<string | undefined> {
  if (!session) return undefined;

  if (Date.now() < session.expiresAt - EXPIRY_MARGIN_MS) {
    return session.idToken;
  }

  try {
    const refreshed = await exchangeRefreshToken(session.refreshToken);
    session = { ...refreshed, email: session.email };
    void SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
    return session.idToken;
  } catch {
    setSession(null);
    return undefined;
  }
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

export async function signOut(): Promise<void> {
  setSession(null);
}

export function onAuthStateChanged(listener: Listener): () => void {
  listeners.add(listener);
  // Report the current state immediately, matching the native SDK's behaviour.
  listener(toUser(session));
  return () => listeners.delete(listener);
}

export function getCurrentUser(): AuthUser | null {
  return toUser(session);
}
