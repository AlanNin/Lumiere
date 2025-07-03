import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { CircleArrowDown } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { Chapter } from "@/types/novel";

export default function NovelChapter({
  chapter,
  onPress,
}: {
  chapter: Chapter;
  onPress: (chapterNumber: number) => void;
}) {
  return (
    <TouchableOpacity
      className="flex flex-row items-center justify-between px-5 py-3 mb-2 gap-x-6"
      onPress={() => onPress(chapter.number)}
    >
      <View className="flex flex-row items-center gap-x-3 flex-1">
        <View className="w-2 h-2 bg-primary rounded-full" />
        <Text
          className="text-muted_foreground tracking-wide flex-1"
          numberOfLines={1}
        >
          Chapter {chapter.number}
          {chapter.title ? ` - ${chapter.title}` : ""}
        </Text>
      </View>
      <CircleArrowDown size={24} color={colors.grayscale} strokeWidth={1.4} />
    </TouchableOpacity>
  );
}
