import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { DownloadChapter } from "@/types/download";
import { useCallback } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";

export default function NovelRemoveDownloadDrawer({
  bottomDrawerRef,
  chaptersToDelete,
  setChaptersToDelete,
  refetchNovelInfo,
}: {
  bottomDrawerRef: React.RefObject<BottomSheetModal | null>;
  chaptersToDelete: DownloadChapter[];
  setChaptersToDelete: (chapters: DownloadChapter[]) => void;
  refetchNovelInfo: () => void;
}) {
  const { mutate: removeDownloadChapters } = useMutation({
    mutationFn: (chapters: DownloadChapter[]) =>
      novelController.removeDownloadedNovelChapters({
        chapters,
      }),
    onSuccess: () => {
      refetchNovelInfo();
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
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-8 flex-1">
        <Text className="text-lg font-medium text-center">
          Delete Downloaded{" "}
          {chaptersToDelete.length > 1 ? "Chapters" : "Chapter"}
        </Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          You won't be able to read{" "}
          {chaptersToDelete.length > 1 ? "these chapters" : "this chapter"}{" "}
          without internet connection.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={handleDeleteChapters}
          >
            <Text>I Understand, Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={handleCancelDeleteChapters}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
