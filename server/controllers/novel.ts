import { Explore } from "@/types/explore";
import { Chapter, DownloadChapter, NovelInfo } from "@/types/novel";
import { novelService } from "../services/novel";

export type ExploreSection =
  | "popular"
  | "latest-releases"
  | "completed"
  | "search";

export const novelController = {
  async exploreNovels({
    section,
    pageNumber = 1,
    searchQuery,
  }: {
    section: ExploreSection;
    pageNumber?: number;
    searchQuery?: string;
  }): Promise<Explore> {
    try {
      let data: Explore;

      if (section === "search") {
        data = await novelService.getExploreSearch({
          searchQuery: searchQuery ?? "",
        });
      } else {
        data = await novelService.getExploreSection({ section, pageNumber });
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async getNovel({ title }: { title: string }): Promise<NovelInfo> {
    try {
      let data: NovelInfo;

      data = await novelService.getNovel({ title });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async getNovelChapter({
    title,
    chapterNumber,
  }: {
    title: string;
    chapterNumber: number;
  }): Promise<Chapter | null> {
    try {
      let data: Chapter | null;

      data = await novelService.getNovelChapter({ title, chapterNumber });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async setLibraryStatus({
    title,
    saved,
    categoriesId,
  }: {
    title: string;
    saved: boolean;
    categoriesId?: number[];
  }): Promise<boolean> {
    try {
      return await novelService.setLibraryStatus({
        novelTitle: title,
        saved,
        categoriesId,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async refreshNovel({ title }: { title: string }): Promise<NovelInfo> {
    try {
      let data: NovelInfo;

      data = await novelService.refreshNovel({ title });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async updateNovelChapterProgress({
    novelTitle,
    chapterNumber,
    chapterProgress,
  }: {
    novelTitle: string;
    chapterNumber: number;
    chapterProgress: number;
  }): Promise<boolean> {
    try {
      return await novelService.updateNovelChapterProgress({
        novelTitle,
        chapterNumber,
        chapterProgress,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async downloadNovelChapters({
    chapters,
  }: {
    chapters: DownloadChapter[];
  }): Promise<boolean> {
    try {
      return await novelService.downloadNovelChapters({ chapters });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async removeDownloadedNovelChapters({
    chapters,
  }: {
    chapters: DownloadChapter[];
  }): Promise<boolean> {
    try {
      return await novelService.removeDownloadedNovelChapters({ chapters });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
