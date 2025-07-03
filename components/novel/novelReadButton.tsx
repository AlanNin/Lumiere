import { TouchableOpacity } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Play } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback } from "react";

const FIXED_BUTTON_WIDTH = {
  NOT_SCROLLING: {
    START: 98,
    RESUME: 120,
  },
  SCROLLING: 52,
};

export default function NovelReadButton({
  scrollY,
  novelTitle,
  resumeFromNovelChapter,
  novelTotalChapters,
}: {
  scrollY: SharedValue<number>;
  novelTitle: string;
  resumeFromNovelChapter?: number;
  novelTotalChapters: number;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const widthAnim = useDerivedValue(() =>
    withTiming(
      scrollY.value > 0
        ? FIXED_BUTTON_WIDTH.SCROLLING
        : FIXED_BUTTON_WIDTH.NOT_SCROLLING[
            resumeFromNovelChapter ? "RESUME" : "START"
          ],
      { duration: 300, easing: Easing.out(Easing.quad) }
    )
  );

  const buttonStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    bottom: insets.bottom + 18,
    right: 18,
  }));

  const textOpacityAnim = useDerivedValue(() =>
    withTiming(scrollY.value > 0 ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    })
  );

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacityAnim.value,
  }));

  const handlePress = useCallback(() => {
    if (resumeFromNovelChapter) {
      router.push({
        pathname: `/novel/reader`,
        params: {
          title: novelTitle,
          chapterNumber: resumeFromNovelChapter,
          totalChapters: novelTotalChapters,
        },
      });
    } else {
      router.push({
        pathname: `/novel/reader`,
        params: {
          title: novelTitle,
          chapterNumber: 1,
          totalChapters: novelTotalChapters,
        },
      });
    }
  }, [router, resumeFromNovelChapter]);

  return (
    <Animated.View
      className="absolute z-10 overflow-hidden rounded-xl"
      style={buttonStyle}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex flex-row items-center gap-x-3 py-4 px-5 bg-primary_dark"
        onPress={handlePress}
      >
        <Play
          color={colors.foreground}
          fill={colors.foreground}
          size={16}
          strokeWidth={1.6}
        />

        <Animated.Text
          style={textStyle}
          className="font-medium text-foreground text-lg"
          numberOfLines={1}
        >
          {resumeFromNovelChapter ? "Resume" : "Start"}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
