import { useSharedValue } from "react-native-reanimated";
import { Slider } from "react-native-awesome-slider";
import { colors } from "@/lib/constants";
import { View } from "react-native";

export function SliderComponent({
  minValue,
  maxValue,
  value,
  onChange,
  stepSize = 2,
  renderBubble = true,
  renderMark = true,
  forceSnapToStep = true,
}: {
  minValue: number;
  maxValue: number;
  value: number;
  onChange: (value: number) => void;
  stepSize?: number;
  renderBubble?: boolean;
  renderMark?: boolean;
  forceSnapToStep?: boolean;
}) {
  const progress = useSharedValue(value ?? minValue);
  const min = useSharedValue(minValue);
  const max = useSharedValue(maxValue);
  const intervals = (maxValue - minValue) / stepSize;

  return (
    <Slider
      progress={progress}
      minimumValue={min}
      maximumValue={max}
      steps={intervals}
      forceSnapToStep={forceSnapToStep}
      onValueChange={(newValue) => {
        if (value === newValue) return;

        if (onChange) {
          onChange(newValue);
        }
      }}
      containerStyle={{
        backgroundColor: colors.grayscale,
        borderRadius: 10,
      }}
      renderMark={
        !renderMark
          ? () => null
          : ({ index }) => {
              if (index === 0 || index === intervals) return null;
              return (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: colors.foreground,
                    opacity: 0.75,
                    transform: [{ rotate: "45deg" }],
                    left: index > 4 ? -index : 0,
                  }}
                />
              );
            }
      }
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
      renderBubble={!renderBubble ? () => null : undefined}
      bubbleTranslateY={5}
      theme={{
        bubbleBackgroundColor: colors.primary,
        bubbleTextColor: colors.primary_foreground,
        maximumTrackTintColor: colors.primary,
        minimumTrackTintColor: colors.primary,
      }}
    />
  );
}
