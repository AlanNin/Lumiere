export type ChapterHistory = {
  id: number;
  novelTitle: string;
  novelImage: string;
  novelCustomImage?: string | null;
  chapterNumber: number;
  chapterTitle: string;
  readAt: string;
  downloaded: boolean;
};

export type HistoryBatch = {
  chaptersHistory: ChapterHistory[];
  readAt: string;
};
