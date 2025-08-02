import ModeIndicator from "@/components/modeIndicator";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function NovelLayout() {
  return (
    <View className="flex-1 bg-background">
      <ModeIndicator />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="categories" />
        <Stack.Screen name="downloadQueue" />
        <Stack.Screen name="dataAndStorage" />
        <Stack.Screen name="about" />
      </Stack>
    </View>
  );
}
