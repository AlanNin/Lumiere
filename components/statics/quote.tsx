import { cn } from "@/lib/cn";
import { LucideIcon, Search } from "lucide-react-native";
import { Keyboard, View } from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";
import { useLayoutEffect, useState } from "react";

export default function Quote({
  quote,
  Icon,
}: {
  quote: string;
  Icon?: LucideIcon;
}) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useLayoutEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View
      className={cn(
        "items-center justify-center flex flex-col gap-y-3",
        keyboardVisible ? "h-[36%]" : "flex-1"
      )}
    >
      <Text className="text-muted_foreground max-w-56 text-center tracking-widest italic">
        {quote}
      </Text>
      {Icon && (
        <Icon color={colors.muted_foreground} size={20} strokeWidth={1} />
      )}
    </View>
  );
}
