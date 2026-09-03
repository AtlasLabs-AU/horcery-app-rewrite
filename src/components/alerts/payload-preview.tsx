import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, space, type } from '@/constants/tokens';
import type { AlertRulePayload } from '@/domain/alerts/payload';
import { useTokens } from '@/hooks/use-tokens';
import { font } from '@/constants/fonts';

/**
 * DEV ONLY (A3): while writes are blocked, Save opens this instead — the
 * exact JSON the app WOULD send, plus the sentence and the barn window and
 * its UTC pair — so payload correctness can be checked on device before the
 * write gate is lifted (architecture §14 #12). A native page sheet.
 */
export function PayloadPreview({
  visible,
  onClose,
  sentence,
  payload,
  zone,
}: {
  visible: boolean;
  onClose: () => void;
  sentence: string;
  payload: AlertRulePayload;
  zone: string;
}) {
  const { colors } = useTokens();
  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[type.title, { color: colors.foreground }]}>What would be sent</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} testID="payload-preview-close">
            <Text style={[type.headline, { color: colors.accent }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[type.footnote, { color: colors.tertiary }]}>
            Saving is switched off in this build. Nothing was sent.
          </Text>
          <View style={[styles.block, { backgroundColor: colors.card }]}>
            <Text style={[type.footnote, styles.label, { color: colors.secondary }]}>Sentence</Text>
            <Text style={[type.body, { color: colors.foreground }]}>{sentence}</Text>
          </View>
          <View style={[styles.block, { backgroundColor: colors.card }]}>
            <Text style={[type.footnote, styles.label, { color: colors.secondary }]}>Window</Text>
            <Text style={[type.body, { color: colors.foreground }]}>
              {payload.evaluation_start_time} → {payload.evaluation_end_time} UTC{'\n'}
              barn zone {zone}
            </Text>
          </View>
          <View style={[styles.block, { backgroundColor: colors.card }]}>
            <Text style={[type.footnote, styles.label, { color: colors.secondary }]}>Payload</Text>
            <Text style={[styles.mono, { color: colors.foreground }]} selectable testID="payload-preview-json">
              {JSON.stringify(payload, null, 2)}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingVertical: space.md,
  },
  content: { padding: space.edge, gap: space.md, paddingBottom: space.xxl },
  block: { padding: space.card, borderRadius: radius.md, borderCurve: 'continuous', gap: space.xs },
  label: { textTransform: 'uppercase', letterSpacing: 0.6 },
  mono: { fontFamily: font.mono, fontSize: 12, lineHeight: 17 },
});
