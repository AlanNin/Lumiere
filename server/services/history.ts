import { HistoryBatch } from "@/types/history";
import { historyRepository } from "../repositories/history";

export const historyService = {
  async getHistory(): Promise<HistoryBatch[]> {
    try {
      return await historyRepository.getHistory();
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
      return await historyRepository.removeChapterFromHistory({
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
      return await historyRepository.removeNovelFromHistory({ novelTitle });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
