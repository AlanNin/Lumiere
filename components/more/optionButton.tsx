import { colors } from "@/lib/constants";
import { LucideIcon } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import BooleanSwitch from "../switch";

export default function OptionButton({
  Icon,
  label,
  description,
  onPress,
  switchValue,
}: {
  Icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
  switchValue?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex flex-row gap-x-6 items-center w-full"
      onPress={onPress}
    >
      <Icon color={colors.primary} size={20} strokeWidth={1.6} />
      <View className="flex flex-col gap-y-1 flex-1">
        <Text className="text-lg">{label}</Text>
        {description && (
          <Text className="text-sm text-grayscale_foreground">
            {description}
          </Text>
        )}
      </View>
      {switchValue !== undefined && (
        <BooleanSwitch value={switchValue} asChild />
      )}
    </TouchableOpacity>
  );
}
