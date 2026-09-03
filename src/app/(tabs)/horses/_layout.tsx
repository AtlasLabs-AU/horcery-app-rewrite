import { Stack } from 'expo-router';

import { font } from '@/constants/fonts';

export default function HorsesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: font.semibold },
        headerLargeTitleStyle: { fontFamily: font.bold },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
