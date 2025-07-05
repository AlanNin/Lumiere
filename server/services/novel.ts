import { Explore } from "@/types/explore";
import { Chapter, DownloadChapter, NovelInfo } from "@/types/novel";
import { ExploreSection } from "../controllers/novel";
import {
  scrapeNovelChapter,
  scrapeNovelInfo,
  scrapeNovelsExplore,
  scrapeNovelsSearch,
} from "./scrape";
import { novelRepository } from "../repositories/novel";
import { tryAndReTry, tryAndReTry2Params } from "@/lib/retry";

export const novelService = {
  async getExploreSection({
    section,
    pageNumber = 1,
  }: {
    section: ExploreSection;
    pageNumber?: number;
  }): Promise<Explore> {
    if (section === "search") {
      throw new Error("Use scrapeExploreSearch() for search section.");
    }

    const { novels, totalPages } = await scrapeNovelsExplore(
      section,
      pageNumber
    );

    return {
      items: novels,
      totalItems: novels.length,
      pageNumber,
      totalPages,
    };
  },

  async getExploreSearch({
    searchQuery,
  }: {
    searchQuery: string;
  }): Promise<Explore> {
    if (searchQuery.length === 0) {
      throw new Error("Search query cannot be empty.");
    }

    const { novels } = await scrapeNovelsSearch(searchQuery);

    return {
      items: novels,
      totalItems: novels.length,
    };
  },

  async getNovel({ title }: { title: string }): Promise<NovelInfo> {
    try {
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      let info: NovelInfo | null = null;

      info = await novelRepository.findNovel(title);

      if (info) {
        return info;
      }

      info = await tryAndReTry<NovelInfo>(slug, scrapeNovelInfo);
      await novelRepository.saveNovel(info);

      return info;
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
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      let chapter = await novelRepository.getNovelChapter(title, chapterNumber);

      if (!chapter) {
        return null;
      }

      if (chapter.downloaded) {
        return chapter;
      }

      const scrapedChapter = await tryAndReTry2Params<Chapter>(
        slug,
        chapterNumber,
        scrapeNovelChapter
      );

      chapter.content = scrapedChapter.content;

      return chapter;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async setLibraryStatus({
    novelTitle,
    saved,
    categoriesId,
  }: {
    novelTitle: string;
    saved: boolean;
    categoriesId?: number[];
  }): Promise<boolean> {
    try {
      return await novelRepository.setLibraryStatus({
        title: novelTitle,
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
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      const info = await tryAndReTry<NovelInfo>(slug, scrapeNovelInfo);
      await novelRepository.refreshNovel(info);

      return info;
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
      return await novelRepository.updateNovelChapterProgress({
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
      if (chapters.length === 0) return false;

      const chaptersWithContent = await Promise.all(
        chapters.map(async ({ novelTitle, chapterNumber }) => {
          const slug = novelTitle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

          const scrapedChapter = await tryAndReTry2Params<Chapter>(
            slug,
            chapterNumber,
            scrapeNovelChapter
          );

          return {
            novelTitle,
            chapterNumber,
            chapterContent: scrapedChapter.content,
          };
        })
      );

      return await novelRepository.downloadChapters(chaptersWithContent);
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
      if (chapters.length === 0) return false;

      return await novelRepository.removeDownloadedChapters(chapters);
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
