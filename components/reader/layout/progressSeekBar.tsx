import { Text } from "@/components/defaults";
import { colors } from "@/lib/constants";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Slider } from "react-native-awesome-slider";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MIN_VALUE = 0;
const MAX_VALUE = 100;
const STEP_SIZE = 10;
const BAR_SCALE = 0.3;

export default function ProgressSeekBar({
  layoutVisible,
  postponeHide,
  percent,
  seekTo,
  insets,
}: {
  layoutVisible: boolean;
  postponeHide: () => void;
  percent: number;
  seekTo: (percent: number) => void;
  insets: { top: number; bottom: number };
}) {
  const seekBarAnimValue = useDerivedValue(
    () => withTiming(layoutVisible ? 1 : 0, { duration: 200 }),
    [layoutVisible]
  );

  const animatedSeekBarStyle = useAnimatedStyle(() => ({
    opacity: seekBarAnimValue.value,
  }));

  const dimesions = useWindowDimensions();
  const progress = useDerivedValue(
    () => withTiming(percent, { duration: 100 }),
    [percent]
  );
  const min = useSharedValue(MIN_VALUE);
  const max = useSharedValue(MAX_VALUE);
  const intervals = (MAX_VALUE - MIN_VALUE) / STEP_SIZE;

  return (
    <Animated.View
      style={[animatedSeekBarStyle, { bottom: insets.bottom + 144 }]}
      className="absolute right-5 bg-layout_background p-3 rounded-xl"
      pointerEvents={layoutVisible ? "auto" : "none"}
    >
      <Pressable
        onPress={postponeHide}
        className="flex flex-col items-center justify-between relative"
        style={{ minHeight: dimesions.height * BAR_SCALE + 56 }}
      >
        <Text className="text-muted_foreground text-sm">{percent}</Text>
        <Text className="text-muted_foreground text-sm">{MAX_VALUE}</Text>
        <View
          style={{
            width: dimesions.height * BAR_SCALE,
          }}
          className="absolute top-1/2 -translate-y-1/2 rotate-90"
        >
          <Slider
            progress={progress}
            minimumValue={min}
            maximumValue={max}
            steps={intervals}
            forceSnapToStep={false}
            onSlidingComplete={(newValue) => {
              seekTo(newValue);
            }}
            containerStyle={{
              backgroundColor: colors.grayscale,
              borderRadius: 10,
            }}
            renderMark={() => null}
            renderThumb={() => {
              return (
                <View
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 999,
                    backgroundColor: colors.primary,
                  }}
                />
              );
            }}
            renderBubble={() => null}
            bubbleTranslateY={5}
            theme={{
              bubbleBackgroundColor: colors.primary,
              bubbleTextColor: colors.primary_foreground,
              maximumTrackTintColor: colors.primary,
              minimumTrackTintColor: colors.primary,
            }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
