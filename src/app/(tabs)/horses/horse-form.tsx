import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { WriteSafeNotice } from '@/components/horses/write-safe-notice';
import { radius, space, type } from '@/constants/tokens';
import { useToast } from '@/components/ui/toast';
import { useTokens } from '@/hooks/use-tokens';

const FIELDS = [
  ['name', 'Name', 'Storm'],
  ['birthDate', 'Birth date', 'YYYY-MM-DD'],
  ['breed', 'Breed', 'Thoroughbred'],
  ['height', 'Height', 'Hands'],
  ['weight', 'Weight', 'Kilograms'],
  ['emergency', 'Emergency contact', 'Name and phone number'],
] as const;

export default function HorseFormScreen() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ mode?: string; id?: string }>();
  const editing = params.mode === 'edit';
  const [values, setValues] = useState<Record<string, string>>({});
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = () => {
    showToast(editing ? 'Horse changes are ready for review.' : 'Horse draft is ready for review.');
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: editing ? 'Edit Horse' : 'Add Horse', headerLargeTitle: false }} />
      <WriteSafeNotice />
      {FIELDS.map(([key, label, placeholder]) => (
        <View key={key} style={styles.field}>
          <Text style={[type.subhead, { color: colors.secondary }]}>{label}</Text>
          <TextInput
            value={values[key] ?? ''}
            onChangeText={(value) => update(key, value)}
            placeholder={placeholder}
            placeholderTextColor={colors.dimmed}
            accessibilityLabel={label}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.divider }]}
          />
        </View>
      ))}
      <Pressable onPress={submit} accessibilityRole="button" accessibilityLabel={editing ? 'Review horse changes' : 'Review new horse'} style={[styles.primary, { backgroundColor: colors.inverse }]}>
        <Text style={[type.headline, { color: colors.onInverse }]}>{editing ? 'Review Changes' : 'Review Horse'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.edge, paddingBottom: space.xxl, gap: space.md },
  field: { gap: space.xs },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, fontSize: 17 },
  primary: { minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
});
