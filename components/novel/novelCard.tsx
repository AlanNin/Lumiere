import React from "react";
import { cn } from "@/lib/cn";
import { Image, StyleProp, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "react-native-linear-gradient";
import { useRouter } from "expo-router";
import { Text } from "@/components/defaults";

export default function NovelCard({
  title,
  imageUri,
  href,
  containerClassName,
  containerStyle,
}: {
  title: string;
  imageUri: string;
  href?: {
    pathname: string;
    params?: { [key: string]: string | number };
  };
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const [imageError, setImageError] = React.useState(false);

  function handlePress() {
    if (href) {
      router.push({
        pathname: href.pathname,
        params: href.params,
      });
    }
  }

  return (
    <TouchableOpacity
      className={cn(
        "flex-1 rounded-lg relative overflow-hidden",
        containerClassName
      )}
      style={[
        {
          width: "100%",
          aspectRatio: 1 / 1.5,
          borderRadius: 8,
        },
        containerStyle,
      ]}
      onPress={handlePress}
    >
      <Image
        alt={`Cover of ${title}`}
        source={
          imageError
            ? require("@/assets/placeholders/novel.png")
            : { uri: imageUri }
        }
        className={cn(!imageError ? "absolute inset-0" : "size-20 m-auto")}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />

      <LinearGradient
        colors={[
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, 0.2)",
          "rgba(0, 0, 0, 0.4)",
          "rgba(0, 0, 0, 1)",
        ]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <Text className="absolute bottom-3 left-3 right-3 text-sm tracking-wide text-muted_foreground">
        {title}
      </Text>
    </TouchableOpacity>
  );
}
