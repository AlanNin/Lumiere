import "@/global.css";
import "react-native-reanimated";
import "react-native-gesture-handler";
import ReactQueryProvider from "@/providers/reactQuery";
import { colors } from "@/lib/constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConfigProvider } from "@/providers/appConfig";
import { db_client, db_expo } from "@/server/db/client";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import migrations from "@/drizzle/migrations";

export default function RootLayout() {
  // drizzle and drizzle studio initialization
  useDrizzleStudio(db_expo);
  const { success } = useMigrations(db_client, migrations);

  return (
    <ReactQueryProvider>
      <ConfigProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" translucent />
          <Stack
            screenOptions={{
              contentStyle: {
                backgroundColor: colors.background,
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="novel" options={{ headerShown: false }} />
          </Stack>
        </GestureHandlerRootView>
      </ConfigProvider>
    </ReactQueryProvider>
  );
}
