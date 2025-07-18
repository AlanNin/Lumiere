import { TouchableOpacity, View } from "react-native";
import { cn } from "@/lib/cn";
import Modal from "react-native-modal";
import { Text } from "@/components/defaults";

export default function CategoryAZModal({
  isOpen,
  handleClose,
  sortCategoriesAlphabetically,
}: {
  isOpen: boolean;
  handleClose: () => void;
  sortCategoriesAlphabetically: () => void;
}) {
  return (
    <Modal
      isVisible={isOpen}
      onBackdropPress={handleClose}
      backdropTransitionOutTiming={1}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      <View className="w-11/12 rounded-xl bg-background p-6">
        <Text className="text-lg font-medium mb-2">Sort Alphabetically</Text>
        <Text className="text-muted_foreground/85">
          This action will sort your categories alphabetically (A-Z).
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
              sortCategoriesAlphabetically();
              handleClose();
            }}
          >
            <Text>Sort</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
