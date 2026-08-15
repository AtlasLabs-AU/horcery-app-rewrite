import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from '@acme/config/firebase-rn';
import { PREVIEWS } from '@/config/previews';
import { PrimaryButton } from '@/components/auth/primary-button';
import { TextField } from '@/components/auth/text-field';
import { SymbolView } from 'expo-symbols';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

type Step =
  | 'landing'
  | 'sign-in'
  | 'forgot'
  | 'code'
  | 'new-password'
  | 'done'
  | 'link-sent';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RESEND_COOLDOWN_S = 30;
const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

/**
 * The signed-out experience, per Inakshi's 2026-08-14 direction: landing with
 * Apple/Google entry points, email sign-in, and a 6-digit-code password reset
 * that never leaves the app.
 *
 * FRONT-END PREVIEW boundaries (each says so at its call site):
 * - Apple/Google buttons explain themselves and stop — real wiring needs
 *   native builds plus backend acceptance of those identities.
 * - The reset code flow is visual: no email is sent and any 6-digit code
 *   advances. The real version needs a small backend piece (Firebase alone
 *   cannot issue codes) — flagged in requirements §7.
 * Email+password sign-in is fully real.
 */
export function AuthFlow() {
  const [step, setStep] = useState<Step>('landing');
  const [email, setEmail] = useState('');

  switch (step) {
    case 'landing':
      return <Landing onSignIn={() => setStep('sign-in')} />;
    case 'sign-in':
      return (
        <SignIn
          email={email}
          onChangeEmail={setEmail}
          onBack={() => setStep('landing')}
          onForgot={() => setStep('forgot')}
        />
      );
    case 'forgot':
      return (
        <Forgot
          email={email}
          onChangeEmail={setEmail}
          onBack={() => setStep('sign-in')}
          onSent={() => setStep(PREVIEWS.passwordResetCodeFlow ? 'code' : 'link-sent')}
        />
      );
    case 'link-sent':
      return <LinkSent email={email} onSignIn={() => setStep('sign-in')} />;
    case 'code':
      return (
        <CodeEntry
          email={email}
          onBack={() => setStep('forgot')}
          onVerified={() => setStep('new-password')}
        />
      );
    case 'new-password':
      return <NewPassword onDone={() => setStep('done')} />;
    case 'done':
      return <Done onSignIn={() => setStep('sign-in')} />;
  }
}

/** Shared page scaffold: canvas background, safe area, keyboard handling. */
function AuthPage({
  children,
  onBack,
  title,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  title?: string;
}) {
  const { colors } = useTokens();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page}>
        <KeyboardAvoidingView
          style={styles.page}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {onBack ? (
            <View style={styles.navRow}>
              <Pressable
                onPress={onBack}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                testID="auth-back-button"
                style={styles.backButton}>
                <Icon name="back" size={20} color={colors.foreground} />
              </Pressable>
              {title ? (
                <Text style={[type.headline, { color: colors.foreground }]}>
                  {title}
                </Text>
              ) : null}
              <View style={styles.backButton} />
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function previewNote(provider: string) {
  Alert.alert(
    'Preview only',
    `${provider} sign-in is a front-end preview — the wiring comes with the native build.`,
  );
}

/**
 * Apple/Google entry points as quiet matching cards, so the one loud button
 * on the page is Sign in with Email — quiet, quiet, loud.
 */
/**
 * Apple's mark is a trademark with no Material counterpart; Apple's own
 * guidelines require their glyph on their button. It is therefore drawn from
 * SF Symbols on iOS only — and the button itself is iOS-only anyway, since
 * "Sign in with Apple" does not exist on Android.
 */
function AppleGlyph({ color }: { color: string }) {
  if (Platform.OS !== 'ios') return null;
  return <SymbolView name="apple.logo" size={19} tintColor={color} />;
}

function SocialButton({
  provider,
  onPress,
}: {
  provider: 'apple' | 'google';
  onPress: () => void;
}) {
  const { colors } = useTokens();
  const isApple = provider === 'apple';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isApple ? 'Continue with Apple' : 'Continue with Google'}
      testID={`auth-selection-${provider}`}
      style={({ pressed }) => [
        styles.socialButton,
        { backgroundColor: colors.card, borderColor: colors.divider },
        pressed && styles.socialPressed,
      ]}>
      <View style={styles.socialIconSlot}>
        {isApple ? (
          <AppleGlyph color={colors.foreground} />
        ) : (
          <Text style={[styles.googleGlyph, { color: '#4285F4' }]}>G</Text>
        )}
      </View>
      <Text style={[type.body, { color: colors.foreground }]}>
        {isApple ? 'Continue with Apple' : 'Continue with Google'}
      </Text>
    </Pressable>
  );
}

