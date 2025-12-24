import { colors } from '@/lib/constants';
import { useIsOnline } from '@/providers/network';
import { Chapter } from '@/types/novel';
import { useRouter } from 'expo-router';
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import { Pressable, ToastAndroid, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

export default function ReaderBottomBar({
  layoutVisible,
  postponeHide,
  chapter,
  insets,
  isAtBottom,
  isAtTop,
  scrollToBottom,
  scrollToTop,
  handleOpenBottomDrawerConfig,
}: {
  layoutVisible: boolean;
  postponeHide: () => void;
  chapter: Chapter;
  insets: { top: number; bottom: number };
  isAtBottom: boolean;
  isAtTop: boolean;
  scrollToBottom: () => void;
  scrollToTop: () => void;
  handleOpenBottomDrawerConfig: () => void;
}) {
  const router = useRouter();
  const isOnline = useIsOnline();

  const bottomBarAnimValue = useDerivedValue(
    () => withTiming(layoutVisible ? 1 : 0, { duration: 200 }),
    [layoutVisible]
  );

  const animatedBottomBarStyle = useAnimatedStyle(() => ({
    opacity: bottomBarAnimValue.value,
  }));

  function handlePreviousChapter() {
    if (!chapter.previousChapter) return;

    if (!isOnline && !chapter.previousChapter.downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    router.replace({
      pathname: '/novel/reader',
      params: {
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.previousChapter.number,
        downloaded: chapter.previousChapter.downloaded ? 1 : 0,
      },
    });
  }

  function handleNextChapter() {
    if (!chapter.nextChapter) return;

    if (!isOnline && !chapter.nextChapter.downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    router.replace({
      pathname: '/novel/reader',
      params: {
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.nextChapter.number,
        downloaded: chapter.nextChapter.downloaded ? 1 : 0,
      },
    });
  }

  return (
    <Animated.View
      style={animatedBottomBarStyle}
      className="absolute inset-x-0 bottom-0 bg-layout_background"
      pointerEvents={layoutVisible ? 'auto' : 'none'}>
      <Pressable
        onPress={postponeHide}
        className="flex flex-row items-center justify-between gap-x-6"
        style={{
          padding: 20,
          paddingBottom: insets.bottom + 20,
        }}>
        <TouchableOpacity
          disabled={!chapter.previousChapter}
          onPress={handlePreviousChapter}
          className="-m-2 p-2">
          <ChevronLeft
            color={!chapter.previousChapter ? colors.grayscale : colors.foreground}
            size={24}
            strokeWidth={1.6}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={scrollToTop} disabled={isAtTop} className="-m-2 p-2">
          <ArrowUpFromLine
            color={isAtTop ? colors.grayscale : colors.foreground}
            size={24}
            strokeWidth={1.6}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={scrollToBottom} disabled={isAtBottom} className="-m-2 p-2">
          <ArrowDownFromLine
            color={isAtBottom ? colors.grayscale : colors.foreground}
            size={24}
            strokeWidth={1.6}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleOpenBottomDrawerConfig} className="-m-2 p-2">
          <Settings color={colors.foreground} size={24} strokeWidth={1.6} />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!chapter.nextChapter}
          onPress={handleNextChapter}
          className="-m-2 p-2">
          <ChevronRight
            color={!chapter.nextChapter ? colors.grayscale : colors.foreground}
            size={24}
            strokeWidth={1.6}
          />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}
