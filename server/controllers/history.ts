import { HistoryBatch } from "@/types/history";
import { historyService } from "../services/history";

export const historyController = {
  async getHistory(): Promise<HistoryBatch[]> {
    try {
      return await historyService.getHistory();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async removeChapterFromHistory({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    try {
      return await historyService.removeChapterFromHistory({
        novelTitle,
        chapterNumber,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async removeNovelFromHistory({
    novelTitle,
  }: {
    novelTitle: string;
  }): Promise<boolean> {
    try {
      return await historyService.removeNovelFromHistory({ novelTitle });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async removeAllHistory(): Promise<boolean> {
    try {
      return await historyService.removeAllHistory();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
