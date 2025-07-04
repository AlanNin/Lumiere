import { libraryService } from "../services/library";
import { LibraryCategory } from "@/types/library";

export const libraryController = {
  async getLibrary(): Promise<LibraryCategory[]> {
    try {
      return await libraryService.getLibrary();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
