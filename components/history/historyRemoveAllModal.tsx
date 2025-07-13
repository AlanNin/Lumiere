import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { cn } from "@/lib/cn";
import Modal from "react-native-modal";

export default function HistoryRemoveAllModal({
  removeAllHistoryModal,
  handleClose,
  handleRemoveAllHistory,
}: {
  removeAllHistoryModal: boolean;
  handleClose: () => void;
  handleRemoveAllHistory: () => void;
}) {
  return (
    <Modal
      isVisible={removeAllHistoryModal}
      onBackdropPress={handleClose}
      backdropTransitionOutTiming={1}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      <View className="w-11/12 rounded-xl bg-background p-6">
        <Text className="text-lg font-medium mb-2">Remove All History</Text>
        <Text className="text-muted_foreground/85">
          This action will reset all entries in your reading history and can't
          be undone.
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
            onPress={handleRemoveAllHistory}
          >
            <Text>Remove All</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
