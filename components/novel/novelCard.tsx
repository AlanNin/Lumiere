import { cn } from "@/lib/cn";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { LinearGradient } from "react-native-linear-gradient";
import { useRouter } from "expo-router";
import { Text } from "@/components/defaults";
import { Image } from "expo-image";
import { useState } from "react";
import { BookMarked } from "lucide-react-native";
import { colors } from "@/lib/constants";

export default function NovelCard({
  title,
  imageUri,
  href,
  containerClassName,
  containerStyle,
  showSavedBadge,
}: {
  title: string;
  imageUri: string;
  href?: {
    pathname: string;
    params?: { [key: string]: string | number };
  };
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  showSavedBadge?: boolean;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  function handlePress() {
    if (href) {
      router.push({
        pathname: href.pathname,
        params: href.params,
      });
    }
  }
  function getGradientColors() {
    if (showSavedBadge) {
      return ["rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0.6)"];
    }

    return [
      "rgba(0, 0, 0, 0)",
      "rgba(0, 0, 0, 0.2)",
      "rgba(0, 0, 0, 0.4)",
      "rgba(0, 0, 0, 0.7)",
      "rgba(0, 0, 0, 0.9)",
    ];
  }

  return (
    <TouchableOpacity
      className={cn(
        "flex-1 rounded-lg relative overflow-hidden",
        containerClassName
      )}
      style={[
        {
          aspectRatio: 1 / 1.5,
        },
        containerStyle,
      ]}
      onPress={handlePress}
    >
      <Image
        cachePolicy="memory-disk"
        alt={`Cover of ${title}`}
        source={
          imageError ? require("@/assets/placeholders/novel.png") : imageUri
        }
        style={{ flex: 1 }}
        contentFit={imageError ? "contain" : "cover"}
        onError={() => setImageError(true)}
      />

      <LinearGradient
        colors={getGradientColors()}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {showSavedBadge && (
        <View className="absolute top-3 left-3 bg-primary rounded-md p-1">
          <BookMarked
            color={colors.primary_foreground}
            size={14}
            strokeWidth={1.6}
          />
        </View>
      )}

      <Text className="absolute bottom-3 left-3 right-3 text-sm tracking-wide text-muted_foreground">
        {title}
      </Text>
    </TouchableOpacity>
  );
}
