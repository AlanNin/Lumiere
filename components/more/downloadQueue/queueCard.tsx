import { Text } from "@/components/defaults";
import { QueueDownloadItem } from "@/hooks/useChapterDownloadQueue";
import { colors } from "@/lib/constants";
import { Ellipsis } from "lucide-react-native";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

export default function GroupQueueCard({
  item,
  openItemOptionsDrawer,
}: {
  item: QueueDownloadItem;
  openItemOptionsDrawer: (item: QueueDownloadItem) => void;
}) {
  return (
    <View className="mb-8 flex flex-row items-center justify-between gap-x-4 -mr-2">
      <View className="flex flex-row gap-x-3 flex-1">
        {item.status === "downloading" && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        <View className="flex flex-col gap-y-2">
          <Text className="text-muted_foreground font-medium">
            {item.novelTitle}
          </Text>
          <Text className="text-muted_foreground/85">
            Chapter {item.chapterNumber}{" "}
            {item.chapterTitle ? `- ${item.chapterTitle}` : ""}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className="p-2"
        onPress={() => openItemOptionsDrawer(item)}
      >
        <Ellipsis size={16} strokeWidth={1.6} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}
