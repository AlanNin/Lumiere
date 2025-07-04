import { colors } from "@/lib/constants";
import { CheckCheck, History, Star, StarHalf, User } from "lucide-react-native";
import { Image, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { Text } from "@/components/defaults";

export default function NovelDetails({
  imageUrl,
  title,
  author,
  status,
  rating,
}: {
  imageUrl: string;
  title: string;
  author: string;
  status: string;
  rating: number;
}) {
  function getDifumColor(opacity: number) {
    const difuminationColor = "18, 18, 18";

    return `rgba(${difuminationColor}, ${opacity})`;
  }

  return (
    <View className="relative min-h-[276px] w-full mb-6">
      <Image
        alt={`Background of ${title}`}
        source={{ uri: imageUrl }}
        className="flex-1"
        blurRadius={1.5}
      />
      <View className="absolute inset-0 opacity-20" />
      <LinearGradient
        colors={[
          getDifumColor(0.6),
          getDifumColor(0.7),
          getDifumColor(0.8),
          getDifumColor(0.9),
          getDifumColor(1),
        ]}
        className="absolute bottom-0 w-full h-full"
      />
      <View className="absolute -bottom-4 left-4 right-4 flex flex-row items-center gap-x-6">
        <Image
          alt={`Cover of ${title}`}
          source={{ uri: imageUrl }}
          style={{ aspectRatio: 1 / 1.5 }}
          className="h-52 object-cover rounded-lg"
        />
        <View className="flex-1 flex flex-col gap-y-2.5">
          <Text className="text-xl font-bold tracking-wide" numberOfLines={3}>
            {title}
          </Text>

          <View className="flex flex-row items-center gap-x-3">
            <User color={colors.muted_foreground} size={16} strokeWidth={1.4} />
            <Text className="text-sm text-muted_foreground flex-1">
              {author}
            </Text>
          </View>
          <View className="flex flex-row items-center gap-x-3">
            {status === "Completed" ? (
              <CheckCheck
                color={colors.muted_foreground}
                size={16}
                strokeWidth={1.4}
              />
            ) : (
              <History
                color={colors.muted_foreground}
                size={16}
                strokeWidth={1.4}
              />
            )}
            <Text className="text-sm text-muted_foreground flex-1">
              {status}
            </Text>
          </View>
          <View className="flex flex-row items-center gap-x-3">
            <View className="flex flex-row gap-x-2">
              {Math.floor(rating) === 0 ? (
                <Star
                  key="star-0"
                  color={colors.muted_foreground}
                  size={16}
                  strokeWidth={1.4}
                />
              ) : (
                <>
                  {Array.from({
                    length: Math.floor(rating),
                  }).map((_, index) => (
                    <Star
                      key={`star-${index}`}
                      color={colors.muted_foreground}
                      size={16}
                      strokeWidth={1.4}
                    />
                  ))}
                  {rating % 1 >= 0.4 && rating % 1 < 0.7 && (
                    <StarHalf
                      color={colors.muted_foreground}
                      size={16}
                      strokeWidth={1.4}
                    />
                  )}
                </>
              )}
            </View>
            <Text className="text-sm text-muted_foreground flex-1">
              {rating}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
