import { TouchableOpacity, View } from "react-native";
import { RefObject } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";

export default function ClearCacheDrawer({
  bottomDrawerRef,
  handleClearCache,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  handleClearCache: () => void;
}) {
  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Clear Cache</Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          This action will clear cached data used to improve performance and
          user experience.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={handleClearCache}
          >
            <Text>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={() => bottomDrawerRef.current?.dismiss()}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
