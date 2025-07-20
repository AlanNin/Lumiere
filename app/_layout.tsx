import "@/global.css";
import "react-native-reanimated";
import "react-native-gesture-handler";
import ReactQueryProvider, { queryClient } from "@/providers/reactQuery";
import migrations from "@/drizzle/migrations";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@/lib/constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConfigProvider } from "@/providers/appConfig";
import { db_client, db_expo } from "@/server/db/client";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { useEffect } from "react";
import { Frown } from "lucide-react-native";
import Error from "@/components/statics/error";
import { libraryController } from "@/server/controllers/library";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 250,
  fade: true,
});

async function PrefetchLibrary() {
  try {
    await queryClient.prefetchQuery({
      queryKey: ["library"],
      queryFn: () => libraryController.getLibrary(),
    });
  } catch (err) {
    console.warn("Library prefetch failed:", err);
  }
}

export default function RootLayout() {
  useDrizzleStudio(db_expo);
  const { success, error } = useMigrations(db_client, migrations);

  useEffect(() => {
    PrefetchLibrary();

    if (success !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [success]);

  if (!success && error) {
    console.error("🚀 ~ RootLayout ~ error:", error);
    return <Error title="Lumiere failed to start" Icon={Frown} />;
  }

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
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="novel" />
            <Stack.Screen name="(more)" />
          </Stack>
        </GestureHandlerRootView>
      </ConfigProvider>
    </ReactQueryProvider>
  );
}
