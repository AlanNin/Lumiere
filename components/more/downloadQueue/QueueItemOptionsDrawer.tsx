import { TouchableOpacity, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { RefObject } from "react";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";
import { QueueDownloadItem } from "@/hooks/useChapterDownloadQueue";

export default function QueueItemOptionsDrawer({
  bottomDrawerRef,
  selectedQueueItem,
  setSelectedQueueItem,
  moveUp,
  moveDown,
  moveToTop,
  moveToBottom,
  moveNovelToTop,
  moveNovelToBottom,
  cancelDownload,
  cancelNovelDownloads,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  selectedQueueItem: QueueDownloadItem | undefined;
  setSelectedQueueItem: (item: QueueDownloadItem | undefined) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  moveToTop: (id: string) => void;
  moveToBottom: (id: string) => void;
  moveNovelToTop: (novelTitle: string) => void;
  moveNovelToBottom: (novelTitle: string) => void;
  cancelDownload: (id: string) => void;
  cancelNovelDownloads: (novelTitle: string) => void;
}) {
  const OPTIONS = [
    {
      key: "move-up",
      label: "Move Up",
      onPress: () => moveUp(String(selectedQueueItem?.id)),
    },
    {
      key: "move-down",
      label: "Move Down",
      onPress: () => moveDown(String(selectedQueueItem?.id)),
    },
    {
      key: "move-to-top",
      label: "Move To Top",
      onPress: () => moveToTop(String(selectedQueueItem?.id)),
    },
    {
      key: "move-to-bottom",
      label: "Move To Bottom",
      onPress: () => moveToBottom(String(selectedQueueItem?.id)),
    },
    {
      key: "move-novel-to-top",
      label: "Move Novel To Top",
      onPress: () => moveNovelToTop(String(selectedQueueItem?.novelTitle)),
    },
    {
      key: "move-novel-to-bottom",
      label: "Move Novel To Bottom",
      onPress: () => moveNovelToBottom(String(selectedQueueItem?.novelTitle)),
    },
    {
      key: "cancel",
      label: "Cancel",
      onPress: () => cancelDownload(String(selectedQueueItem?.id)),
    },
    {
      key: "cancel-all-novel",
      label: "Cancel All For This Novel",
      onPress: () =>
        cancelNovelDownloads(String(selectedQueueItem?.novelTitle)),
    },
  ];

  function handleClose() {
    setSelectedQueueItem(undefined);
    bottomDrawerRef.current?.dismiss();
  }

  return (
    <BottomDrawer
      ref={bottomDrawerRef}
      onClose={() => setSelectedQueueItem(undefined)}
    >
      <View className="flex flex-col gap-y-4 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Options</Text>
        <View className="flex flex-col gap-y-4 w-full px-12">
          {OPTIONS.map((option) => (
            <TouchableOpacity
              className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
              key={option.key}
              onPress={() => {
                option.onPress();
                handleClose();
              }}
            >
              <Text className="text-center">{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
