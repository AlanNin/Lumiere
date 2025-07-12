import { colors } from "@/lib/constants";
import {
  CheckCheck,
  Crown,
  History,
  Star,
  StarHalf,
  User,
} from "lucide-react-native";
import { View, Image as NativeImage } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { Text } from "@/components/defaults";
import { cn } from "@/lib/cn";
import { Image } from "expo-image";

const TOP_RANK_THRESHOLD = 10;

export default function NovelDetails({
  imageUrl,
  title,
  author,
  status,
  rating,
  rank,
}: {
  imageUrl: string;
  title: string;
  author: string;
  status: string;
  rating: number;
  rank: number;
}) {
  function getDifumColor(opacity: number) {
    const difuminationColor = "18, 18, 18";

    return `rgba(${difuminationColor}, ${opacity})`;
  }

  const isTopRanking = rank <= TOP_RANK_THRESHOLD;

  return (
    <View className="relative min-h-[276px] w-full mb-6">
      <NativeImage
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
          style={{ aspectRatio: 1 / 1.5, height: 182, borderRadius: 8 }}
          contentFit="cover"
        />
        <View className="flex-1 flex flex-col gap-y-2.5">
          <Text className="text-xl font-bold tracking-wide" numberOfLines={3}>
            {title}
          </Text>

          <View className="flex flex-row items-center gap-x-3">
            <User color={colors.muted_foreground} size={16} strokeWidth={1.4} />
            <Text
              className="text-sm text-muted_foreground flex-1"
              numberOfLines={2}
            >
              {author}
            </Text>
          </View>
          <View className="flex flex-row items-center gap-x-3">
            {status === "new" ? (
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
            <View className="flex flex-row items-center gap-x-3">
              <Crown
                color={
                  isTopRanking ? colors.highlight : colors.muted_foreground
                }
                size={16}
                strokeWidth={1.4}
              />

              <Text
                className={cn(
                  "text-sm text-muted_foreground flex-1",
                  isTopRanking && "text-highlight"
                )}
              >
                Rank {rank}
              </Text>
            </View>
          </View>
          <View className="flex flex-row gap-x-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const fullStars = Math.floor(rating);
              const fraction = rating % 1;

              const isFull = i < fullStars;
              const isHalf =
                i === fullStars && fraction >= 0.4 && fraction < 0.7;
              const color =
                isFull || isHalf
                  ? colors.primary_dark
                  : colors.muted_foreground;
              const fill = isFull || isHalf ? colors.primary_dark : undefined;

              return isHalf ? (
                <StarHalf
                  key={`star-${i}`}
                  color={color}
                  fill={fill}
                  size={16}
                  strokeWidth={1.4}
                />
              ) : (
                <Star
                  key={`star-${i}`}
                  color={color}
                  fill={fill}
                  size={16}
                  strokeWidth={1.4}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
