import { Button, Host } from '@expo/ui';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signInWithEmailAndPassword } from '@acme/config/firebase-rn';
import { Brand, Fyp, Radius, Spacing } from '@/constants/theme';

/**
 * Minimal sign-in, so the rewrite can reach the real API.
 *
 * Deliberately plain — this is not the rewrite's login design, just enough
 * credential entry to establish a session. The current app's full auth flow
 * (organization selection, sign-up, password reset, biometrics) is a later
 * piece of work.
 */
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(email.trim(), password);
      // The root layout switches to For You when auth state changes.
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      setError(
        code.includes('INVALID_LOGIN_CREDENTIALS') ||
          code.includes('INVALID_PASSWORD') ||
          code.includes('EMAIL_NOT_FOUND')
          ? 'That email and password did not match.'
          : 'Could not sign in. Check the connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.form}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.title}>Horcery</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Fyp.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            testID="sign-in-email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Fyp.muted}
            autoCapitalize="none"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            testID="sign-in-password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {busy ? (
            <ActivityIndicator color={Brand.primary} style={styles.busy} />
          ) : (
            <Host style={styles.buttonHost}>
              <Button
                variant="filled"
                label="Sign in"
                onPress={submit}
                testID="sign-in-submit"
              />
            </Host>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Fyp.pageBackground,
  },
  safeArea: {
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: Fyp.headerTitle,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Fyp.muted,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Fyp.card,
    borderRadius: Radius.inner,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: Fyp.title,
  },
  error: {
    color: '#D92D20',
    fontSize: 14,
  },
  busy: {
    height: 44,
  },
  buttonHost: {
    height: 44,
  },
});
