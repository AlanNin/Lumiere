import { NovelInfo } from "@/types/novel";
import { db_client } from "../db/client";
import {
  categories,
  novelCategories,
  novels,
  novelChapters,
} from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { LibraryCategory } from "@/types/library";

export const libraryRepository = {
  async getLibrary({
    downloadedOnly,
  }: {
    downloadedOnly: boolean;
  }): Promise<LibraryCategory[]> {
    let savedNovels: {
      title: string;
      imageUrl: string;
      customImageUri: string | null;
      description: string;
      rank: number;
      rating: number;
      author: string;
      genres: string;
      status: string;
    }[];

    if (downloadedOnly) {
      const novelsWithDownloadedChapters = await db_client
        .selectDistinct({
          novelTitle: novelChapters.novelTitle,
        })
        .from(novelChapters)
        .where(eq(novelChapters.downloaded, 1))
        .all();

      const novelTitles = novelsWithDownloadedChapters.map((n) => n.novelTitle);

      if (novelTitles.length === 0) {
        savedNovels = [];
      } else {
        savedNovels = await db_client
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
          .where(and(eq(novels.isSaved, 1), inArray(novels.title, novelTitles)))
          .all();
      }
    } else {
      savedNovels = await db_client
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
    }

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
        });
      } else {
        novelsWithoutCategory.push(info);
      }
    }

    const result: LibraryCategory[] = [];
    if (novelsWithoutCategory.length > 0) {
      result.push({
        id: 0,
        label: "Default",
        sortOrder: 0,
        novels: novelsWithoutCategory,
      });
    }
    dbCategories.forEach((cat) => {
      result.push({
        id: cat.id,
        label: cat.label,
        sortOrder: cat.sortOrder,
        novels: categoryMap.get(cat.id) || [],
      });
    });

    return result;
  },
};
