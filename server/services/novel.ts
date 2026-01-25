import { Explore } from '@/types/explore';
import { Chapter, Novel, NovelInfo } from '@/types/novel';
import { ExploreSection } from '../controllers/novel';
import {
  scrapeNovelChapter,
  scrapeNovelInfo,
  scrapeNovelsExplore,
  scrapeNovelsSearch,
} from './scrape';
import { novelRepository } from '../repositories/novel';
import { DownloadChapter } from '@/types/download';
import slugify from '@/lib/slug';
import { saveImage } from '@/lib/file-system';

export const novelService = {
  async getExploreSection({
    section,
    pageNumber = 1,
  }: {
    section: ExploreSection;
    pageNumber?: number;
  }): Promise<Explore> {
    if (section === 'search') {
      throw new Error('Use scrapeExploreSearch() for search section.');
    }

    const novelsExploreUrl = getNovelsExploreUrl(section, pageNumber);

    const { novels: scrapedNovels, totalPages } = await scrapeNovelsExplore({
      novelsExploreUrl,
    });

    const novels = await mergeNovelsScrapedWithStored(scrapedNovels);

    return {
      items: novels,
      totalItems: novels.length,
      pageNumber,
      totalPages,
    };
  },

  async getExploreSearch({ searchQuery }: { searchQuery: string }): Promise<Explore> {
    if (searchQuery.length === 0) {
      throw new Error('Search query cannot be empty.');
    }

    const searchNovelsUrl = getNovelSearchUrl(searchQuery);

    const { novels: scrapedNovels } = await scrapeNovelsSearch({
      searchNovelsUrl,
    });

    const novels = await mergeNovelsScrapedWithStored(scrapedNovels);

    return {
      items: novels,
      totalItems: novels.length,
    };
  },

  async getNovel({ novelTitle }: { novelTitle: NovelInfo['title'] }): Promise<NovelInfo> {
    try {
      const novelTitleSlug = slugify(novelTitle);

      let info: NovelInfo | null = null;

      info = await novelRepository.findNovel({ novelTitle });

      if (info) {
        return info;
      }

      const novelInfoUrl = getNovelInfoUrl(novelTitleSlug);
      const novelChaptersAjaxUrl = getNovelChaptersAjaxUrl(novelTitleSlug);
      const novelChaptersMainSourceUrl = getNovelChaptersMainSourceUrl(novelTitleSlug);

      info = await scrapeNovelInfo({
        novelInfoUrl,
        novelChaptersAjaxUrl,
        novelChaptersMainSourceUrl,
      });

      if (!info) {
        throw new Error('Failed to scrape novel info');
      }

      const { uri: savedImageUri } = await saveImage({
        sourceUri: info.imageUrl,
      });

      info.imageUrl = savedImageUri;

      await novelRepository.saveNovel(info);

      return info;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
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

      let chapterData = await novelRepository.getNovelChapter(novelTitle, chapterNumber);

      if (!chapterData) {
        return null;
      }

      if (chapterData.downloaded) {
        return chapterData;
      }

      const novelStartsAtChapterZero = await novelRepository.checkIfNovelStartAtChapterZero({
        novelTitle,
      });

      const novelChapterUrl = getNovelChapterUrl(
        novelTitleSlug,
        chapterNumber,
        novelStartsAtChapterZero
      );

      const scrapedChapter = await scrapeNovelChapter({
        novelChapterUrl,
        chapterNumber,
      });

      if (!scrapedChapter) {
        throw new Error('Failed to scrape novel chapter');
      }

      chapterData.content = scrapedChapter.content;

      return chapterData;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
    }
  },

  async refreshNovel({ title }: { title: string }): Promise<NovelInfo> {
    try {
      const novelTitleSlug = slugify(title);

      const novelInfoUrl = getNovelInfoUrl(novelTitleSlug);
      const novelChaptersAjaxUrl = getNovelChaptersAjaxUrl(novelTitleSlug);
      const novelChaptersMainSourceUrl = getNovelChaptersMainSourceUrl(novelTitleSlug);

      const info = await scrapeNovelInfo({
        novelInfoUrl,
        novelChaptersAjaxUrl,
        novelChaptersMainSourceUrl,
      });

      if (!info) {
        throw new Error('Failed to scrape novel info');
      }

      await novelRepository.refreshNovel(info);

      return info;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async updateNovelChapterProgress({
    novelTitle,
    chapterNumber,
    chapterProgress,
    removeDownloadOnRead,
  }: {
    novelTitle: string;
    chapterNumber: number;
    chapterProgress: number;
    removeDownloadOnRead: boolean;
  }): Promise<boolean> {
    try {
      await novelRepository.updateNovelChapterProgress({
        novelTitle,
        chapterNumber,
        chapterProgress,
      });

      if (removeDownloadOnRead && chapterProgress === 100) {
        await novelRepository.removeDownloadedChapters([
          {
            novelTitle,
            chapterNumber,
          },
        ]);
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async updateNovelChapterReadAt({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    try {
      return await novelRepository.updateNovelChapterReadAt({
        novelTitle,
        chapterNumber,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async updateNovelCustomImage({
    novelTitle,
    customImageUri,
  }: {
    novelTitle: NovelInfo['title'];
    customImageUri: string;
  }): Promise<boolean> {
    try {
      return await novelRepository.updateNovelCustomImage(novelTitle, customImageUri);
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async downloadNovelChapter(chapter: DownloadChapter): Promise<boolean> {
    try {
      if (!chapter) return false;

      const novelTitle = chapter.novelTitle;

      const chapterNumber = chapter.chapterNumber;

      const chapterTitle = chapter.chapterTitle;

      const novelTitleSlug = slugify(novelTitle);

      const novelStartsAtChapterZero = await novelRepository.checkIfNovelStartAtChapterZero({
        novelTitle,
      });

      const novelChapterUrl = getNovelChapterUrl(
        novelTitleSlug,
        chapterNumber,
        novelStartsAtChapterZero
      );

      const scrapedChapter = await scrapeNovelChapter({
        novelChapterUrl,
        chapterNumber,
      });

      if (!scrapedChapter) {
        throw new Error('Failed to scrape novel chapter');
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
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
    }
  },

  async removeAllDownloadedChaptersFromNovels({
    novelTitles,
  }: {
    novelTitles: NovelInfo['title'][];
  }): Promise<boolean> {
    try {
      return await novelRepository.removeAllDownloadedChaptersFromNovels(novelTitles);
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
    }
  },

  async markChaptersAsRead({
    novelTitle,
    chapterNumbers,
    removeDownloadOnRead,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
    removeDownloadOnRead: boolean;
  }): Promise<boolean> {
    try {
      await novelRepository.markChaptersAsRead({
        novelTitle,
        chapterNumbers,
      });

      if (removeDownloadOnRead) {
        await novelRepository.removeDownloadedChapters(
          chapterNumbers.map((c) => ({ novelTitle, chapterNumber: c }))
        );
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
    }
  },

  async checkIfIsStored({ novelTitle }: { novelTitle: string }): Promise<boolean> {
    try {
      return await novelRepository.checkIfIsStored({
        novelTitle,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async getLastRead(): Promise<Chapter & { isNovelSaved: boolean }> {
    try {
      const lastRead = await novelRepository.getLastRead();

      if (!lastRead) {
        throw new Error('Failed to get last read novel');
      }

      return lastRead;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },
};

// Helper functions
function getNovelsExploreUrl(section: ExploreSection, pageNumber: number) {
  const EXPLORE_SECTION_MAP: Record<ExploreSection, string> = {
    popular: 'popular',
    'latest-releases': 'latest-release',
    new: 'new',
    search: '',
  };

  return `${String(process.env.EXPO_PUBLIC_SCRAPE_SITE_URL)}/genre-all/sort-${
    EXPLORE_SECTION_MAP[section]
  }/status-all/all-novel?page=${pageNumber}`;
}

function getNovelSearchUrl(searchQuery: string) {
  return `${String(
    process.env.EXPO_PUBLIC_SCRAPE_SITE_URL
  )}/ajax/searchLive?keyword=${encodeURIComponent(searchQuery)}&type=both`;
}

function getNovelInfoUrl(novelTitleSlug: string) {
  return `${String(process.env.EXPO_PUBLIC_SCRAPE_SITE_URL)}/book/${novelTitleSlug}`;
}

function getNovelChaptersAjaxUrl(novelTitleSlug: string) {
  return `${String(process.env.EXPO_PUBLIC_SCRAPE_CHAPTERS_LIST_URL)}?novelId=${novelTitleSlug}`;
}

function getNovelChaptersMainSourceUrl(novelTitleSlug: string) {
  return `${String(process.env.EXPO_PUBLIC_SCRAPE_SITE_URL)}/book/${novelTitleSlug}/chapters`;
}

function getNovelChapterUrl(
  novelTitleSlug: string,
  chapterNumber: number,
  novelStartsAtChapterZero?: boolean
) {
  return `${String(process.env.EXPO_PUBLIC_SCRAPE_SITE_URL)}/book/${novelTitleSlug}/chapter-${
    novelStartsAtChapterZero ? chapterNumber + 1 : chapterNumber
  }`;
}

function mergeNovelsScrapedWithStored(scrapedNovels: Novel[]): Promise<Novel[]> {
  return Promise.all(
    scrapedNovels.map(async (scraped): Promise<Novel> => {
      const stored = await novelRepository.findNovel({
        novelTitle: scraped.title,
      });

      if (stored) {
        return {
          title: stored.title,
          imageUrl: stored.imageUrl,
          customImageUri: stored.customImageUri,
          rating: stored.rating ?? 0,
          rank: stored.rank ?? 0,
          isSaved: stored.isSaved,
        };
      }

      return {
        title: scraped.title,
        imageUrl: scraped.imageUrl,
        customImageUri: null,
        rating: scraped.rating ?? 0,
        rank: scraped.rank ?? 0,
        isSaved: false,
      };
    })
  );
}
