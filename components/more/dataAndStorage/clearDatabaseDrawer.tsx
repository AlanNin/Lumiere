import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { RefObject } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function ClearDatabaseDrawer({
  bottomDrawerRef,
  handleClearDatabase,
  isClearingDatabase,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  handleClearDatabase: () => void;
  isClearingDatabase: boolean;
}) {
  return (
    <BottomDrawer ref={bottomDrawerRef} disableClose={isClearingDatabase}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Clear Database</Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          This action will delete all entries not saved in your library, cache
          will also be cleared.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className={cn(
              "bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center",
              isClearingDatabase && "opacity-75"
            )}
            onPress={() => {
              handleClearDatabase();
            }}
            disabled={isClearingDatabase}
          >
            {isClearingDatabase ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Text>Clear</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className={cn(
              "px-4 py-1 rounded-lg w-full flex items-center justify-center",
              isClearingDatabase && "opacity-75"
            )}
            onPress={() => bottomDrawerRef.current?.dismiss()}
            disabled={isClearingDatabase}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
