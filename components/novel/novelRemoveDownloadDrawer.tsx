import { TouchableOpacity, View } from 'react-native';
import BottomDrawer from '../bottomDrawer';
import { Text } from '../defaults';
import { DownloadChapter } from '@/types/download';
import { RefObject, useCallback } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMutation } from '@tanstack/react-query';
import { novelController } from '@/server/controllers/novel';
import { invalidateQueries } from '@/providers/reactQuery';

export default function NovelRemoveDownloadDrawer({
  bottomDrawerRef,
  chaptersToDelete,
  setChaptersToDelete,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  chaptersToDelete: DownloadChapter[];
  setChaptersToDelete: (chapters: DownloadChapter[]) => void;
}) {
  const { mutate: removeDownloadChapters } = useMutation({
    mutationFn: (chapters: DownloadChapter[]) =>
      novelController.removeDownloadedNovelChapters({
        chapters,
      }),
    onSuccess: (_data, variables) => {
      for (const chapter of variables) {
        invalidateQueries(
          ['novel-info', chapter.novelTitle],
          ['novel-chapter', chapter.novelTitle, chapter.chapterNumber]
        );

        if (chapter.isNovelSaved) {
          invalidateQueries(['library']);
        }
      }
    },
  });

  const handleDeleteChapters = useCallback(() => {
    removeDownloadChapters(chaptersToDelete);
    setChaptersToDelete([]);
    bottomDrawerRef.current?.dismiss();
  }, [removeDownloadChapters, bottomDrawerRef, chaptersToDelete]);

  const handleCancelDeleteChapters = useCallback(() => {
    setChaptersToDelete([]);
    bottomDrawerRef.current?.dismiss();
  }, [bottomDrawerRef]);

  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-1 flex-col items-center justify-center gap-y-2 pb-4 text-center">
        <Text className="text-center text-lg font-medium">
          Remove {chaptersToDelete.length > 1 ? 'Chapters' : 'Chapter'}
        </Text>
        <Text className="mx-2 mb-4 text-center text-muted_foreground/85">
          You won't be able to read{' '}
          {chaptersToDelete.length > 1 ? 'these chapters' : 'this chapter'} without internet
          connection.
        </Text>
        <View className="flex w-full flex-1 flex-col items-center gap-y-4 px-16">
          <TouchableOpacity
            className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-primary_foreground"
            onPress={handleDeleteChapters}>
            <Text>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex w-full items-center justify-center rounded-lg px-4 py-1"
            onPress={handleCancelDeleteChapters}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
