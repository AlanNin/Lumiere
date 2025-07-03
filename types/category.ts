import { Novel } from "@/types/novel";

export type Category = {
  id: number;
  title: string;
  novels: Novel[];
};
