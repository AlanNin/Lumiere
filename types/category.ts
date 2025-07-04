import { Novel } from "@/types/novel";

export type Category = {
  id: number;
  label: string;
  sortOrder: number;
  novels: Novel[];
};
