import type { InferSelectModel } from "drizzle-orm";
import * as schemas from "@/server/db/schema";

export type Novel = InferSelectModel<typeof schemas.novels>;
export type Chapter = InferSelectModel<typeof schemas.novelChapters>;
export type Category = InferSelectModel<typeof schemas.categories>;
export type NovelCategory = InferSelectModel<typeof schemas.novelCategories>;

export interface BackupData {
  appConfig: Record<string, string | null>;
  novels: Novel[];
  chapters: Chapter[];
  categories: Category[];
  novelCategories: NovelCategory[];
  novelImages: {
    fileName: string;
    base64Data: string;
  }[];
}
