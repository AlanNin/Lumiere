import { ActivityIndicator, View } from "react-native";
import { Text } from "../defaults";
import { colors } from "@/lib/constants";

export default function Loading({ title }: { title?: string }) {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color={colors.grayscale} />
      {title && (
        <Text className="text-grayscale italic mt-4 max-w-80 text-center">
          {title}
        </Text>
      )}
    </View>
  );
}
