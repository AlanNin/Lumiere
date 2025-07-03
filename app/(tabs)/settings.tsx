import TabHeader from "@/components/tabHeader";
import { View } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-background">
      <TabHeader title="Settings" />
    </View>
  );
}
