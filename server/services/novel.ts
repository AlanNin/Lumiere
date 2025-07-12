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

    const novelsExploreUrl = getNovelsExploreUrl(section, pageNumber);

    const { novels, totalPages } = await scrapeNovelsExplore({
      novelsExploreUrl,
    });

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

    const searchNovelsUrl = getNovelSearchUrl(searchQuery);

    const { novels } = await scrapeNovelsSearch({ searchNovelsUrl });

    return {
      items: novels,
      totalItems: novels.length,
    };
  },

  async getNovel({
    novelTitle,
  }: {
    novelTitle: NovelInfo["title"];
  }): Promise<NovelInfo> {
    try {
      const novelTitleSlug = slugify(novelTitle);

      let info: NovelInfo | null = null;

      info = await novelRepository.findNovel({ novelTitle });

      if (info) {
        return info;
      }

      const novelInfoUrl = getNovelInfoUrl(novelTitleSlug);
      const novelChaptersUrl = getNovelChaptersUrl(novelTitleSlug);

      info = await scrapeNovelInfo({ novelInfoUrl, novelChaptersUrl });

      if (!info) {
        throw new Error("Failed to scrape novel info");
      }

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
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<Chapter | null> {
    try {
      const novelTitleSlug = slugify(novelTitle);

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

      const novelChapterUrl = getNovelChapterUrl(novelTitleSlug, chapterNumber);

      const scrapedChapter = await scrapeNovelChapter({ novelChapterUrl });

      if (!scrapedChapter) {
        throw new Error("Failed to scrape novel chapter");
      }

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

      const novelInfoUrl = getNovelInfoUrl(novelTitleSlug);
      const novelChaptersUrl = getNovelChaptersUrl(novelTitleSlug);

      const info = await scrapeNovelInfo({ novelInfoUrl, novelChaptersUrl });

      if (!info) {
        throw new Error("Failed to scrape novel info");
      }

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

      const novelTitleSlug = slugify(novelTitle);

      const novelChapterUrl = getNovelChapterUrl(novelTitleSlug, chapterNumber);

      const scrapedChapter = await scrapeNovelChapter({ novelChapterUrl });

      if (!scrapedChapter) {
        throw new Error("Failed to scrape novel chapter");
      }

      const content = scrapedChapter.content;
      if (!content) return false;

      const chaptersWithContent: DownloadChapter = {
        novelTitle,
        chapterNumber,
        chapterTitle,
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

  async removeAllDownloadedChaptersFromNovels({
    novelTitles,
  }: {
    novelTitles: NovelInfo["title"][];
  }): Promise<boolean> {
    try {
      return await novelRepository.removeAllDownloadedChaptersFromNovels(
        novelTitles
      );
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

  async markChaptersBeforeAsRead({
    novelTitle,
    uptoChapter,
  }: {
    novelTitle: string;
    uptoChapter: number;
  }): Promise<boolean> {
    try {
      return await novelRepository.markChaptersBeforeAsRead({
        novelTitle,
        uptoChapter,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};

// Helper functions
function getNovelsExploreUrl(section: ExploreSection, pageNumber: number) {
  const EXPLORE_SECTION_MAP: Record<ExploreSection, string> = {
    new: "new",
    popular: "popular",
    "latest-releases": "latest-release",
    search: "",
  };

  return `https://novelfire.net/genre-all/sort-${EXPLORE_SECTION_MAP[section]}/status-all/all-novel?page=${pageNumber}`;
}

function getNovelSearchUrl(searchQuery: string) {
  return `https://novelfire.net/ajax/searchLive?inputContent=${encodeURIComponent(
    searchQuery
  )}`;
}

function getNovelInfoUrl(novelTitleSlug: string) {
  return `https://novelfire.net/book/${novelTitleSlug}`;
}

function getNovelChaptersUrl(novelTitleSlug: string) {
  return `https://novelbin.com/ajax/chapter-archive?novelId=${novelTitleSlug}`;
}

function getNovelChapterUrl(novelTitleSlug: string, chapterNumber: number) {
  return `https://novelfire.net/book/${novelTitleSlug}/chapter-${chapterNumber}`;
}
