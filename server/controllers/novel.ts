import { Explore } from '@/types/explore';
import { Chapter, NovelInfo } from '@/types/novel';
import { novelService } from '../services/novel';
import { DownloadChapter } from '@/types/download';

export type ExploreSection = 'popular' | 'latest-releases' | 'new' | 'search';

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

      if (section === 'search') {
        data = await novelService.getExploreSearch({
          searchQuery: searchQuery ?? '',
        });
      } else {
        data = await novelService.getExploreSection({ section, pageNumber });
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async getNovel({ novelTitle }: { novelTitle: NovelInfo['title'] }): Promise<NovelInfo> {
    try {
      let data: NovelInfo;

      data = await novelService.getNovel({ novelTitle });

      return data;
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
      let data: Chapter | null;

      data = await novelService.getNovelChapter({
        novelTitle,
        chapterNumber,
      });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
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
      throw new Error('An unknown error occurred.');
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
      return await novelService.updateNovelChapterProgress({
        novelTitle,
        chapterNumber,
        chapterProgress,
        removeDownloadOnRead,
      });
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
      return await novelService.updateNovelChapterReadAt({
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
      return await novelService.updateNovelCustomImage({
        novelTitle,
        customImageUri,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async downloadNovelChapter(chapter: DownloadChapter): Promise<boolean> {
    try {
      return await novelService.downloadNovelChapter(chapter);
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
      return await novelService.removeDownloadedNovelChapters({ chapters });
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
      return await novelService.removeAllDownloadedChaptersFromNovels({
        novelTitles,
      });
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
      return await novelService.markChaptersAsBookmarked({
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

  async unMarkChaptersAsBookmarked({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    try {
      return await novelService.unMarkChaptersAsBookmarked({
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
      return await novelService.toggleBookmarkChapter({
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
      return await novelService.markChaptersAsRead({
        novelTitle,
        chapterNumbers,
        removeDownloadOnRead,
      });
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
      return await novelService.unMarkChaptersAsRead({
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
      return await novelService.markChaptersBeforeAsRead({
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
      return await novelService.checkIfIsStored({
        novelTitle,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },

  async getLastRead(): Promise<Chapter> {
    try {
      return await novelService.getLastRead();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },
};
