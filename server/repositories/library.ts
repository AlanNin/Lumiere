import { NovelInfo } from "@/types/novel";
import { db_client } from "../db/client";
import { categories, novelCategories, novels } from "../db/schema";
import { eq } from "drizzle-orm";
import { LibraryCategory } from "@/types/library";

export const libraryRepository = {
  async getLibrary(): Promise<LibraryCategory[]> {
    const savedNovels = await db_client
      .select({
        title: novels.title,
        imageUrl: novels.imageUrl,
        customImageUri: novels.customImageUri,
        description: novels.description,
        rank: novels.rank,
        rating: novels.rating,
        author: novels.author,
        genres: novels.genres,
        status: novels.status,
      })
      .from(novels)
      .where(eq(novels.isSaved, 1))
      .all();

    const dbCategories = await db_client
      .select({
        id: categories.id,
        label: categories.label,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .orderBy(categories.sortOrder)
      .all();

    const novelCategoryRelations = await db_client
      .select({
        novelTitle: novelCategories.novelTitle,
        categoryId: novelCategories.categoryId,
      })
      .from(novelCategories)
      .all();

    if (!savedNovels.length) {
      return [
        {
          id: 0,
          label: "Default",
          sortOrder: 0,
          novels: [],
        },
      ];
    }

    const categoryMap = new Map<number, NovelInfo[]>();
    dbCategories.forEach((cat) => categoryMap.set(cat.id, []));

    const novelsWithoutCategory: NovelInfo[] = [];
    for (const n of savedNovels) {
      const info: NovelInfo = {
        title: n.title,
        imageUrl: n.imageUrl,
        customImageUri: n.customImageUri,
        description: n.description,
        rank: n.rank,
        rating: n.rating,
        author: n.author,
        genres: n.genres,
        status: n.status,
        chapters: [],
      };
      const rels = novelCategoryRelations.filter(
        (r) => r.novelTitle === n.title
      );
      if (rels.length) {
        rels.forEach((r) => {
          const arr = categoryMap.get(r.categoryId);
          if (arr) arr.push(info);
          else novelsWithoutCategory.push(info);
        });
      } else {
        novelsWithoutCategory.push(info);
      }
    }

    const result: LibraryCategory[] = [
      { id: 0, label: "Default", sortOrder: 0, novels: novelsWithoutCategory },
      ...dbCategories.map((cat) => ({
        id: cat.id,
        label: cat.label,
        sortOrder: cat.sortOrder,
        novels: categoryMap.get(cat.id)!,
      })),
    ];

    return result;
  },
};
