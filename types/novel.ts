export type Chapter = {
  novelTitle: string;
  number: number;
  title: string;
  progress?: number;
  content?: string;
};

export type Novel = {
  title: string;
  imageUrl: string;
  imageAlt: string;
  rating: number;
};

export type NovelInfo = {
  title: string;
  url: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  rating: number;
  author: string;
  genres: string[];
  status: string;
  chapters: Chapter[];
};
