import { Stack } from 'expo-router';

export default function HorsesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
