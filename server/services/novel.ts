import { Explore } from "@/types/explore";
import { Chapter, NovelInfo } from "@/types/novel";
import { ExploreSection } from "../controllers/novel";
import {
  scrapeNovelChapter,
  scrapeNovelInfo,
  scrapeNovelsExplore,
  scrapeNovelsSearch,
} from "./scrape";
import { novelRepository } from "../repositories/novel";
import { tryAndReTryNovelInfo, tryAndReTryNovelChapter } from "@/lib/retry";
import { DownloadChapter } from "@/types/download";
import slugify from "@/lib/slug";

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
      const novelTitleSlug = slugify(title);

      let info: NovelInfo | null = null;

      info = await novelRepository.findNovel(title);

      if (info) {
        return info;
      }

      info = await tryAndReTryNovelInfo<NovelInfo>(
        novelTitleSlug,
        scrapeNovelInfo
      );
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
    novelTitle,
    chapterNumber,
    chapterTitle,
    chapterUrl,
  }: {
    novelTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    chapterUrl: string;
  }): Promise<Chapter | null> {
    try {
      const novelTitleSlug = slugify(novelTitle);

      const chapterTitleSlug = slugify(chapterTitle);

      let chapterData = await novelRepository.getNovelChapter(
        novelTitle,
        chapterNumber
      );

      if (!chapterData) {
        return null;
      }

      if (chapterData.downloaded) {
        return chapterData;
      }

      const scrapedChapter = await tryAndReTryNovelChapter<Chapter>(
        chapterUrl,
        novelTitleSlug,
        chapterNumber,
        chapterTitleSlug,
        scrapeNovelChapter
      );

      chapterData.content = scrapedChapter.content;

      return chapterData;
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
      const novelTitleSlug = slugify(title);

      const info = await tryAndReTryNovelInfo<NovelInfo>(
        novelTitleSlug,
        scrapeNovelInfo
      );
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

  async downloadNovelChapter(chapter: DownloadChapter): Promise<boolean> {
    try {
      if (!chapter) return false;

      const novelTitle = chapter.novelTitle;

      const chapterNumber = chapter.chapterNumber;

      const chapterTitle = chapter.chapterTitle;

      const chapterUrl = chapter.chapterUrl;

      const novelTitleSlug = slugify(novelTitle);

      const chapterTitleSlug = slugify(chapterTitle);

      const scrapedChapter = await tryAndReTryNovelChapter<Chapter>(
        chapterUrl,
        novelTitleSlug,
        chapterNumber,
        chapterTitleSlug,
        scrapeNovelChapter
      );

      const content = scrapedChapter.content;
      if (!content) return false;

      const chaptersWithContent: DownloadChapter = {
        novelTitle,
        chapterNumber,
        chapterTitle,
        chapterUrl,
        chapterContent: content,
      };

      return await novelRepository.downloadChapter(chaptersWithContent);
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

  async toggleMarkChapterAsRead({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    try {
      return await novelRepository.toggleMarkChapterAsRead({
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

  async toggleBookmarkChapter({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    try {
      return await novelRepository.toggleBookmarkChapter({
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

  async markChaptersAsBookmarked({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    try {
      return await novelRepository.markChaptersAsBookmarked({
        novelTitle,
        chapterNumbers,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async unMarkChaptersAsBookmarked({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    try {
      return await novelRepository.unMarkChaptersAsBookmarked({
        novelTitle,
        chapterNumbers,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async markChaptersAsRead({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    try {
      return await novelRepository.markChaptersAsRead({
        novelTitle,
        chapterNumbers,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async unMarkChaptersAsRead({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    try {
      return await novelRepository.unMarkChaptersAsRead({
        novelTitle,
        chapterNumbers,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
