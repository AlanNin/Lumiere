import { TouchableOpacity } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Plus } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCROLLING_WIDTH = 56;
const NOT_SCROLLING_WIDTH = 99;
const CLOSE_TO_MAX_THRESHOLD = 70;

export default function AddCategoryButton({
  onPress,
  scrollY,
  maxScrollY,
}: {
  onPress: () => void;
  scrollY: SharedValue<number>;
  maxScrollY?: number;
}) {
  const insets = useSafeAreaInsets();

  const shrink = useDerivedValue(() => {
    const y = scrollY.value;
    const nearBottom =
      maxScrollY !== undefined && y >= maxScrollY - CLOSE_TO_MAX_THRESHOLD;
    return y > 0 && !nearBottom;
  });

  // animate width when scrolling
  const widthAnim = useDerivedValue(() =>
    withTiming(shrink.value ? SCROLLING_WIDTH : NOT_SCROLLING_WIDTH, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    })
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

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      className="absolute z-10 overflow-hidden rounded-xl "
      style={buttonStyle}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex flex-row items-center gap-x-3 py-4 px-5 bg-primary_dark"
        onPress={onPress}
      >
        <Plus
          color={colors.foreground}
          fill={colors.foreground}
          size={20}
          strokeWidth={1.6}
        />

        <Animated.Text
          style={textStyle}
          className="font-medium text-foreground text-lg"
          numberOfLines={1}
        >
          Add
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
