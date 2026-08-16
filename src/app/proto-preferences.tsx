import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingRow } from '@/components/settings/setting-row';
import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * PROTOTYPE (rnd) — Preferences in the editorial language, to judge two
 * things on device: the theme variant under review, and the settings row
 * whose icon follows the toggle (tint + glyph swap).
 *
 * The rows are the current app's real preferences plus two Horcery-specific
 * ones (camera privacy, alert sounds) so the on/off glyphs mean something.
 * Nothing here writes anywhere: state is local to the screen.
 */
export default function PreferencesPrototype() {
  const { colors } = useTokens();
  const [prefs, setPrefs] = useState({
    push: true,
    alertSound: true,
    dailyDigest: false,
    liveCameras: true,
    wifiOnly: false,
    darkMode: false,
  });
  const set = (key: keyof typeof prefs) => (value: boolean) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="prefs-back">
            <Icon name="back" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[type.title, styles.headerTitle, { color: colors.foreground }]}>
            Preferences
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[type.eyebrow, styles.eyebrow, { color: colors.tertiary }]}>
            Notifications
          </Text>
          <View style={[styles.group, { backgroundColor: colors.card }]}>
            <SettingRow
              icon="alerts"
              offIcon="notificationsOff"
              title="Push notifications"
              description="Alerts and daily summaries on this phone."
              value={prefs.push}
              onValueChange={set('push')}
              testID="prefs-push"
            />
            <SettingRow
              icon="sound"
              offIcon="soundOff"
              title="Alert sound"
              description="Play a sound when an alert arrives."
              value={prefs.alertSound}
              onValueChange={set('alertSound')}
              testID="prefs-sound"
            />
            <SettingRow
              icon="mail"
              title="Daily digest"
              description="One email each morning with yesterday’s events."
              value={prefs.dailyDigest}
              onValueChange={set('dailyDigest')}
              last
              testID="prefs-digest"
            />
          </View>

          <Text style={[type.eyebrow, styles.eyebrow, { color: colors.tertiary }]}>
            Cameras
          </Text>
          <View style={[styles.group, { backgroundColor: colors.card }]}>
            <SettingRow
              icon="camera"
              offIcon="cameraOff"
              title="Live previews"
              description="Show live frames on the Stalls and Horses pages."
              value={prefs.liveCameras}
              onValueChange={set('liveCameras')}
              testID="prefs-cameras"
            />
            <SettingRow
              icon="wifi"
              offIcon="wifiOff"
              title="Video on Wi‑Fi only"
              description="Save mobile data; stills still load anywhere."
              value={prefs.wifiOnly}
              onValueChange={set('wifiOnly')}
              last
              testID="prefs-wifi"
            />
          </View>

          <Text style={[type.eyebrow, styles.eyebrow, { color: colors.tertiary }]}>
            Appearance
          </Text>
          <View style={[styles.group, { backgroundColor: colors.card }]}>
            <SettingRow
              icon="darkMode"
              title="Dark mode"
              description="Prototype only — the app follows your phone."
              value={prefs.darkMode}
              onValueChange={set('darkMode')}
              last
              testID="prefs-dark"
            />
          </View>

          <Text style={[type.footnote, styles.note, { color: colors.tertiary }]}>
            Prototype: nothing here is saved. Icons tint on, dim off, and swap to
            their “off” glyph where the meaning changes.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  headerTitle: { flex: 1 },
  content: { padding: space.edge, gap: space.sm, paddingBottom: space.xxl },
  eyebrow: { paddingHorizontal: space.xs, paddingTop: space.md },
  group: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  note: { paddingHorizontal: space.xs, paddingTop: space.md },
});
