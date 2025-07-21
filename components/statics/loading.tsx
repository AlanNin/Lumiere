import {
  ActivityIndicator,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";

export default function Loading({
  title,
  backgroundStyle,
  textStyle,
  loaderColor,
}: {
  title?: string;
  backgroundStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loaderColor?: string;
}) {
  return (
    <View
      className="flex-1 bg-background items-center justify-center"
      style={backgroundStyle}
    >
      <ActivityIndicator size="large" color={loaderColor ?? colors.grayscale} />
      {title && (
        <Text
          className="text-grayscale italic mt-4 max-w-80 text-center"
          style={textStyle}
        >
          {title}
        </Text>
      )}
    </View>
  );
}
