import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { cn } from "@/lib/cn";
import Modal from "react-native-modal";
import Checkbox from "../checkbox";
import { Dispatch, SetStateAction } from "react";

export default function HistoryRemoveEntriesModal({
  entryToRemove,
  handleClose,
  removeAllChaptersFromEntry,
  setRemoveAllChaptersFromEntry,
  handleRemoveEntry,
}: {
  entryToRemove: { novelTitle: string; chapterNumber: number } | null;
  handleClose: () => void;
  removeAllChaptersFromEntry: boolean;
  setRemoveAllChaptersFromEntry: Dispatch<SetStateAction<boolean>>;
  handleRemoveEntry: () => void;
}) {
  return (
    <Modal
      isVisible={!!entryToRemove}
      onBackdropPress={handleClose}
      backdropTransitionOutTiming={1}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      <View className="w-11/12 rounded-xl bg-background p-6">
        <Text className="text-lg font-medium mb-2">Remove From History</Text>
        <Text className="text-muted_foreground/85">
          This action will reset the read date for this chapter in your reading
          history.
        </Text>

        <TouchableOpacity
          onPress={() => setRemoveAllChaptersFromEntry((prev) => !prev)}
          className="flex flex-row items-center gap-x-4 py-2 my-4"
        >
          <Checkbox
            status={removeAllChaptersFromEntry ? "checked" : "unchecked"}
          />
          <Text className="flex-1 text-muted_foreground">
            Apply reset for all chapters in this novel
          </Text>
        </TouchableOpacity>

        <View className="w-full flex flex-row justify-end gap-x-4">
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
            onPress={handleRemoveEntry}
          >
            <Text>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
