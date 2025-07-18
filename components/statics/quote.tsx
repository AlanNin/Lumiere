import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "../defaults";
import { colors, keyboardShownContentHeight } from "@/lib/constants";
import { useKeyboard } from "@react-native-community/hooks";

export default function Quote({
  quote,
  Icon,
}: {
  quote: string;
  Icon?: LucideIcon;
}) {
  const { keyboardShown } = useKeyboard();

  return (
    <View
      className={cn(
        "items-center justify-center flex flex-col gap-y-3",
        keyboardShown ? keyboardShownContentHeight : "flex-1"
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
