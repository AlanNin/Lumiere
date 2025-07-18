import { colors } from "@/lib/constants";
import { StyleProp, View, ViewStyle } from "react-native";

export default function Separator({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { height: 0.5, width: "100%", backgroundColor: colors.grayscale + 85 },
        style,
      ]}
    />
  );
}
