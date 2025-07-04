import { LibraryCategory } from "@/types/library";
import { libraryRepository } from "../repositories/library";

export const libraryService = {
  async getLibrary(): Promise<LibraryCategory[]> {
    try {
      return await libraryRepository.getLibrary();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
