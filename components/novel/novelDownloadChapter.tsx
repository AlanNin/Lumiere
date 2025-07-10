import { cn } from "@/lib/cn";
import { colors } from "@/lib/constants";
import { DownloadChapter } from "@/types/download";
import { ArrowDown, Check } from "lucide-react-native";
import { TouchableOpacity, View, ActivityIndicator } from "react-native";

export default function NovelDownloadChapter({
  chapter,
  isDownloaded,
  isDownloading,
  onDownloadPress,
}: {
  chapter: DownloadChapter;
  isDownloaded: boolean | undefined;
  isDownloading: boolean;
  onDownloadPress: ({
    chapter,
    isDownloaded,
    isDownloading,
  }: {
    chapter: DownloadChapter;
    isDownloaded: boolean | undefined;
    isDownloading: boolean;
  }) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() =>
        onDownloadPress({
          chapter: chapter,
          isDownloaded: isDownloaded,
          isDownloading: isDownloading,
        })
      }
      activeOpacity={0.7}
      disabled={isDownloading}
      className="py-4"
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: isDownloaded || isDownloading ? 0 : 1,
        }}
        className={cn(
          "flex items-center justify-center border rounded-full",
          isDownloaded && !isDownloading && "bg-primary",
          !isDownloaded && !isDownloading && "border-grayscale",
          chapter.readingProgress === 100 && "opacity-75"
        )}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.grayscale} />
        ) : isDownloaded ? (
          <Check size={12} color={colors.foreground} strokeWidth={2} />
        ) : (
          <ArrowDown size={12} color={colors.grayscale} strokeWidth={2} />
        )}
      </View>
    </TouchableOpacity>
  );
}
