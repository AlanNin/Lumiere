import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { ChapterHistory } from "@/types/history";
import { Image } from "expo-image";
import { Trash2 } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { useRouter } from "expo-router";
import { format } from "date-fns";

export default function HistoryCard({
  chapterHistory,
  openRemoveEntryDrawer,
}: {
  chapterHistory: ChapterHistory;
  openRemoveEntryDrawer: ({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }) => void;
}) {
  const router = useRouter();
  const {
    novelTitle,
    chapterNumber,
    readAt,
    novelCustomImage,
    novelImage,
    downloaded,
  } = chapterHistory;
  const coverUri = novelCustomImage ?? novelImage;
  const date = format(readAt, "hh:mm a");

  function handlePress() {
    router.push({
      pathname: "/novel/reader",
      params: { novelTitle, chapterNumber, downloaded: downloaded ? 1 : 0 },
    });
  }

  return (
    <TouchableOpacity
      className="flex flex-row gap-6 items-center"
      onPress={handlePress}
    >
      <Image
        cachePolicy="memory-disk"
        alt={`Cover of ${novelTitle}`}
        source={coverUri}
        style={{ aspectRatio: 1 / 1.5, height: 120, borderRadius: 6 }}
        contentFit="cover"
      />
      <View className="flex flex-col justify-center gap-2 flex-1">
        <Text
          className="text-lg font-medium text-muted_foreground/80"
          numberOfLines={3}
        >
          {novelTitle}
        </Text>
        <Text className="text-muted_foreground/75 tracking-wide">
          Ch. {chapterNumber} - {date}
        </Text>
      </View>
      <TouchableOpacity
        className="p-2 mr-1"
        onPress={() => openRemoveEntryDrawer({ novelTitle, chapterNumber })}
      >
        <Trash2 color={colors.muted_foreground} size={20} strokeWidth={1.4} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
