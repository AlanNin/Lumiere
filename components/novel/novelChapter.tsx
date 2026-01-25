import { TouchableOpacity, View } from 'react-native';
import { Text } from '../defaults';
import { Chapter } from '@/types/novel';
import { cn } from '@/lib/cn';
import NovelDownloadChapter from './novelDownloadChapter';
import { DownloadChapter } from '@/types/download';
import { Bookmark } from 'lucide-react-native';
import { colors } from '@/lib/constants';
import { memo, useCallback, useMemo } from 'react';

export default memo(
  function NovelChapter({
    chapter,
    isDownloading,
    selectedChapters,
    isHighlighted,
    onSelectChapter,
    onChapterPress,
    onDownloadPress,
    isNovelSaved,
  }: {
    chapter: Chapter;
    isDownloading: boolean;
    selectedChapters: Chapter[];
    isHighlighted: boolean;
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
    isNovelSaved: boolean;
  }) {
    const chapterProgress = chapter.progress ?? 0;
    const isRead = chapter.progress === 100;
    const isBookmarked = chapter.bookMarked;
    const isSelected = selectedChapters.some((c) => c.number === chapter.number);

    const chapterToDownloadChapter: DownloadChapter = useMemo(
      () => ({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        readingProgress: chapter.progress,
        isNovelSaved: isNovelSaved,
      }),
      [chapter.novelTitle, chapter.number, chapter.progress]
    );

    const handlePress = useCallback(() => {
      if (selectedChapters.length > 0) {
        onSelectChapter(chapter);
      } else {
        onChapterPress({
          chapterNumber: chapter.number,
          downloaded: chapter.downloaded,
        });
      }
    }, [selectedChapters.length, onSelectChapter, chapter, onChapterPress]);

    const handleLongPress = useCallback(() => {
      if (isDownloading) return;
      onSelectChapter(chapter);
    }, [onSelectChapter, chapter]);

    return (
      <TouchableOpacity
        className={cn(
          'flex flex-row items-center justify-between gap-x-8 px-5 ',
          isSelected
            ? 'bg-layout_background/65'
            : isHighlighted
              ? 'bg-secondary/15'
              : 'bg-background'
        )}
        onPress={handlePress}
        onLongPress={handleLongPress}>
        <View className="flex flex-1 flex-row items-center gap-x-3 py-4">
          <View className="flex flex-1 flex-col gap-y-1">
            <View className="flex flex-1 flex-row items-center gap-x-3">
              {!isRead && <View className="h-2 w-2 rounded-full bg-primary" />}
              <View className="flex flex-1 flex-row items-center gap-x-1.5">
                {isBookmarked && (
                  <Bookmark
                    size={14}
                    color={colors.secondary}
                    fill={colors.secondary}
                    strokeWidth={1.8}
                  />
                )}
                <Text
                  className={cn('tracking-wide text-muted_foreground', isRead && 'text-grayscale')}
                  numberOfLines={1}>
                  Chapter {chapter.number}
                  {chapter.title ? ` - ${chapter.title}` : ''}
                </Text>
              </View>
            </View>
            {!isRead && chapterProgress > 0 && (
              <Text className="text-sm tracking-wide text-grayscale" numberOfLines={1}>
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
      prevProps.isHighlighted === nextProps.isHighlighted &&
      prevSelected === nextSelected &&
      prevProps.selectedChapters.length === nextProps.selectedChapters.length
    );
  }
);
