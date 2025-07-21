import { TouchableOpacity, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";
import { Category } from "@/types/category";
import { RefObject } from "react";

export default function CategoryRemoveDrawer({
  bottomDrawerRef,
  categoryToDelete,
  handleRemoveCategory,
  onClose,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  categoryToDelete: Category | undefined;
  handleRemoveCategory: ({ categoryId }: { categoryId: number }) => void;
  onClose: () => void;
}) {
  function handleClose() {
    onClose();
    bottomDrawerRef.current?.dismiss();
  }

  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Remove Category</Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          This action unlinks all novels from this category and can't be undone.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={() => {
              handleRemoveCategory({ categoryId: categoryToDelete!.id });
              handleClose();
            }}
          >
            <Text>Remove</Text>
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
