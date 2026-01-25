import ModeIndicator from '@/components/modeIndicator';
import { colors } from '@/lib/constants';
import { CustomTabButton } from '@/components/tabs/customButton';
import { NavigationTabBarTransitionContext } from '@/contexts/navigationTabBar';
import { usePathname, useRouter } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, ToastAndroid } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaPaddings } from '@/hooks/useSafeAreaPaddings';
import { useQuery } from '@tanstack/react-query';
import { novelController } from '@/server/controllers/novel';
import { useIsOnlineDirect } from '@/hooks/network';

const OVERLAY_BG = colors.background;
const FADE_DURATION = 220;

export default function Layout() {
  const { bottom } = useSafeAreaPaddings();
  const pathname = usePathname();

  const router = useRouter();
  const isOnline = useIsOnlineDirect();

  const overlayOpacity = useSharedValue(0);
  const isOverlayVisible = useSharedValue(false);

  const firstPaint = useRef(true);

  const begin = () => {
    if (isOverlayVisible.value) return;
    isOverlayVisible.value = true;
    overlayOpacity.value = 1;
  };

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      overlayOpacity.value = 0;
      isOverlayVisible.value = false;
      return;
    }

    overlayOpacity.value = withTiming(
      0,
      { duration: FADE_DURATION, easing: Easing.out(Easing.cubic) },
      () => {
        isOverlayVisible.value = false;
      }
    );
  }, [pathname]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const ctxValue = useMemo(() => ({ begin }), []);

  const { data: lastRead } = useQuery({
    queryKey: ['lastRead'],
    queryFn: () => novelController.getLastRead(),
    refetchOnWindowFocus: false,
  });

  function handleHistoryDoblePress() {
    if (!lastRead) {
      return;
    }

    if (!isOnline && !lastRead.downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    router.push({
      pathname: '/novel/reader',
      params: {
        novelTitle: lastRead?.novelTitle,
        chapterNumber: lastRead?.number,
        downloaded: lastRead.downloaded ? 1 : 0,
        isNovelSaved: lastRead.isNovelSaved ? 1 : 0,
      },
    });
  }

  return (
    <NavigationTabBarTransitionContext.Provider value={ctxValue}>
      <SafeAreaView className="flex-1 bg-background" edges={['right', 'left']}>
        <ModeIndicator />

        <Tabs>
          {/* Slot */}
          <TabSlot />
          {/* Transition Animation */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_BG }, overlayStyle]}
          />
          {/* Tabs List */}
          <TabList className="bg-layout_background p-5" style={{ paddingBottom: bottom + 20 }}>
            <TabTrigger name="library" href="/" asChild>
              <CustomTabButton iconName="BookCopy" label="Library" />
            </TabTrigger>
            <TabTrigger name="history" href="/history" asChild>
              <CustomTabButton
                iconName="History"
                label="History"
                onDoblePress={handleHistoryDoblePress}
              />
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <CustomTabButton iconName="Compass" label="Explore" />
            </TabTrigger>
            <TabTrigger name="more" href="/more" asChild>
              <CustomTabButton iconName="Ellipsis" label="More" />
            </TabTrigger>
          </TabList>
        </Tabs>
      </SafeAreaView>
    </NavigationTabBarTransitionContext.Provider>
  );
}
