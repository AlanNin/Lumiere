import { libraryService } from '../services/library';
import { LibraryCategory } from '@/types/library';

export const libraryController = {
  async getLibrary({ downloadedOnly }: { downloadedOnly: boolean }): Promise<LibraryCategory[]> {
    try {
      return await libraryService.getLibrary({
        downloadedOnly,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async clearDatabase(): Promise<boolean> {
    try {
      return await libraryService.clearDatabase();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },
};
