import AsyncStorage from "@react-native-async-storage/async-storage";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite/driver";
import { db_expo } from "@/server/db/client";
import * as schemas from "@/server/db/schema";
import * as FileSystem from "expo-file-system";
import { BackupData } from "@/types/backup";
import { ToastAndroid } from "react-native";

interface BackupError extends Error {
  code?: string;
  message: string;
}

class AppBackupManager {
  private db: ExpoSQLiteDatabase;
  private backgroundsDir = `${FileSystem.documentDirectory}images/`;

  constructor() {
    this.db = drizzle(db_expo);
  }

  private async imageToBase64(filePath: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      const backupError = error as BackupError;
      console.error(`Failed to convert image: ${filePath}`, backupError);
      return "";
    }
  }

  async createBackup(): Promise<void> {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        throw new Error("Permission to access storage was denied");
      }

      const directoryUri = permissions.directoryUri;

      await FileSystem.makeDirectoryAsync(this.backgroundsDir, {
        intermediates: true,
      });

      const keys = await AsyncStorage.getAllKeys();
      const appConfig = await AsyncStorage.multiGet(keys);

      const novels = await this.db.select().from(schemas.novels);
      const chapters = await this.db.select().from(schemas.novelChapters);
      const categories = await this.db.select().from(schemas.categories);
      const novelCategories = await this.db
        .select()
        .from(schemas.novelCategories);

      const imageFiles = await FileSystem.readDirectoryAsync(
        this.backgroundsDir
      );
      const novelImages: { fileName: string; base64Data: string }[] = [];

      for (const file of imageFiles) {
        const imagePath = `${this.backgroundsDir}${file}`;
        const base64Data = await this.imageToBase64(imagePath);
        novelImages.push({ fileName: file, base64Data });
      }

      const backupData: BackupData = {
        appConfig: Object.fromEntries(appConfig),
        novels,
        chapters,
        categories,
        novelCategories,
        novelImages,
      };

      const filename = `Lumiere_backup_${Date.now()}.json`;
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        filename,
        "application/json"
      );

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(backupData, null, 2),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );
    } catch (error) {
      const backupError = error as BackupError;
      ToastAndroid.show("No folder selected", ToastAndroid.SHORT);
      throw backupError;
    }
  }

  async restoreBackup(
    backupFilePath: string,
    strategy: "overwrite" | "merge" | "skip" = "overwrite"
  ): Promise<void> {
    try {
      const content = await FileSystem.readAsStringAsync(backupFilePath);
      const data: BackupData = JSON.parse(content);

      // Validate and process app config
      if (data.appConfig && typeof data.appConfig === "object") {
        const safeConfigEntries: [string, string][] = Object.entries(
          data.appConfig
        )
          .map(([key, value]) => [key, String(value ?? "")])
          .filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" &&
              typeof entry[1] === "string" &&
              entry[0].length > 0
          );

        // Only call multiSet if we have valid entries
        if (safeConfigEntries.length > 0) {
          await AsyncStorage.multiSet(safeConfigEntries);
        }
      }

      // Ensure backgrounds directory exists
      await FileSystem.makeDirectoryAsync(this.backgroundsDir, {
        intermediates: true,
      });

      // Restore images
      if (data.novelImages && Array.isArray(data.novelImages)) {
        for (const image of data.novelImages) {
          if (image.fileName && image.base64Data) {
            const path = `${this.backgroundsDir}${image.fileName}`;
            await FileSystem.writeAsStringAsync(path, image.base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        }
      }

      // Handle database restoration based on strategy
      if (strategy === "overwrite") {
        await this.db.delete(schemas.novelChapters);
        await this.db.delete(schemas.novelCategories);
        await this.db.delete(schemas.novels);
        await this.db.delete(schemas.categories);
      }

      // Restore database data with validation
      if (data.categories && Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          if (strategy === "skip") {
            await this.db
              .insert(schemas.categories)
              .values(cat)
              .onConflictDoNothing();
          } else {
            await this.db.insert(schemas.categories).values(cat);
          }
        }
      }

      if (data.novels && Array.isArray(data.novels)) {
        for (const novel of data.novels) {
          if (strategy === "skip") {
            await this.db
              .insert(schemas.novels)
              .values(novel)
              .onConflictDoNothing();
          } else {
            await this.db.insert(schemas.novels).values(novel);
          }
        }
      }

      if (data.chapters && Array.isArray(data.chapters)) {
        for (const chapter of data.chapters) {
          if (strategy === "skip") {
            await this.db
              .insert(schemas.novelChapters)
              .values(chapter)
              .onConflictDoNothing();
          } else {
            await this.db.insert(schemas.novelChapters).values(chapter);
          }
        }
      }

      if (data.novelCategories && Array.isArray(data.novelCategories)) {
        for (const link of data.novelCategories) {
          if (strategy === "skip") {
            await this.db
              .insert(schemas.novelCategories)
              .values(link)
              .onConflictDoNothing();
          } else {
            await this.db.insert(schemas.novelCategories).values(link);
          }
        }
      }

      ToastAndroid.show("Backup restored", ToastAndroid.SHORT);
    } catch (error) {
      console.error("Backup restoration failed:", error);
      throw error;
    }
  }

  async importBackup(uri: string): Promise<string> {
    const backupDir = `${FileSystem.documentDirectory}app-backup/`;
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

    const fileName = uri.split("/").pop();
    const backupFilePath = `${backupDir}${fileName}`;

    await FileSystem.copyAsync({ from: uri, to: backupFilePath });
    return backupFilePath;
  }
}

export default AppBackupManager;
