import { memo, useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { Text } from "@/components/defaults";

const getFade = (o: number) => `rgba(18, 18, 18, ${o})`;

function NovelDescription({ description }: { description: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <Pressable
      className={cn(
        "relative flex flex-col items-center justify-center w-full",
        !collapsed && "mb-8"
      )}
      onPress={toggle}
    >
      <Text
        className="text-base text-muted_foreground leading-6 w-full"
        numberOfLines={collapsed ? 2 : undefined}
      >
        {description}
      </Text>

      {collapsed && (
        <LinearGradient
          colors={[getFade(0), getFade(0.8), getFade(1)]}
          className="absolute bottom-0 w-full h-full"
          pointerEvents="none"
        />
      )}

      <View className={`absolute ${collapsed ? "bottom-1" : "-bottom-8"}`}>
        {collapsed ? (
          <ChevronDown
            color={colors.muted_foreground}
            size={20}
            strokeWidth={1.6}
          />
        ) : (
          <ChevronUp
            color={colors.muted_foreground}
            size={20}
            strokeWidth={1.6}
          />
        )}
      </View>
    </Pressable>
  );
}

export default memo(NovelDescription);
