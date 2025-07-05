import { colors } from "@/lib/constants";
import {
  ArrowLeft,
  Download,
  EllipsisVertical,
  ListFilter,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolateColor,
  SharedValue,
} from "react-native-reanimated";

export default function NovelHeader({
  novelTitle,
  scrollY,
}: {
  novelTitle: string;
  scrollY: SharedValue<number>;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Animate from fully transparent → your layout background
  const bgProgress = useDerivedValue(() =>
    withTiming(scrollY.value > 0 ? 1 : 0, { duration: 300 })
  );
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      ["transparent", colors.layout_background]
    ),
  }));

  // Fade & slide the title down when scrolled
  const textOpacity = useDerivedValue(() =>
    withTiming(scrollY.value > 0 ? 1 : 0, { duration: 300 })
  );
  const textTranslateY = useDerivedValue(() =>
    withTiming(scrollY.value > 0 ? 0 : -10, { duration: 300 })
  );
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: textTranslateY.value }],
  }));

  return (
    <View
      className="absolute top-0 w-full z-10"
      style={{ height: insets.top + 65 }}
    >
      <Animated.View
        style={[{ paddingTop: insets.top + 16 }, backgroundStyle]}
        className="p-4 flex flex-row items-center justify-between px-4 gap-x-6"
      >
        <View className="flex flex-row items-center gap-x-2 flex-shrink">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ArrowLeft
              color={colors.muted_foreground}
              size={20}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
          <Animated.Text
            style={textStyle}
            className="text-muted_foreground text-xl flex-shrink"
            numberOfLines={1}
          >
            {novelTitle}
          </Animated.Text>
        </View>
        <View className="flex flex-row items-center gap-x-6">
          <Download
            color={colors.muted_foreground}
            size={20}
            strokeWidth={1.6}
            className="p-2"
          />
          <ListFilter
            color={colors.muted_foreground}
            size={20}
            strokeWidth={1.6}
            className="p-2"
          />
          <EllipsisVertical
            color={colors.muted_foreground}
            size={20}
            strokeWidth={1.6}
            className="p-2"
          />
        </View>
      </Animated.View>
    </View>
  );
}
