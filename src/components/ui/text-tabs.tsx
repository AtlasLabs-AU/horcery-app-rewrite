import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { space, type } from '@/constants/tokens';

export interface TextTabOption<T extends string> {
  label: string;
  value: T;
}

/**
 * Text tabs — a short set of choices shown as words, the chosen one in ink
 * and headline weight with a hairline underline, the rest in secondary grey.
 *
 * The editorial alternative to a segmented control for choices that live
 * INSIDE a card (Daily / Weekly on the tracker): selection is carried by
 * weight and tone, not by a filled capsule fighting the card's other
 * controls. Pure React Native — no platform halves needed, identical on all
 * three targets. Keep `SegmentedControl` for page-level mode switches.
 */
export function TextTabs<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: TextTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.row} accessibilityRole="tablist" testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            style={styles.tab}>
            <Text
              style={[
                type.subhead,
                selected && styles.selectedText,
                { color: selected ? colors.foreground : colors.tertiary },
              ]}>
              {option.label}
            </Text>
            <View
              style={[
                styles.underline,
                { backgroundColor: selected ? colors.foreground : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.edge },
  tab: { alignItems: 'center', gap: space.xs },
  selectedText: { fontWeight: '600' },
  underline: { height: 2, alignSelf: 'stretch', borderRadius: 1 },
});
