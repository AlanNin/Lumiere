import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { RefObject } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { Text } from "@/components/defaults";
import { colors } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function BackupRestoreDrawer({
  bottomDrawerRef,
  handleRestoreBackup,
  isRestoringBackup,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  handleRestoreBackup: () => void;
  isRestoringBackup: boolean;
}) {
  return (
    <BottomDrawer ref={bottomDrawerRef} disableClose={isRestoringBackup}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Restore Backup</Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          Are you sure you want to restore your data from this backup? This
          action will replace all existing data.
        </Text>
        <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
          <TouchableOpacity
            className={cn(
              "bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center",
              isRestoringBackup && "opacity-75"
            )}
            onPress={() => {
              handleRestoreBackup();
            }}
            disabled={isRestoringBackup}
          >
            {isRestoringBackup ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Text>Restore</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className={cn(
              "px-4 py-1 rounded-lg w-full flex items-center justify-center",
              isRestoringBackup && "opacity-75"
            )}
            onPress={() => bottomDrawerRef.current?.dismiss()}
            disabled={isRestoringBackup}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
