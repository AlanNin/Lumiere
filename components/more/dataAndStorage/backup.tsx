import { Text } from "@/components/defaults";
import AppBackupManager from "@/hooks/useBackup";
import { TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { reloadAppAsync } from "expo";
import { useRef, useState } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BackupRestoreDrawer from "./backupRestoreDrawer";
import { invalidateQueries } from "@/providers/reactQuery";
import { useMutation } from "@tanstack/react-query";

const backupManager = new AppBackupManager();

export default function BackupOptions() {
  const bottomConfirmRestoreDrawerRef = useRef<BottomSheetModal>(null);
  const [selectedBackup, setSelectedBackup] = useState<any>();

  const handleCreateBackup = async () => {
    await backupManager.createBackup();
  };

  const handleRestoreBackupPicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    setSelectedBackup(result);

    bottomConfirmRestoreDrawerRef.current?.present();
  };

  const {
    mutate: restoreBackupMutation,
    isPending: isRestoringBackup,
  } = useMutation({
    mutationFn: ({ backupFilePath }: { backupFilePath: string }) =>
      backupManager.restoreBackup(backupFilePath),
    onSuccess: () => {
      invalidateQueries();
      bottomConfirmRestoreDrawerRef.current?.dismiss();
    },
  });

  const handleRestoreBackup = async () => {
    const backupFilePath = await backupManager.importBackup(
      selectedBackup.assets[0].uri
    );
    restoreBackupMutation({ backupFilePath });
  };

  return (
    <View className="flex flex-row">
      <TouchableOpacity
        className="border border-r-0 border-grayscale rounded-l-3xl flex-1 flex items-center justify-center p-4"
        onPress={handleCreateBackup}
      >
        <Text> Create Backup</Text>
      </TouchableOpacity>
      <View className="h-full w-[1px] bg-grayscale" />
      <TouchableOpacity
        className="border border-l-0 border-grayscale rounded-r-3xl flex-1 flex items-center justify-center p-4"
        onPress={handleRestoreBackupPicker}
      >
        <Text>Restore Backup</Text>
      </TouchableOpacity>

      <BackupRestoreDrawer
        bottomDrawerRef={bottomConfirmRestoreDrawerRef}
        handleRestoreBackup={handleRestoreBackup}
        isRestoringBackup={isRestoringBackup}
      />
    </View>
  );
}
