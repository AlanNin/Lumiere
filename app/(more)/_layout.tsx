import { Stack } from "expo-router";

export default function NovelLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="categories" />
    </Stack>
  );
}
