import { TouchableOpacity, View } from "react-native";
import { cn } from "@/lib/cn";
import Modal from "react-native-modal";
import { Text } from "@/components/defaults";
import { Category } from "@/types/category";

export default function CategoryRemoveModal({
  categoryToDelete,
  handleClose,
  handleRemoveCategory,
}: {
  categoryToDelete: Category | undefined;
  handleClose: () => void;
  handleRemoveCategory: ({ categoryId }: { categoryId: number }) => void;
}) {
  return (
    <Modal
      isVisible={categoryToDelete !== undefined}
      onBackdropPress={handleClose}
      backdropTransitionOutTiming={1}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      <View className="w-11/12 rounded-xl bg-background p-6">
        <Text className="text-lg font-medium mb-2">Remove Category</Text>
        <Text className="text-muted_foreground/85">
          This action unlinks all novels from this category and can't be undone.
        </Text>

        <View className="w-full flex flex-row justify-end gap-x-4 mt-6">
          <TouchableOpacity
            className="px-4 py-3 rounded-lg flex items-center justify-center"
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={cn(
              "bg-primary text-primary_foreground px-8 py-3 rounded-lg flex items-center justify-center"
            )}
            onPress={() => {
              handleRemoveCategory({ categoryId: categoryToDelete!.id });
              handleClose();
            }}
          >
            <Text>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
