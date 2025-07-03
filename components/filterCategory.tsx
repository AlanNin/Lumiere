import { cn } from "@/lib/cn";
import { TouchableOpacity } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { Text } from "@/components/defaults";

export default function FilterCategory({
  label,
  Icon,
  selected,
  onPress,
}: {
  label: string;
  Icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={cn(
        "rounded-lg border py-1 px-3 flex flex-row items-center gap-x-2",
        selected ? "border-primary bg-primary" : "border-foreground/50"
      )}
      onPress={onPress}
    >
      <Icon
        size={16}
        color={selected ? colors.foreground : colors.muted_foreground}
        strokeWidth={1.5}
      />
      <Text
        className={cn(selected ? "text-foreground" : "text-muted_foreground")}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
