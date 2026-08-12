import { Button, Host, Switch, Text } from '@expo/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Foundation screen — Stage A (Expo Go).
 *
 * Purpose: prove the pipeline end to end. Everything inside <Host> below is a
 * REAL native control — SwiftUI on iOS, Jetpack Compose on Android — rendered
 * by @expo/ui universal components. Not styled lookalikes.
 *
 * This screen is temporary. The first real milestone screen replaces it.
 */
export default function FoundationScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const [monitoring, setMonitoring] = useState(true);
  const [taps, setTaps] = useState(0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={[styles.brandMark, { backgroundColor: Brand.primary }]}>
              <ThemedText style={styles.brandLetter}>H</ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Horcery
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Rewrite foundation · Stage A
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Native components check
            </ThemedText>
            <ThemedText style={[styles.cardHint, { color: colors.textSecondary }]}>
              These controls are real native UI — SwiftUI on iPhone, Material on
              Android. Same code, both platforms.
            </ThemedText>

            <View style={styles.controlRow}>
              <Host matchContents>
                <Text textStyle={{ fontSize: 16, color: colors.text }}>
                  Monitoring
                </Text>
              </Host>
              <Host matchContents>
                <Switch value={monitoring} onValueChange={setMonitoring} />
              </Host>
            </View>

            <Host matchContents style={styles.buttonHost}>
              <Button
                variant="filled"
                label={taps === 0 ? 'Tap me' : `Tapped ${taps}×`}
                onPress={() => setTaps((t) => t + 1)}
              />
            </Host>
          </ThemedView>

          <ThemedText style={[styles.footer, { color: colors.textSecondary }]}>
            {monitoring
              ? 'Status: watching the stable 🐎'
              : 'Status: monitoring paused'}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  brandLetter: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTitle: {
    fontSize: 17,
  },
  cardHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonHost: {
    alignSelf: 'stretch',
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
  },
});
