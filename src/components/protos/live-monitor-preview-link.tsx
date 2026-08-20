import { router } from 'expo-router';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { PREVIEWS } from '@/config/previews';

/** The route is unreachable unless the deliberate dev-preview flag is on. */
export function LiveMonitorPreviewLink({ style }: { style?: StyleProp<TextStyle> }) {
  if (!PREVIEWS.liveMonitorPreview) return null;

  return (
    <Text
      style={style}
      onPress={() => router.push('/proto-live-charts')}
      accessibilityRole="button"
      testID="proto-live-charts-link">
      Live monitors →
    </Text>
  );
}
