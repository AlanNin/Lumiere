import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { Chapter } from "@/types/novel";
import { cn } from "@/lib/cn";
import NovelDownloadChapter from "./novelDownloadChapter";
import { DownloadChapter } from "@/types/download";
import { Bookmark } from "lucide-react-native";
import { colors } from "@/lib/constants";
import React from "react";

export default React.memo(
  function NovelChapter({
    chapter,
    isDownloading,
    selectedChapters,
    onSelectChapter,
    onChapterPress,
    onDownloadPress,
  }: {
    chapter: Chapter;
    isDownloading: boolean;
    selectedChapters: Chapter[];
    onSelectChapter: (chapter: Chapter) => void;
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
    const chapterProgress = chapter.progress ?? 0;
    const isRead = chapter.progress === 100;
    const isBookmarked = chapter.bookMarked;
    const isSelected = selectedChapters.some(
      (c) => c.number === chapter.number
    );

    const chapterToDownloadChapter: DownloadChapter = React.useMemo(
      () => ({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        readingProgress: chapter.progress,
      }),
      [chapter.novelTitle, chapter.number, chapter.progress]
    );

    const handlePress = React.useCallback(() => {
      if (selectedChapters.length > 0) {
        onSelectChapter(chapter);
      } else {
        onChapterPress({
          chapterNumber: chapter.number,
          downloaded: chapter.downloaded,
        });
      }
    }, [selectedChapters.length, onSelectChapter, chapter, onChapterPress]);

    const handleLongPress = React.useCallback(() => {
      if (isDownloading) return;
      onSelectChapter(chapter);
    }, [onSelectChapter, chapter]);

    return (
      <TouchableOpacity
        className={cn(
          "flex flex-row items-center justify-between px-5 gap-x-8 ",
          isSelected ? "bg-layout_background/65" : "bg-background"
        )}
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        <View className="flex flex-row items-center gap-x-3 flex-1 py-4">
          <View className="flex flex-col gap-y-1 flex-1">
            <View className="flex flex-row gap-x-3 flex-1 items-center">
              {!isRead && <View className="w-2 h-2 bg-primary rounded-full" />}
              <View className="flex flex-row gap-x-1.5 flex-1 items-center">
                {isBookmarked && (
                  <Bookmark
                    size={14}
                    color={colors.secondary}
                    fill={colors.secondary}
                    strokeWidth={1.8}
                  />
                )}
                <Text
                  className={cn(
                    "tracking-wide text-muted_foreground",
                    isRead && "text-grayscale"
                  )}
                  numberOfLines={1}
                >
                  Chapter {chapter.number}
                  {chapter.title ? ` - ${chapter.title}` : ""}
                </Text>
              </View>
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
        </View>
        <NovelDownloadChapter
          chapter={chapterToDownloadChapter}
          isDownloaded={chapter.downloaded}
          isDownloading={isDownloading}
          onDownloadPress={onDownloadPress}
        />
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    const prevSelected = prevProps.selectedChapters.some(
      (c) => c.number === nextProps.chapter.number && c.progress === 100
    );

    const nextSelected = nextProps.selectedChapters.some(
      (c) => c.number === nextProps.chapter.number && c.progress === 100
    );
    return (
      prevProps.chapter.number === nextProps.chapter.number &&
      prevProps.chapter.progress === nextProps.chapter.progress &&
      prevProps.chapter.bookMarked === nextProps.chapter.bookMarked &&
      prevProps.chapter.downloaded === nextProps.chapter.downloaded &&
      prevProps.isDownloading === nextProps.isDownloading &&
      prevSelected === nextSelected &&
      prevProps.selectedChapters.length === nextProps.selectedChapters.length
    );
  }
);
