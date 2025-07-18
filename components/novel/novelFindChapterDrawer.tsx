import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useState } from "react";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function NovelFindChapterDrawer({
  bottomDrawerRef,
  maxChapters,
  handleFindChapter,
}: {
  bottomDrawerRef: React.RefObject<BottomSheetModal | null>;
  maxChapters: number;
  handleFindChapter: (chapterNumber: number) => void;
}) {
  const [chapterToFind, setChapterToFind] = useState<number | null>(null);

  function handleInputChange(value: string) {
    value = value.replace(/[.,]/g, "").replace(/^0+/, "");

    const num = Number(value);
    if (isNaN(num)) {
      setChapterToFind(null);
      return;
    }

    if (num < 1) {
      setChapterToFind(null);
    } else if (num > maxChapters) {
      setChapterToFind(maxChapters);
    } else {
      setChapterToFind(num);
    }
  }

  function handleCancel() {
    setChapterToFind(null);
    bottomDrawerRef.current?.dismiss();
  }

  function handleFind() {
    if (chapterToFind) {
      handleFindChapter(chapterToFind);
    }
    setChapterToFind(null);
    bottomDrawerRef.current?.dismiss();
  }

  return (
    <BottomDrawer ref={bottomDrawerRef} onClose={() => setChapterToFind(null)}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Find Chapter</Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          Enter the number of the chapter you want to find.
        </Text>
        <View className="flex flex-col items-center gap-y-6 w-full flex-1">
          <BottomSheetTextInput
            value={chapterToFind ? String(chapterToFind) : ""}
            onChangeText={(value) => handleInputChange(value)}
            placeholderTextColor={colors.muted_foreground + "90"}
            placeholder={`Enter Chapter (1 - ${maxChapters})`}
            className="text-foreground border border-muted_foreground/25 bg-muted_foreground/15 py-4 w-56 text-center rounded-lg"
            maxLength={String(maxChapters).length}
            keyboardType="numeric"
          />
          <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
            <TouchableOpacity
              className={cn(
                "bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center",
                !chapterToFind && "opacity-75"
              )}
              disabled={!chapterToFind}
              onPress={handleFind}
            >
              <Text>Find</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
              onPress={handleCancel}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomDrawer>
  );
}
