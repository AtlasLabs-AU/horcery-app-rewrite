import { Image } from 'expo-image';
import { openBrowserAsync } from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/ui/toast';
import { config } from '@/config/env';
import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Consumption — the two states the shipping app shows for a behaviour that has
 * no chart yet, reproduced from
 * `behavior-tracker-widget/components/consumption-coming-soon-state`.
 *
 * Which one appears depends on whether the organization owns any bucket meters,
 * exactly as the current app decides it (`fypContext.hasFeedDevices ||
 * hasWaterDevices`):
 *
 * - **No meters** → the product upsell: the meter photograph, "Install a
 *   *Horcery Wireless Bucket Meter* to unlock these metrics", and Buy Now,
 *   which opens `BUCKET_METER_URL` in the in-app browser.
 * - **Meters already installed** → a plain "Coming Soon!" panel. Showing a
 *   customer who has already bought the hardware an advert to buy it would be
 *   the one genuinely embarrassing version of this screen, which is why the
 *   current app splits it and why the split is reproduced rather than
 *   simplified away.
 *
 * The copy, the italicised product name, the URL and the two-state rule are the
 * current app's. The surface, type and control colours are ours — a purple
 * filled button is the one place PRINCIPLES.md puts purple, so the CTA matches
 * the rebuild rather than the old app's blue.
 */

/** Matches the current app's `h-72` (288 pt) product image. */
const IMAGE_HEIGHT = 288;
const IMAGE_MAX_WIDTH = 340;

export function ConsumptionUpsell({ testID }: { testID?: string }) {
  const { colors, type, space, radius } = useTokens();
  const { showToast } = useToast();

  const onBuyNow = () => {
    void openBrowserAsync(String(config.web.BUCKET_METER_URL)).catch(() =>
      // The current app toasts "Error opening URL." on failure rather than
      // failing silently; a button that appears to do nothing is worse than one
      // that says it could not.
      showToast('The bucket meter page could not be opened.'),
    );
  };

  return (
    <View
      testID={testID}
      accessible={false}
      style={[
        styles.surface,
        {
          backgroundColor: colors.background,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingBottom: space.md,
        },
      ]}>
      <Image
        source={require('@/assets/images/behavior-tracker/bucket-meter.png')}
        style={styles.image}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel="Wireless bucket meter and hanging bucket"
      />

      <Text
        style={[type.body, styles.copy, { color: colors.secondary, marginTop: space.sm }]}>
        Install a{' '}
        <Text style={[type.body, styles.product, { color: colors.secondary }]}>
          Horcery Wireless Bucket Meter
        </Text>{' '}
        to unlock these metrics
      </Text>

      <Pressable
        onPress={onBuyNow}
        accessibilityRole="button"
        accessibilityLabel="Buy Now"
        accessibilityHint="Opens the Horcery bucket meter page"
        testID="consumption-buy-now"
        style={({ pressed }) => [
          styles.cta,
          {
            marginTop: space.lg,
            borderRadius: radius.md,
            paddingHorizontal: space.xl,
            backgroundColor: colors.inverse,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text style={[type.headline, { color: colors.onInverse }]}>Buy Now</Text>
      </Pressable>
    </View>
  );
}

/**
 * For an organization that already owns meters. Deliberately plain — the
 * current app shows only the words, and dressing up "not built yet" would be
 * promising something.
 */
export function ConsumptionComingSoon({ testID }: { testID?: string }) {
  const { colors, type, radius, space } = useTokens();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel="Coming soon"
      style={[
        styles.comingSoon,
        {
          backgroundColor: colors.background,
          borderRadius: radius.md,
          padding: space.xl,
        },
      ]}>
      <Text style={[type.body, { color: colors.tertiary }]}>Coming Soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { alignItems: 'center', justifyContent: 'center' },
  image: { height: IMAGE_HEIGHT, width: '100%', maxWidth: IMAGE_MAX_WIDTH },
  copy: { textAlign: 'center' },
  product: { fontFamily: font.semiboldItalic },
  cta: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  comingSoon: { alignItems: 'center', justifyContent: 'center', minHeight: 148 },
});
