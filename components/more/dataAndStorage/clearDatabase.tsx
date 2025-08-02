import { Text } from "@/components/defaults";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { TouchableOpacity } from "react-native";
import ClearDatabaseDrawer from "./clearDatabaseDrawer";
import { useMutation } from "@tanstack/react-query";
import { invalidateQueries, resetCache } from "@/providers/reactQuery";
import { libraryController } from "@/server/controllers/library";

export default function ClearDatabase() {
  const bottomClearDatabaseDrawerRef = useRef<BottomSheetModal>(null);

  const {
    mutate: clearDatabaseMutation,
    isPending: isClearingDatabase,
  } = useMutation({
    mutationFn: () => libraryController.clearDatabase(),
    onSuccess: () => {
      invalidateQueries();
      resetCache();
      bottomClearDatabaseDrawerRef.current?.dismiss();
    },
  });

  return (
    <>
      <TouchableOpacity
        className="flex flex-col gap-y-2 p-4"
        onPress={() => bottomClearDatabaseDrawerRef.current?.present()}
      >
        <Text className="font-medium">Clear Database</Text>
        <Text className="text-grayscale_foreground">
          Remove all entries that are not saved in your library
        </Text>
      </TouchableOpacity>

      <ClearDatabaseDrawer
        bottomDrawerRef={bottomClearDatabaseDrawerRef}
        handleClearDatabase={clearDatabaseMutation}
        isClearingDatabase={isClearingDatabase}
      />
    </>
  );
}
