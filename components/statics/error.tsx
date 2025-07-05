import { LucideIcon, Telescope } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";

export default function Error({
  Icon = Telescope,
  title,
  pressable,
}: {
  Icon?: LucideIcon;
  title: string;
  pressable?: { onPress: () => void; title: string };
}) {
  return (
    <View className="flex-1 bg-background items-center justify-center flex flex-col gap-y-1">
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
