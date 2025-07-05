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
};

export type Novel = {
  title: string;
  imageUrl: string;
  rating: number;
};

export type NovelInfo = Novel & {
  url: string;
  description: string;
  author: string;
  genres: string;
  status: string;
  chapters: Chapter[];
  categoryId?: number | null;
  isSaved?: boolean;
};
