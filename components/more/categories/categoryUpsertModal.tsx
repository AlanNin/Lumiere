import { TextInput, TouchableOpacity, View } from "react-native";
import { cn } from "@/lib/cn";
import Modal from "react-native-modal";
import { Text } from "@/components/defaults";
import { useEffect, useRef, useState } from "react";
import { invalidateQueries } from "@/providers/reactQuery";
import { categoryController } from "@/server/controllers/category";
import { useMutation } from "@tanstack/react-query";
import { Category } from "@/types/category";

export default function CategoryUpsertModal({
  isOpen,
  handleClose,
  categoryToUpdate,
}: {
  isOpen: boolean;
  handleClose: () => void;
  categoryToUpdate?: Category;
}) {
  const isEditing = categoryToUpdate !== undefined;
  const [label, setLabel] = useState("");
  const inputRef = useRef<TextInput>(null);

  function onClose() {
    handleClose();
    setTimeout(() => setLabel(""), 300);
  }

  useEffect(() => {
    if (isEditing) {
      setLabel(categoryToUpdate.label);
    }
  }, [isEditing, categoryToUpdate]);

  const { mutate: upsertCategory } = useMutation({
    mutationFn: () =>
      categoryController.upsertCategory({
        id: categoryToUpdate?.id,
        label: label.trim(),
      }),
    onSuccess: () => {
      invalidateQueries("library", "categories");
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <Modal
      isVisible={isOpen}
      onBackdropPress={onClose}
      backdropTransitionOutTiming={1}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      <View className="w-11/12 rounded-xl bg-background p-6 flex flex-col gap-y-3">
        <Text className="text-lg font-medium">
          {isEditing ? "Edit" : "Add"} Category
        </Text>
        <TextInput
          ref={inputRef}
          className="text-foreground border border-muted_foreground/25 bg-muted_foreground/15 p-4 w-full rounded-lg"
          placeholder="Type Label"
          onChangeText={setLabel}
          value={label}
        />

        <View className="w-full flex flex-row justify-end gap-x-4 mt-3">
          <TouchableOpacity
            className="px-4 py-3 rounded-lg flex items-center justify-center"
            onPress={onClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={cn(
              "bg-primary text-primary_foreground px-8 py-3 rounded-lg flex items-center justify-center",
              (!label ||
                label.trim().length === 0 ||
                (isEditing && label === categoryToUpdate.label)) &&
                "opacity-75"
            )}
            disabled={
              !label ||
              label.trim().length === 0 ||
              (isEditing && label === categoryToUpdate.label)
            }
            onPress={() => upsertCategory()}
          >
            <Text>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
