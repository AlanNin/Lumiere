import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";
import { useKeyboard } from "@react-native-community/hooks";

export default function Quote({
  quote,
  Icon,
  iconStrokeWidth = 1,
}: {
  quote: string;
  Icon?: LucideIcon;
  iconStrokeWidth?: number;
}) {
  const { keyboardShown } = useKeyboard();

  return (
    <View
      className={cn(
        "items-center justify-center flex flex-col gap-y-3",
        keyboardShown ? "h-[36%]" : "flex-1"
      )}
    >
      <Text className="text-muted_foreground max-w-56 text-center tracking-widest italic">
        {quote}
      </Text>
      {Icon && (
        <Icon
          color={colors.muted_foreground}
          size={20}
          strokeWidth={iconStrokeWidth}
        />
      )}
    </View>
  );
}
