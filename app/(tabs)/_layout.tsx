import ModeIndicator from "@/components/modeIndicator";
import { Tabs } from "@/components/navigationTabs";
import { colors } from "@/lib/constants";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabsLayout() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["right", "left"]}>
      <ModeIndicator />
      <Tabs
        tabBarStyle={{ backgroundColor: colors.layout_background }}
        activeIndicatorColor={colors.primary}
        backBehavior="history"
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Library",
            tabBarIcon: () => require("../../assets/icons/library.svg"),
            tabBarActiveTintColor: colors.foreground,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: () => require("../../assets/icons/history.svg"),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: () => require("../../assets/icons/explore.svg"),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: () => require("../../assets/icons/more.svg"),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