function Landing({ onSignIn }: { onSignIn: () => void }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page}>
        <View style={styles.landingBrand}>
          <Image
            source={require('@/assets/images/horcery-mark.svg')}
            style={styles.mark}
            contentFit="contain"
            accessibilityLabel="Horcery logo"
          />
          <Text style={[type.largeTitle, styles.wordmark, { color: colors.foreground }]}>
            Horcery
          </Text>
          <Text style={[type.subhead, { color: colors.tertiary }]}>
            Know More. Care Smarter.
          </Text>
        </View>
        <View style={styles.landingActions}>
          {PREVIEWS.socialSignInButtons ? (
            <>
              <SocialButton provider="apple" onPress={() => previewNote('Apple')} />
              <SocialButton provider="google" onPress={() => previewNote('Google')} />
            </>
          ) : null}
          <PrimaryButton
            label="Sign in with Email"
            onPress={onSignIn}
            testID="auth-selection-sign-in"
          />
          {PREVIEWS.socialSignInButtons ? (
            <Pressable
              onPress={() => previewNote('Sign-up')}
              accessibilityRole="button"
              style={styles.centerLink}
              testID="auth-selection-sign-up">
              <Text style={[type.subhead, { color: colors.tertiary }]}>
                {'New to Horcery? '}
                <Text style={{ color: colors.accent }}>Create an account</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function SignIn({
  email,
  onChangeEmail,
  onBack,
  onForgot,
}: {
  email: string;
  onChangeEmail: (email: string) => void;
  onBack: () => void;
  onForgot: () => void;
}) {
  const { colors } = useTokens();
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const submit = async () => {
    const cleaned = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleaned)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError(null);
    setFailure(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(cleaned, password);
      // The root layout switches to the app when the session appears.
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      setFailure(
        code.includes('INVALID_LOGIN_CREDENTIALS') ||
          code.includes('INVALID_PASSWORD') ||
          code.includes('EMAIL_NOT_FOUND')
          ? 'Invalid email or password. Please try again.'
          : 'Could not sign in. Check the connection and try again.',
      );
      setBusy(false);
    }
  };

  return (
    <AuthPage onBack={onBack} title="Sign In">
      <View style={styles.form} testID="auth-sign-in-screen">
        <Text style={[type.largeTitle, { color: colors.foreground }]}>
          Welcome back
        </Text>
        <Text style={[type.subhead, styles.formIntro, { color: colors.secondary }]}>
          Sign in to see how your horses are doing.
        </Text>

        <TextField
          label="Email"
          placeholder="janesmith@horcery.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          value={email}
          onChangeText={(value) => {
            onChangeEmail(value);
            setEmailError(null);
          }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={emailError}
          testID="auth-sign-in-email-input"
        />
        <TextField
          ref={passwordRef}
          label="Password"
          placeholder="Type your password"
          autoCapitalize="none"
          secure
          textContentType="password"
          returnKeyType="go"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          testID="auth-sign-in-password-input"
        />

        <Pressable
          onPress={onForgot}
          hitSlop={8}
          accessibilityRole="button"
          testID="auth-sign-in-forgot-password"
          style={styles.forgotLink}>
          <Text style={[type.subhead, { color: colors.accent }]}>
            Forgot Password?
          </Text>
        </Pressable>

        {failure ? (
          <Text style={[type.subhead, { color: colors.statusAlert }]}>
            {failure}
          </Text>
        ) : null}

        <PrimaryButton
          label={busy ? 'Signing In' : 'Sign In'}
          onPress={submit}
          loading={busy}
          disabled={!canSubmit}
          testID="auth-sign-in-submit"
        />
      </View>
    </AuthPage>
  );
}

function Forgot({
  email,
  onChangeEmail,
  onBack,
  onSent,
}: {
  email: string;
  onChangeEmail: (email: string) => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const { colors } = useTokens();
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeFlow = PREVIEWS.passwordResetCodeFlow;

  /**
   * Production path: Firebase's own reset email (real, sends today). The
   * 6-digit in-app code flow Inakshi chose needs a backend endpoint
   * (requirements §7 item 7) and until then exists only as a preview that
   * is compiled out of release builds — see src/config/previews.ts.
   */
  const submit = async () => {
    const cleaned = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleaned)) {
      setEmailError(
        cleaned.length === 0 ? 'Please enter your email' : 'Please enter a valid email',
      );
      return;
    }
    setEmailError(null);
    if (codeFlow) {
      onSent();
      return;
    }
    setBusy(true);
    try {
      await requestReset(cleaned);
      onSent();
    } catch {
      setEmailError('Could not send the link. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPage onBack={onBack} title="Forgot Password">
      <View style={styles.form} testID="auth-forgot-password-screen">
        <Text style={[type.subhead, styles.formIntro, { color: colors.secondary }]}>
          {codeFlow
            ? 'We\u2019ll email you a 6-digit code to reset your password.'
            : 'A password reset link will be sent to your recovery email address.'}
        </Text>
        <TextField
          label="Email"
          placeholder="janesmith@horcery.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="go"
          value={email}
          onChangeText={(value) => {
            onChangeEmail(value);
            setEmailError(null);
          }}
          onSubmitEditing={submit}
          error={emailError}
          testID="auth-forgot-password-email-input"
        />
        <PrimaryButton
          label={codeFlow ? 'Send Code' : busy ? 'Sending' : 'Send Password Reset'}
          onPress={submit}
          loading={busy}
          disabled={busy}
          testID="auth-forgot-password-submit-button"
        />
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={styles.centerLink}
          testID="auth-forgot-password-back">
          <Text style={[type.subhead, { color: colors.accent }]}>
            Back to Sign In
          </Text>
        </Pressable>
      </View>
    </AuthPage>
  );
}

function CodeEntry({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const { colors } = useTokens();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const inputRef = useRef<TextInput>(null);

  // Depends on whether the countdown is running, not on its value: keying this
  // to `cooldown` tore the interval down and re-timed it on every tick, so the
  // visible countdown ran progressively longer than RESEND_COOLDOWN_S.
  const counting = cooldown > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(
      () => setCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [counting]);

  const digits = code.padEnd(CODE_LENGTH).split('').slice(0, CODE_LENGTH);
  const complete = code.length === CODE_LENGTH;

  return (
    <AuthPage onBack={onBack} title="Enter Code">
      <View style={styles.form} testID="auth-code-screen">
        <Text style={[type.title, { color: colors.foreground }]}>
          Check your inbox
        </Text>
        <Text style={[type.subhead, styles.formIntro, { color: colors.secondary }]}>
          {`We emailed a 6-digit code to ${email.trim().toLowerCase()}.`}
        </Text>

        {/* One invisible input drives six display boxes — pasting works. */}
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.codeRow}>
          {digits.map((digit, index) => {
            const isActive = index === Math.min(code.length, CODE_LENGTH - 1);
            return (
              <View
                key={index}
                style={[
                  styles.codeBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: isActive ? colors.accent : colors.divider,
                  },
                ]}>
                <Text style={[type.title, { color: colors.foreground }]}>
                  {digit.trim()}
                </Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoFocus
          style={styles.hiddenInput}
          testID="auth-code-input"
        />

        <PrimaryButton
          label="Verify Code"
          onPress={onVerified}
          disabled={!complete}
          testID="auth-code-submit"
        />
        <Pressable
          onPress={cooldown > 0 ? undefined : () => setCooldown(RESEND_COOLDOWN_S)}
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown > 0 }}
          style={styles.centerLink}
          testID="auth-code-resend">
          <Text
            style={[
              type.subhead,
              { color: cooldown > 0 ? colors.dimmed : colors.accent },
            ]}>
            {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
          </Text>
        </Pressable>
      </View>
    </AuthPage>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const { colors } = useTokens();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<TextInput>(null);

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;

  const submit = () => {
    if (!longEnough) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    onDone();
  };

  return (
    <AuthPage title="New Password">
      <View style={styles.form} testID="auth-new-password-screen">
        <Text style={[type.subhead, styles.formIntro, { color: colors.secondary }]}>
          Choose a new password for your account.
        </Text>
        <TextField
          label="New password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoCapitalize="none"
          secure
          autoFocus
          textContentType="newPassword"
          returnKeyType="next"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(null);
          }}
          onSubmitEditing={() => confirmRef.current?.focus()}
          testID="auth-new-password-input"
        />
        <TextField
          ref={confirmRef}
          label="Confirm password"
          placeholder="Type it again"
          autoCapitalize="none"
          secure
          textContentType="newPassword"
          returnKeyType="go"
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            setError(null);
          }}
          onSubmitEditing={submit}
          error={error}
          testID="auth-confirm-password-input"
        />
        <View style={styles.ruleRow}>
          <Icon
            name={longEnough ? 'checkFilled' : 'circleEmpty'}
            size={15}
            color={longEnough ? colors.statusOk : colors.dimmed}
          />
          <Text style={[type.footnote, { color: colors.secondary }]}>
            {`At least ${MIN_PASSWORD_LENGTH} characters`}
          </Text>
        </View>
        <PrimaryButton
          label="Reset Password"
          onPress={submit}
          disabled={password.length === 0 || confirm.length === 0}
          testID="auth-new-password-submit"
        />
      </View>
    </AuthPage>
  );
}

function Done({ onSignIn }: { onSignIn: () => void }) {
  const { colors } = useTokens();
  return (
    <AuthPage>
      <View style={styles.form} testID="auth-reset-done-screen">
        <View style={[styles.sentBadge, { backgroundColor: colors.fillTonal }]}>
          <Icon name="verified" size={36} color={colors.accent} />
        </View>
        <Text style={[type.title, styles.sentTitle, { color: colors.foreground }]}>
          Password updated
        </Text>
        <Text style={[type.subhead, styles.sentBody, { color: colors.secondary }]}>
          Sign in with your new password to get back to your horses.
        </Text>
        <PrimaryButton
          label="Sign In"
          onPress={onSignIn}
          testID="auth-reset-done-sign-in"
        />
      </View>
    </AuthPage>
  );
}

/** Production "check your inbox" after Firebase's reset email. */
function LinkSent({ email, onSignIn }: { email: string; onSignIn: () => void }) {
  const { colors } = useTokens();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(
      () => setCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    setResending(true);
    try {
      await requestReset(email.trim().toLowerCase());
      setCooldown(RESEND_COOLDOWN_S);
    } catch {
      setCooldown(0);
    } finally {
      setResending(false);
    }
  };

  const blocked = cooldown > 0 || resending;
  const resendLabel = resending
    ? 'Sending...'
    : cooldown > 0
      ? `Resend Link (${cooldown}s)`
      : 'Resend Reset Link';

  return (
    <AuthPage>
      <View style={styles.form} testID="auth-password-reset-screen">
        <View style={[styles.sentBadge, { backgroundColor: colors.fillTonal }]}>
          <Icon name="mail" size={34} color={colors.accent} />
        </View>
        <Text style={[type.title, styles.sentTitle, { color: colors.foreground }]}>
          Check your inbox
        </Text>
        <Text style={[type.subhead, styles.sentBody, { color: colors.secondary }]}>
          A password reset link has been sent to the assigned recovery email
          address.
        </Text>
        <PrimaryButton label="Sign In" onPress={onSignIn} testID="auth-password-reset-sign-in" />
        <Pressable
          onPress={blocked ? undefined : resend}
          accessibilityRole="button"
          accessibilityState={{ disabled: blocked }}
          style={styles.centerLink}
          testID="auth-password-reset-resend">
          <Text style={[type.subhead, { color: blocked ? colors.dimmed : colors.accent }]}>
            {resendLabel}
          </Text>
        </Pressable>
      </View>
    </AuthPage>
  );
}

/**
 * EMAIL_NOT_FOUND deliberately resolves as success so the form cannot be used
 * to probe which emails have Horcery accounts.
 */
async function requestReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(email);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    if (!code.includes('EMAIL_NOT_FOUND')) throw e;
  }
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: space.edge,
  },
  landingBrand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  mark: {
    width: 118,
    height: 86,
    marginBottom: space.md,
  },
  wordmark: {
    letterSpacing: -1,
  },
  landingActions: {
    paddingHorizontal: space.edge,
    paddingBottom: space.lg,
    gap: space.md,
  },
  socialButton: {
    minHeight: 54,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  socialIconSlot: {
    width: 24,
    alignItems: 'center',
  },
  socialPressed: {
    opacity: 0.7,
  },
  googleGlyph: {
    fontSize: 19,
    fontWeight: '700',
  },
  form: {
    gap: space.edge,
  },
  formIntro: {
    marginTop: -space.sm,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -space.sm,
  },
  centerLink: {
    alignSelf: 'center',
    paddingVertical: space.sm,
  },
  codeRow: {
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
  },
  codeBox: {
    width: 48,
    height: 58,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: -space.sm,
    paddingHorizontal: space.xs,
  },
  sentBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sentTitle: {
    textAlign: 'center',
  },
  sentBody: {
    textAlign: 'center',
  },
});
