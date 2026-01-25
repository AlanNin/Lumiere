export type DownloadChapter = {
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterContent?: string;
  readingProgress?: number;
  isNovelSaved?: boolean;
};
