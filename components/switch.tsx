import { cn } from "@/lib/cn";
import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

export default function BooleanSwitch({
  value = false,
  onChange,
  asChild = false,
}: {
  value: boolean;
  onChange?: () => void;
  asChild?: boolean;
}) {
  const translateX = useSharedValue(value ? 18 : 0);

  useEffect(() => {
    translateX.value = withTiming(value ? 18 : 0, { duration: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function Button({ children }: { children: React.ReactNode }) {
    const className = cn(
      "w-12 h-7 rounded-full px-1 justify-center",
      value ? "bg-foreground/85" : "bg-grayscale"
    );

    if (asChild) {
      return <View className={className}>{children}</View>;
    }

    return (
      <Pressable onPress={onChange} className={className}>
        {children}
      </Pressable>
    );
  }

  return (
    <Button>
      <Animated.View
        className={cn(
          "w-5 h-5 rounded-full absolute top-1 left-1",
          value ? "bg-primary" : "bg-gray-100"
        )}
        style={thumbStyle}
      />
    </Button>
  );
}
