import { RefObject, useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import BottomDrawer from '../bottomDrawer';
import { Text } from '../defaults';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker';
import { cn } from '@/lib/cn';
import { colors } from '@/lib/constants';
import { QueueDownloadItem } from '@/providers/chapterDownloadQueue';
import { Chapter } from '@/types/novel';
import { DownloadChapter } from '@/types/download';
import { novelController } from '@/server/controllers/novel';
import { useMutation } from '@tanstack/react-query';
import { invalidateQueries } from '@/providers/reactQuery';

const DEFAULT_DOWNLOAD_MODE_OPTIONS: {
  label: string;
  value: string;
}[] = [
  { label: 'Next Chapter', value: 'next' },
  { label: 'Next 5 Chapter', value: 'next-5' },
  { label: 'Next 10 Chapter', value: 'next-10' },
  { label: 'Unread', value: 'unread' },
  { label: 'All', value: 'all' },
  { label: 'Custom', value: 'custom' },
  { label: 'Remove All', value: 'remove-all' },
];

export default function NovelDownloadChaptersDrawer({
  bottomDrawerRef,
  novelTitle,
  isNovelSaved,
  chapters,
  currentChapter,
  maxChapters,
  allChaptersCompleted,
  hasDownloadedChapters,
  queueDownload,
  enqueueDownload,
  refetchNovelInfo,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  novelTitle: string;
  isNovelSaved: boolean;
  chapters: Chapter[];
  currentChapter: number;
  maxChapters: number;
  allChaptersCompleted: boolean;
  hasDownloadedChapters: boolean;
  queueDownload: QueueDownloadItem[];
  enqueueDownload: (chapters: DownloadChapter[], priority?: number) => void;
  refetchNovelInfo: () => void;
}) {
  // helpers
  const getNextUndownloadedChapter = useCallback(() => {
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);
    const nextUndownloaded = sortedChapters.find(
      (chapter) => chapter.number >= currentChapter && !Boolean(chapter.downloaded)
    );
    return nextUndownloaded?.number || currentChapter;
  }, [chapters, currentChapter]);

  const getLastDownloadedChapter = useCallback(() => {
    const downloadedChapters = chapters
      .filter((chapter) => Boolean(chapter.downloaded))
      .sort((a, b) => b.number - a.number);
    return downloadedChapters[0]?.number || 0;
  }, [chapters]);

  const isInQueue = useCallback(
    (num: number) =>
      queueDownload.some((q) => q.novelTitle === novelTitle && q.chapterNumber === num),
    [queueDownload, novelTitle]
  );

  const getStartForNext = useCallback(() => {
    const current = chapters.find((c) => c.number === currentChapter);
    const downloaded = current ? Boolean(current.downloaded) : false;
    return downloaded ? getLastDownloadedChapter() + 1 : getNextUndownloadedChapter();
  }, [chapters, currentChapter, getLastDownloadedChapter, getNextUndownloadedChapter]);

  const getNextNChapters = useCallback(
    (startFrom: number, count: number): Chapter[] => {
      const sorted = [...chapters].sort((a, b) => a.number - b.number);
      const result: Chapter[] = [];
      for (const c of sorted) {
        if (c.number < startFrom) continue;
        if (Boolean(c.downloaded)) continue;
        if (isInQueue(c.number)) continue;
        result.push(c);
        if (result.length === count) break;
      }
      return result;
    },
    [chapters, isInQueue]
  );

  const isChapterUnread = useCallback((c: Chapter) => {
    if (!c.progress || c.progress < 100) {
      return true;
    }
    return false;
  }, []);

  const DOWNLOAD_MODE_OPTIONS = DEFAULT_DOWNLOAD_MODE_OPTIONS.filter((opt) => {
    if (allChaptersCompleted) {
      if (opt.value === 'unread' || opt.value.startsWith('next')) {
        return false;
      }
    }

    if (!hasDownloadedChapters && opt.value === 'remove-all') {
      return false;
    }

    const allDownloaded = chapters.every((chapter) => Boolean(chapter.downloaded));
    if (allDownloaded && opt.value !== 'remove-all') {
      return false;
    }

    if (opt.value.startsWith('next')) {
      const parts = opt.value.split('-');
      const count = parts.length === 1 ? 1 : parseInt(parts[1], 10);
      const startFrom = getStartForNext();
      const availableCandidates = chapters.filter(
        (chapter) =>
          chapter.number >= startFrom && !Boolean(chapter.downloaded) && !isInQueue(chapter.number)
      );
      return availableCandidates.length >= count;
    }

    if (opt.value === 'unread') {
      const hasUnread = chapters.some((chapter) => isChapterUnread(chapter));
      return hasUnread;
    }

    if (opt.value === 'all') {
      return chapters.some((chapter) => !Boolean(chapter.downloaded) && !isInQueue(chapter.number));
    }

    return true;
  });

  const { mutate: removeAllDownloadedChaptersFromNovels } = useMutation({
    mutationFn: () =>
      novelController.removeAllDownloadedChaptersFromNovels({
        novelTitles: [novelTitle],
      }),
    onSuccess: () => {
      invalidateQueries(['novel-info', novelTitle], ['novel-chapter', novelTitle]);

      if (isNovelSaved) {
        invalidateQueries(['library']);
      }
    },
  });

  const [selectedDownloadMode, setSelectedDownloadMode] = useState<string>(
    DOWNLOAD_MODE_OPTIONS[0]?.value || 'remove-all'
  );
  const [customFrom, setCustomFrom] = useState<number | null>(null);
  const [customTo, setCustomTo] = useState<number | null>(null);

  const handleCustomFromChange = useCallback(
    (value: string) => {
      value = value.replace(/[.,]/g, '').replace(/^0+/, '');
      const num = Number(value);
      if (isNaN(num)) {
        setCustomFrom(null);
        return;
      }
      setCustomFrom(num);
      if (customTo === null || customTo < num) {
        if (num === 0) {
          return;
        }
        if (num < maxChapters) {
          setCustomTo(num + 1);
        } else {
          setCustomTo(num);
        }
      }
    },
    [customTo, maxChapters]
  );

  const handleCustomToChange = useCallback(
    (value: string) => {
      value = value.replace(/[.,]/g, '').replace(/^0+/, '');
      const num = Number(value);
      if (isNaN(num)) {
        setCustomTo(null);
        return;
      }
      if (num < 1) {
        setCustomTo(null);
      } else if (num > maxChapters) {
        setCustomTo(maxChapters);
      } else {
        setCustomTo(num);
      }
      if (customFrom === null || customFrom > num) {
        if (num === 0) {
          return;
        }
        if (num > 1) {
          setCustomFrom(num - 1);
        } else {
          setCustomFrom(num);
        }
      }
    },
    [customFrom, maxChapters]
  );

  const isDeleteDownloads = selectedDownloadMode === 'remove-all';
  const isCustom = selectedDownloadMode === 'custom';

  const handleReset = useCallback(() => {
    setSelectedDownloadMode(DOWNLOAD_MODE_OPTIONS[0]?.value || 'remove-all');
    setCustomFrom(null);
    setCustomTo(null);
  }, [DOWNLOAD_MODE_OPTIONS]);

  const handleConfirm = useCallback(() => {
    let toQueue: Chapter[] = [];

    if (isDeleteDownloads) {
      removeAllDownloadedChaptersFromNovels();
    } else {
      switch (selectedDownloadMode) {
        case 'next': {
          const start = getStartForNext();
          toQueue = getNextNChapters(start, 1);
          break;
        }
        case 'next-5':
        case 'next-10': {
          const count = Number(selectedDownloadMode.split('-')[1]);
          const start = getStartForNext();
          toQueue = getNextNChapters(start, count);
          break;
        }
        case 'unread':
          toQueue = chapters.filter(
            (c) => isChapterUnread(c) && !Boolean(c.downloaded) && !isInQueue(c.number)
          );
          break;
        case 'all':
          toQueue = chapters.filter((c) => !Boolean(c.downloaded) && !isInQueue(c.number));
          break;
        case 'custom':
          if (customFrom != null && customTo != null) {
            toQueue = chapters.filter(
              (c) =>
                c.number >= customFrom &&
                c.number <= customTo &&
                !Boolean(c.downloaded) &&
                !isInQueue(c.number)
            );
          }
          break;
      }
    }

    if (toQueue.length > 0) {
      const downloadChapters: DownloadChapter[] = toQueue.map((c) => ({
        chapterNumber: c.number,
        chapterTitle: c.title,
        novelTitle: c.novelTitle,
        isNovelSaved: isNovelSaved,
      }));
      enqueueDownload(downloadChapters);
      handleReset();
    }

    bottomDrawerRef.current?.dismiss();
  }, [
    isDeleteDownloads,
    selectedDownloadMode,
    getStartForNext,
    getNextNChapters,
    chapters,
    isChapterUnread,
    isInQueue,
    customFrom,
    customTo,
    enqueueDownload,
    handleReset,
    novelTitle,
    removeAllDownloadedChaptersFromNovels,
  ]);

  const handleClose = useCallback(() => {
    handleReset();
    bottomDrawerRef.current?.dismiss();
  }, [handleReset]);

  return (
    <BottomDrawer ref={bottomDrawerRef} onClose={handleReset}>
      <View className="flex flex-1 flex-col items-center justify-center gap-y-2 pb-4 text-center">
        <Text className="text-center text-lg font-medium">
          {!isDeleteDownloads ? 'Download Chapters' : 'Remove Chapters'}
        </Text>
        <Text className="mx-2 mb-4 text-center text-muted_foreground/85">
          {!isDeleteDownloads
            ? "Select how you'd like to save them for offline reading."
            : "You won't be able to read these chapters without internet connection."}
        </Text>
        <View className="flex w-full flex-1 flex-col items-center gap-y-6">
          <Picker
            selectedValue={selectedDownloadMode}
            onValueChange={(value) => {
              if (customFrom) {
                setCustomFrom(null);
              }
              if (customTo) {
                setCustomTo(null);
              }
              setSelectedDownloadMode(value);
            }}
            style={{
              width: 200,
              backgroundColor: colors.muted_foreground + '25',
            }}
            enabled={DOWNLOAD_MODE_OPTIONS.length > 1}>
            {DOWNLOAD_MODE_OPTIONS.map((opt) => (
              <Picker.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
                style={{
                  color: colors.foreground,
                }}
              />
            ))}
          </Picker>

          {isCustom && (
            <View className="flex flex-row items-center gap-x-4">
              <BottomSheetTextInput
                value={customFrom ? String(customFrom) : ''}
                onChangeText={(value) => handleCustomFromChange(value)}
                placeholderTextColor={colors.muted_foreground + '90'}
                placeholder="From (1)"
                className="w-28 rounded-lg border border-muted_foreground/75 bg-muted_foreground/15 py-4 text-center text-foreground"
                maxLength={String(maxChapters).length}
                keyboardType="numeric"
              />
              <Text className="text-center text-muted_foreground/75">-</Text>
              <BottomSheetTextInput
                value={customTo ? String(customTo) : ''}
                onChangeText={(value) => handleCustomToChange(value)}
                placeholderTextColor={colors.muted_foreground + '90'}
                placeholder={`To (${maxChapters})`}
                className="w-28 rounded-lg border border-muted_foreground/75 bg-muted_foreground/15 py-4 text-center text-foreground"
                maxLength={String(maxChapters).length}
                keyboardType="numeric"
              />
            </View>
          )}

          <View className="flex w-full flex-1 flex-col items-center gap-y-4 px-16">
            <TouchableOpacity
              className={cn(
                'flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-primary_foreground'
              )}
              onPress={handleConfirm}>
              <Text>{!isDeleteDownloads ? 'Download' : 'Remove'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex w-full items-center justify-center rounded-lg px-4 py-1"
              onPress={handleClose}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomDrawer>
  );
}
