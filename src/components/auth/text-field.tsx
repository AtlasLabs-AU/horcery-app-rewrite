import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Labeled text field for the auth screens: label above, opaque card input,
 * inline error below, optional show/hide-password eye — the same anatomy as
 * the current app's ControlledInput, on tokens.
 */
export const TextField = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    error?: string | null;
    secure?: boolean;
    testID?: string;
  }
>(function TextField({ label, error, secure, testID, ...inputProps }, ref) {
  const { colors } = useTokens();
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.field}>
      <Text style={[type.subhead, styles.label, { color: colors.secondary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.statusAlert : colors.divider,
          },
        ]}>
        <TextInput
          ref={ref}
          style={[type.body, styles.input, { color: colors.foreground }]}
          placeholderTextColor={colors.dimmed}
          secureTextEntry={hidden}
          testID={testID}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            testID={testID ? `${testID}-toggle` : undefined}>
            <Icon name={hidden ? 'showPassword' : 'hidePassword'} size={18} color={colors.tertiary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          style={[type.footnote, styles.error, { color: colors.statusAlert }]}
          numberOfLines={2}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: space.sm,
  },
  label: {
    paddingHorizontal: space.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.edge,
    minHeight: 54,
    gap: space.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  error: {
    paddingHorizontal: space.xs,
  },
});
