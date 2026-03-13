export type ChapterHistory = {
  id: number;
  novelTitle: string;
  novelImage: string;
  isNovelSaved: boolean;
  novelCustomImage?: string | null;
  chapterNumber: number;
  chapterProgress: number;
  nextChapter?: {
    number: number;
    downloaded: boolean;
  } | null;
  readAt: string;
  downloaded: boolean;
  isNovelRead: boolean;
};

export type HistoryBatch = {
  chaptersHistory: ChapterHistory[];
  readAt: string;
};
