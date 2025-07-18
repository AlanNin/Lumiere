import { TouchableOpacity, View } from "react-native";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";
import { Category } from "@/types/category";
import { useMutation } from "@tanstack/react-query";
import { categoryController } from "@/server/controllers/category";
import { invalidateQueries } from "@/providers/reactQuery";
import { TextInput } from "react-native-gesture-handler";

export default function CategoryUpsertDrawer({
  bottomDrawerRef,
  onClose,
  categoryToUpdate,
}: {
  bottomDrawerRef: React.RefObject<BottomSheetModal | null>;
  onClose: () => void;
  categoryToUpdate?: Category;
}) {
  const [label, setLabel] = useState("");
  const isEditing = categoryToUpdate !== undefined;

  function handleClose() {
    onClose();
    setLabel("");
    bottomDrawerRef.current?.dismiss();
  }

  const { mutate: upsertCategory } = useMutation({
    mutationFn: () =>
      categoryController.upsertCategory({
        id: categoryToUpdate?.id,
        label: label.trim(),
      }),
    onSuccess: () => {
      invalidateQueries("library", "categories");
      handleClose();
    },
  });

  useEffect(() => {
    if (isEditing) {
      setLabel(categoryToUpdate.label);
    }
  }, [isEditing, categoryToUpdate]);

  return (
    <BottomDrawer ref={bottomDrawerRef} onClose={handleClose}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">
          {isEditing ? "Edit" : "Add"} Category
        </Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          Enter the label for this category.
        </Text>
        <View className="flex flex-col items-center gap-y-6 w-full flex-1">
          <BottomSheetTextInput
            placeholderTextColor={colors.muted_foreground + "90"}
            placeholder="Type here..."
            onChangeText={setLabel}
            value={label}
            className="text-foreground border border-muted_foreground/25 bg-muted_foreground/15 py-4 w-56 text-center rounded-lg"
            autoFocus={true}
          />
          <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
            <TouchableOpacity
              className={cn(
                "bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center",
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
            <TouchableOpacity
              className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
              onPress={handleClose}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomDrawer>
  );
}
