import { useCallback } from 'react';
import { ToastAndroid, TouchableOpacity } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import { colors } from '@/lib/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Chapter } from '@/types/novel';

const FIXED_BUTTON_WIDTH = {
  NOT_SCROLLING: {
    START: 98,
    RESUME: 120,
  },
  SCROLLING: 52,
};
const CLOSE_TO_MAX_THRESHOLD = 70;

export default function NovelReadButton({
  scrollY,
  novelTitle,
  isNovelSaved,
  resumeFromNovelChapter,
  novelTotalChapters,
  maxScrollY,
}: {
  scrollY: SharedValue<number>;
  novelTitle: string;
  isNovelSaved: boolean;
  resumeFromNovelChapter?: Chapter;
  novelTotalChapters: number;
  maxScrollY?: number;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const shrink = useDerivedValue(() => {
    const y = scrollY.value;
    const nearBottom = maxScrollY !== undefined && y >= maxScrollY - CLOSE_TO_MAX_THRESHOLD;
    return y > 0 && !nearBottom;
  });

  // animate width when scrolling
  const widthAnim = useDerivedValue(() =>
    withTiming(
      shrink.value
        ? FIXED_BUTTON_WIDTH.SCROLLING
        : FIXED_BUTTON_WIDTH.NOT_SCROLLING[resumeFromNovelChapter?.number ? 'RESUME' : 'START'],
      { duration: 300, easing: Easing.out(Easing.quad) }
    )
  );
  const buttonStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    bottom: insets.bottom + 18,
    right: 18,
  }));

  // animate text opacity when scrolling
  const textOpacityAnim = useDerivedValue(() =>
    withTiming(shrink.value ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    })
  );

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacityAnim.value,
  }));

  const handlePress = useCallback(() => {
    const chapterNumber = resumeFromNovelChapter?.number ?? 1;
    const isChapterDownloaded = resumeFromNovelChapter?.downloaded ? 1 : 0;

    router.push({
      pathname: `/novel/reader`,
      params: {
        novelTitle,
        chapterNumber: chapterNumber,
        totalChapters: novelTotalChapters,
        downloaded: isChapterDownloaded,
        isNovelSaved: isNovelSaved ? 1 : 0,
      },
    });
  }, [router, novelTitle, resumeFromNovelChapter?.number, novelTotalChapters]);

  const handleLongPress = useCallback(() => {
    const hasResumeFromChapter =
      resumeFromNovelChapter?.number !== undefined && resumeFromNovelChapter.number > 0;

    if (!hasResumeFromChapter) return;

    ToastAndroid.show(`Resume from chapter ${resumeFromNovelChapter.number}`, ToastAndroid.SHORT);
  }, [resumeFromNovelChapter?.number]);

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      className="absolute z-10 overflow-hidden rounded-xl"
      style={buttonStyle}>
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex flex-row items-center gap-x-3 bg-primary_dark px-5 py-4"
        onPress={handlePress}
        onLongPress={handleLongPress}>
        <Play color={colors.foreground} fill={colors.foreground} size={16} strokeWidth={1.6} />

        <Animated.Text
          style={textStyle}
          className="text-lg font-medium text-foreground"
          numberOfLines={1}>
          {resumeFromNovelChapter?.number ? 'Resume' : 'Start'}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
