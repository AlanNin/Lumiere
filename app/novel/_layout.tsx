import { Stack } from "expo-router";

export default function NovelLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="reader" options={{ headerShown: false }} />
    </Stack>
  );
}
