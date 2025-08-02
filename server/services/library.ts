import { LibraryCategory } from "@/types/library";
import { libraryRepository } from "../repositories/library";

export const libraryService = {
  async getLibrary({
    downloadedOnly,
  }: {
    downloadedOnly: boolean;
  }): Promise<LibraryCategory[]> {
    try {
      return await libraryRepository.getLibrary({ downloadedOnly });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async clearDatabase(): Promise<boolean> {
    try {
      return await libraryRepository.clearDatabase();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
