import { TouchableOpacity, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";
import { RefObject } from "react";

export default function CategoryAZDrawer({
  bottomDrawerRef,
  sortCategoriesAlphabetically,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  sortCategoriesAlphabetically: () => void;
}) {
  function handleClose() {
    bottomDrawerRef.current?.dismiss();
  }

  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">
          Sort Alphabetically
        </Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          This action will sort your categories alphabetically (A-Z).
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={() => {
              sortCategoriesAlphabetically();
              handleClose();
            }}
          >
            <Text>Sort</Text>
          </TouchableOpacity>
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
