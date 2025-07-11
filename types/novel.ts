export type Chapter = {
  id?: number;
  novelTitle: string;
  number: number;
  title: string;
  progress?: number;
  content?: string;
  bookMarked?: boolean;
  downloaded?: boolean;
  updatedAt?: string;
  nextChapter?: {
    number: number;
    title: string;
  };
};

export type Novel = {
  title: string;
  imageUrl: string;
  rating?: number;
  rank?: number;
};

export type NovelInfo = Novel & {
  description: string;
  author: string;
  genres: string;
  status: string;
  chapters: Chapter[];
  categoryId?: number | null;
  isSaved?: boolean;
};
