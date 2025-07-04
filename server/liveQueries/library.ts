import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db_client } from "../db/client";
import { categories, novelCategories, novels } from "../db/schema";
import { eq } from "drizzle-orm";
import { NovelInfo } from "@/types/novel";
import { LibraryCategory } from "@/types/library";
import { useMemo } from "react";

export const libraryLiveQuery = {
  getLibrary(): LibraryCategory[] {
    const { data: dbNovels } = useLiveQuery(
      db_client.select().from(novels).where(eq(novels.isSaved, 1))
    );

    const { data: dbCategories } = useLiveQuery(
      db_client.select().from(categories)
    );

    const { data: dbNovelCategory } = useLiveQuery(
      db_client
        .select({
          novelTitle: novelCategories.novelTitle,
          categoryId: novelCategories.categoryId,
        })
        .from(novelCategories)
    );

    return useMemo<LibraryCategory[]>(() => {
      if (dbNovels.length === 0) {
        return [{ id: 0, label: "Default", sortOrder: 0, novels: [] }];
      }

      const categoryMap = new Map<number, NovelInfo[]>();
      dbCategories.forEach((cat) => categoryMap.set(cat.id, []));

      const novelsWithoutCategory: NovelInfo[] = [];
      for (const n of dbNovels) {
        const info: NovelInfo = {
          title: n.title,
          url: n.url,
          imageUrl: n.imageUrl,
          description: n.description,
          rating: n.rating,
          author: n.author,
          genres: n.genres,
          status: n.status,
          chapters: [],
        };
        const rels = dbNovelCategory.filter((r) => r.novelTitle === n.title);
        if (rels.length) {
          rels.forEach((r) => {
            categoryMap.get(r.categoryId)?.push(info) ??
              novelsWithoutCategory.push(info);
          });
        } else {
          novelsWithoutCategory.push(info);
        }
      }

      return [
        {
          id: 0,
          label: "Default",
          sortOrder: 0,
          novels: novelsWithoutCategory,
        },
        ...dbCategories.map((cat) => ({
          id: cat.id,
          label: cat.label,
          sortOrder: cat.sortOrder,
          novels: categoryMap.get(cat.id)!,
        })),
      ];
    }, [dbNovels, dbCategories, dbNovelCategory]);
  },
};
