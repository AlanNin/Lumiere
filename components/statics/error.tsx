import { LucideIcon, Telescope } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function Error({
  Icon = Telescope,
  title,
  pressable,
  containerClassName,
}: {
  Icon?: LucideIcon;
  title: string;
  pressable?: { onPress: () => void; title: string };
  containerClassName?: string;
}) {
  return (
    <View
      className={cn(
        "flex-1 bg-background items-center justify-center flex flex-col gap-y-1",
        containerClassName
      )}
    >
      <Icon size={24} color={colors.grayscale} strokeWidth={1.6} />
      <Text className="text-grayscale mt-2 max-w-80 text-center">{title}</Text>
      {pressable && (
        <TouchableOpacity onPress={pressable.onPress} className="mt-2">
          <Text className="text-grayscale underline max-w-80 text-center">
            {pressable.title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
