import { Text } from "@/components/defaults";
import { colors } from "@/lib/constants";
import * as FileSystem from "expo-file-system";
import { useEffect, useState } from "react";
import { View } from "react-native";

type StorageInfo = {
  appUsed: number;
  deviceUsed: number;
  deviceFree: number;
  deviceTotal: number;
  loading: boolean;
  error: string | null;
};

export default function StorageUsageBar() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    appUsed: 0,
    deviceUsed: 0,
    deviceFree: 0,
    deviceTotal: 0,
    loading: true,
    error: null,
  });

  const getDirectorySize = async (dirPath: string): Promise<number> => {
    try {
      let totalSize = 0;
      const items = await FileSystem.readDirectoryAsync(dirPath);

      for (const item of items) {
        const itemPath = `${dirPath}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath, {
          size: true,
        });

        if (itemInfo.exists) {
          if (itemInfo.isDirectory) {
            totalSize += await getDirectorySize(itemPath + "/");
          } else {
            totalSize += itemInfo.size || 0;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return 0;
    }
  };

  useEffect(() => {
    const getAppStorageSize = async (): Promise<number> => {
      let totalSize = 0;

      try {
        if (FileSystem.documentDirectory) {
          const docDirSize = await getDirectorySize(
            FileSystem.documentDirectory
          );
          totalSize += docDirSize;
        }

        if (FileSystem.cacheDirectory) {
          const cacheDirInfo = await FileSystem.getInfoAsync(
            FileSystem.cacheDirectory,
            { size: true }
          );
          if (cacheDirInfo.exists && cacheDirInfo.size) {
            totalSize += cacheDirInfo.size;
          }
        }
      } catch (error) {
        //
      }

      return totalSize;
    };

    const getStorageInfo = async () => {
      try {
        const totalBytes = await FileSystem.getTotalDiskCapacityAsync();
        const freeBytes = await FileSystem.getFreeDiskStorageAsync();
        const usedBytes = totalBytes - freeBytes;

        const appUsedBytes = await getAppStorageSize();

        setStorageInfo({
          appUsed: appUsedBytes,
          deviceUsed: usedBytes,
          deviceFree: freeBytes,
          deviceTotal: totalBytes,
          loading: false,
          error: null,
        });
      } catch (error) {
        setStorageInfo((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    getStorageInfo();
  }, []);

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1000 * 1000 * 1000);
    const mb = bytes / (1000 * 1000);

    if (gb >= 1) {
      return `${gb.toFixed(0)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <View className="flex flex-col gap-y-4">
      <View className="h-4 rounded-md overflow-hidden relative bg-muted">
        <View
          style={[
            {
              width: `${
                (storageInfo.deviceUsed / storageInfo.deviceTotal) * 100
              }%`,
              backgroundColor: colors.secondary,
              zIndex: 1,
            },
          ]}
          className="h-full absolute top-0 bottom-0 left-0"
        />
        <View
          style={[
            {
              width: `${
                (storageInfo.appUsed / storageInfo.deviceTotal) * 100
              }%`,
              backgroundColor: colors.primary,
              zIndex: 2,
            },
          ]}
          className="h-full absolute top-0 bottom-0 left-0"
        />
      </View>
      <View className="flex flex-row flex-wrap gap-4">
        <View className="flex flex-row gap-x-2 items-center">
          <View className="size-4 bg-primary rounded-sm" />
          <Text>
            <Text className="font-medium">Lumiere Usage:</Text>{" "}
            {formatStorage(storageInfo.appUsed)}
          </Text>
        </View>
        <View className="flex flex-row gap-x-2 items-center">
          <View className="size-4 bg-secondary rounded-sm" />
          <Text>
            <Text className="font-medium">Device Usage:</Text>{" "}
            {formatStorage(storageInfo.deviceUsed)}
          </Text>
        </View>
        <View className="flex flex-row gap-x-2 items-center">
          <View className="size-4 bg-muted rounded-sm" />
          <Text>
            <Text className="font-medium">Device Free:</Text>{" "}
            {formatStorage(storageInfo.deviceFree)} out of{" "}
            {formatStorage(storageInfo.deviceTotal)}
          </Text>
        </View>
      </View>
    </View>
  );
}
