export type Chapter = {
  id?: number;
  novelTitle: string;
  number: number;
  title: string;
  progress?: number;
  content?: string;
  bookMarked?: boolean;
  downloaded?: boolean;
  readAt?: string;
  previousChapter?: {
    number: number;
    title: string;
    downloaded?: boolean;
  };
  nextChapter?: {
    number: number;
    title: string;
    downloaded?: boolean;
  };
};

export type Novel = {
  title: string;
  imageUrl: string;
  customImageUri?: string | null;
  rating?: number;
  rank?: number;
  isSaved?: boolean;
  savedAt?: string;
};

export type NovelInfo = Novel & {
  description: string;
  author: string;
  genres: string;
  status: string;
  chapters: Chapter[];
  categoriesIds?: number[];
};

export type NovelChaptersFilter = {
  key: "downloaded" | "unread" | "bookmarked";
  value?: "checked" | "indeterminate" | "unchecked";
};

export type NovelChaptersFilterUI = NovelChaptersFilter & {
  label: string;
};

export type NovelChaptersSort = { key: "by_chapter"; order?: "asc" | "desc" };

export type NovelChaptersSortUI = NovelChaptersSort & {
  label: string;
};
