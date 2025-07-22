import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { RefObject, useState } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation } from "@tanstack/react-query";
import { historyController } from "@/server/controllers/history";
import { invalidateQueries } from "@/providers/reactQuery";
import Checkbox from "../checkbox";

export default function HistoryRemoveEntriesDrawer({
  bottomDrawerRef,
  entryToRemove,
  setEntryToRemove,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  entryToRemove: { novelTitle: string; chapterNumber: number } | null;
  setEntryToRemove: (
    entry: { novelTitle: string; chapterNumber: number } | null
  ) => void;
}) {
  const [removeAllChaptersFromEntry, setRemoveAllChaptersFromEntry] = useState(
    false
  );

  function handleResetRemoveEntryStates() {
    setEntryToRemove(null);
    setRemoveAllChaptersFromEntry(false);
  }

  const { mutate: removeChapterFromHistory } = useMutation({
    mutationFn: ({
      novelTitle,
      chapterNumber,
    }: {
      novelTitle: string;
      chapterNumber: number;
    }) =>
      historyController.removeChapterFromHistory({
        novelTitle,
        chapterNumber,
      }),
    onSuccess: () => {
      invalidateQueries("history");
      handleResetRemoveEntryStates();
      bottomDrawerRef.current?.dismiss();
    },
  });

  const { mutate: removeNovelFromHistory } = useMutation({
    mutationFn: ({ novelTitle }: { novelTitle: string }) =>
      historyController.removeNovelFromHistory({
        novelTitle,
      }),
    onSuccess: () => {
      invalidateQueries("history");
      handleResetRemoveEntryStates();
      bottomDrawerRef.current?.dismiss();
    },
  });

  function handleRemoveEntry() {
    if (!entryToRemove) return;

    if (removeAllChaptersFromEntry) {
      removeNovelFromHistory({ novelTitle: entryToRemove.novelTitle });
    } else {
      removeChapterFromHistory({
        novelTitle: entryToRemove.novelTitle,
        chapterNumber: entryToRemove.chapterNumber,
      });
    }
  }

  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">
          Remove From History
        </Text>
        <Text className="text-muted_foreground/85 text-center mx-2">
          This action will reset the read date for this chapter in your reading
          history.
        </Text>
        <TouchableOpacity
          onPress={() => setRemoveAllChaptersFromEntry((prev) => !prev)}
          className="flex-1 flex flex-row items-center justify-center gap-x-4 py-2 mt-2 mb-4"
        >
          <Checkbox
            status={removeAllChaptersFromEntry ? "checked" : "unchecked"}
          />
          <Text className="text-center text-muted_foreground">
            Apply reset for all chapters in this novel
          </Text>
        </TouchableOpacity>

        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={handleRemoveEntry}
          >
            <Text>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={() => bottomDrawerRef.current?.dismiss()}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
