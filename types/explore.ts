import { Novel } from "./novel";

export type Explore = {
  items: Novel[];
  totalItems: number;
  pageNumber?: number;
  totalPages?: number;
};
