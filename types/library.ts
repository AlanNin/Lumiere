import { Category } from "./category";
import { NovelInfo } from "./novel";

export type LibraryCategory = Category & {
  novels: NovelInfo[];
};
