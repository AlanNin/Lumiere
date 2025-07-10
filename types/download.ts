export type DownloadChapter = {
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterUrl: string;
  chapterContent?: string;
  readingProgress?: number;
};
