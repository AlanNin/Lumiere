import { LucideIcon, Telescope } from "lucide-react-native";
import {
  StyleProp,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function Error({
  Icon = Telescope,
  title,
  pressable,
  containerClassName,
  backgroundStyle,
  textStyle,
  iconColor,
}: {
  Icon?: LucideIcon;
  title: string;
  pressable?: { onPress: () => void; title: string };
  containerClassName?: string;
  backgroundStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconColor?: string;
}) {
  return (
    <View
      className={cn(
        "flex-1 bg-background items-center justify-center flex flex-col gap-y-1",
        containerClassName
      )}
      style={backgroundStyle}
    >
      <Icon size={24} color={iconColor ?? colors.grayscale} strokeWidth={1.6} />
      <Text
        className="text-grayscale mt-2 max-w-80 text-center"
        style={textStyle}
      >
        {title}
      </Text>
      {pressable && (
        <TouchableOpacity onPress={pressable.onPress} className="mt-2">
          <Text
            className="text-grayscale underline max-w-80 text-center"
            style={textStyle}
          >
            {pressable.title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
