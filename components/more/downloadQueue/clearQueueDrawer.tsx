import { TouchableOpacity, View } from "react-native";
import { RefObject } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";

export default function ClearQueueDrawer({
  bottomDrawerRef,
  handleRemoveAll,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  handleRemoveAll: () => void;
}) {
  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Clear Queue</Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          You won't be able to read these chapters without internet connection.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={() => {
              handleRemoveAll();
              bottomDrawerRef.current?.dismiss();
            }}
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
