import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  TouchableOpacityProps,
} from "react-native";
import { CheckboxProps } from "../types/checkbox";
import { colors } from "@/lib/constants";
import { Check, Minus } from "lucide-react-native";
import { cn } from "@/lib/cn";

const ANIMATION_DURATION = 100;

export default function Checkbox(props: CheckboxProps) {
  const {
    status,
    disabled = false,
    onPress,
    testID,
    style,
    size = 20,
    ...rest
  } = props;

  const fillSize = size * 0.583;

  const { current: scaleAnim } = useRef<Animated.Value>(new Animated.Value(1));
  const isFirstRendering = useRef<boolean>(true);

  useEffect(() => {
    // Do not run animation on very first rendering
    if (isFirstRendering.current) {
      isFirstRendering.current = false;
      return;
    }

    const checked = status === "checked";

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: checked ? ANIMATION_DURATION : 0,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: checked ? ANIMATION_DURATION : ANIMATION_DURATION * 1.75,
        useNativeDriver: false,
      }),
    ]).start();
  }, [status, scaleAnim]);

  const unchecked = useMemo(() => status === "unchecked", [status]);
  const checked = useMemo(() => status === "checked", [status]);
  const indeterminate = useMemo(() => status === "indeterminate", [status]);

  const selectionControlColor = useMemo(() => {
    if (disabled) {
      return colors.muted;
    }
    if (checked) {
      return colors.primary;
    }
    return colors.grayscale;
  }, [disabled, checked]);

  const borderWidth = scaleAnim.interpolate({
    inputRange: [0.8, 1],
    outputRange: [7 * (size / 24), 0], // Scale border animation with size
  });

  const IconComponent = indeterminate ? Minus : Check;

  // Accessibility props based on platform
  const accessibilityProps: TouchableOpacityProps = useMemo(
    () =>
      Platform.OS === "web"
        ? {
            role: "checkbox",
            accessibilityState: { checked, disabled },
            focusable: !disabled,
          }
        : {
            accessibilityRole: "checkbox",
            accessibilityState: { disabled, checked },
            accessibilityLiveRegion: "polite",
          },
    [checked, disabled]
  );

  return (
    <TouchableOpacity
      {...rest}
      {...accessibilityProps}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.7}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View
          className={cn(
            "flex items-center justify-center rounded-sm border-grayscale",
            checked && "border-primary bg-primary",
            indeterminate && "bg-grayscale opacity-50",
            unchecked && "opacity-75"
          )}
          style={{
            width: size,
            height: size,
            borderWidth: 1.5,
          }}
        >
          {!unchecked && (
            <IconComponent
              size={size - 4}
              color={colors.primary_foreground}
              strokeWidth={2}
            />
          )}
        </View>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Animated.View
            style={{
              height: fillSize,
              width: fillSize,
              borderColor: selectionControlColor,
              borderWidth,
            }}
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
