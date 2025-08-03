import { colors } from "@/lib/constants";
import { LucideIcon } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import BooleanSwitch from "../switch";
import { cn } from "@/lib/cn";

export default function OptionButton({
  Icon,
  label,
  description,
  onPress,
  switchValue,
  disabled,
}: {
  Icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
  switchValue?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      className={cn(
        "flex flex-row gap-x-6 py-2 items-center w-full",
        disabled && "opacity-50"
      )}
      onPress={onPress}
      disabled={disabled}
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
