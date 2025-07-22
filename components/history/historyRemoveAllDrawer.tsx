import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { RefObject } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation } from "@tanstack/react-query";
import { historyController } from "@/server/controllers/history";
import { invalidateQueries } from "@/providers/reactQuery";

export default function HistoryRemoveAllDrawer({
  bottomDrawerRef,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
}) {
  const { mutate: removeAllHistory } = useMutation({
    mutationFn: () => historyController.removeAllHistory(),
    onSuccess: () => {
      invalidateQueries("history");
      bottomDrawerRef.current?.dismiss();
    },
  });

  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">
          Remove All History
        </Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          This action will reset all entries in your reading history and can't
          be undone.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={() => removeAllHistory()}
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
