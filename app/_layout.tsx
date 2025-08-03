import "@/global.css";
import "react-native-reanimated";
import "react-native-gesture-handler";
import ReactQueryProvider from "@/providers/reactQuery";
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
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { usePermissions } from "@/hooks/usePermissions";
import { ChapterDownloadQueueProvider } from "@/providers/chapterDownloadQueue";
import { NovelRefreshQueueProvider } from "@/providers/novelRefreshQueue";
import { NetworkProvider } from "@/providers/network";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 250,
  fade: true,
});

export default function RootLayout() {
  useDrizzleStudio(db_expo);
  const { success, error } = useMigrations(db_client, migrations);
  const { RequestNotificationPermissions } = usePermissions();

  useEffect(() => {
    RequestNotificationPermissions();

    if (success !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [success]);

  if (!success && error) {
    console.error("🚀 ~ RootLayout ~ error:", error);
    return <Error title="Lumiere failed to start" Icon={Frown} />;
  }

  return (
    <NetworkProvider>
      <ReactQueryProvider>
        <ConfigProvider>
          <ChapterDownloadQueueProvider>
            <NovelRefreshQueueProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <BottomSheetModalProvider>
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
                </BottomSheetModalProvider>
              </GestureHandlerRootView>
            </NovelRefreshQueueProvider>
          </ChapterDownloadQueueProvider>
        </ConfigProvider>
      </ReactQueryProvider>
    </NetworkProvider>
  );
}
