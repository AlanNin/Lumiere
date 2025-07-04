import { NovelInfo } from "./novel";

export type LibraryCategory = {
  id: number;
  label: string;
  sortOrder: number;
  novels: NovelInfo[];
};
