import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { Chapter } from "@/types/novel";
import { cn } from "@/lib/cn";
import NovelDownloadChapter from "./novelDownloadChapter";
import { DownloadChapter } from "@/types/download";

export default function NovelChapter({
  chapter,
  isDownloading,
  onChapterPress,
  onDownloadPress,
}: {
  chapter: Chapter;
  isDownloading: boolean;
  onChapterPress: ({
    chapterNumber,
    downloaded,
  }: {
    chapterNumber: number;
    downloaded?: boolean;
  }) => void;
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
  const chapterProgress = !!chapter.progress ? chapter.progress : 0;
  const isRead = chapter.progress === 100;

  const chapterToDownloadChapter: DownloadChapter = {
    novelTitle: chapter.novelTitle,
    chapterNumber: chapter.number,
    readingProgress: chapter.progress,
  };

  return (
    <View className="flex flex-row items-center justify-between px-5 py-3  gap-x-8 bg-background">
      <TouchableOpacity
        className="flex flex-row items-center gap-x-3 flex-1"
        onPress={() =>
          onChapterPress({
            chapterNumber: chapter.number,
            downloaded: chapter.downloaded,
          })
        }
      >
        <View className="flex flex-col gap-y-1 flex-1">
          <View className="flex flex-row gap-x-3 flex-1 items-center">
            {!isRead && <View className="w-2 h-2 bg-primary rounded-full" />}
            <Text
              className={cn(
                "tracking-wide ",
                isRead ? "text-grayscale" : "text-muted_foreground"
              )}
              numberOfLines={1}
            >
              Chapter {chapter.number}
              {chapter.title ? ` - ${chapter.title}` : ""}
            </Text>
          </View>
          {!isRead && chapterProgress > 0 && (
            <Text
              className="text-sm text-grayscale tracking-wide"
              numberOfLines={1}
            >
              Progress {chapter.progress}%
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <NovelDownloadChapter
        chapter={chapterToDownloadChapter}
        isDownloaded={chapter.downloaded}
        isDownloading={isDownloading}
        onDownloadPress={onDownloadPress}
      />
    </View>
  );
}
