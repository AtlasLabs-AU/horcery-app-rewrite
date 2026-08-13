/**
 * The auth handle the API layer uses.
 *
 * In the current app this is the native Firebase auth instance:
 *
 *   export const authRn = getAuth(getApp());
 *
 * Here it is backed by `rest-auth`, which speaks to the same Firebase project
 * over HTTPS instead of through a native module — see that file for why. The
 * shape is deliberately identical to what `GenericService` needs
 * (`currentUser?.getIdToken()`), so nothing downstream knows the difference.
 *
 * **To go back to the native module**, install `@react-native-firebase/auth`,
 * make a development build, and replace this file's body with the two lines
 * above. Nothing else changes.
 */
import {
  getCurrentUser,
  onAuthStateChanged as onRestAuthStateChanged,
  sendPasswordResetEmail as restSendPasswordResetEmail,
  signInWithEmailAndPassword as restSignIn,
  signOut as restSignOut,
  restoreSession,
  type AuthUser,
} from '../auth/rest-auth';

export const authRn = {
  get currentUser(): AuthUser | null {
    return getCurrentUser();
  },
  signOut: restSignOut,
};

export {
  onRestAuthStateChanged as onAuthStateChanged,
  restSendPasswordResetEmail as sendPasswordResetEmail,
  restSignIn as signInWithEmailAndPassword,
  restoreSession,
};
export type { AuthUser };
