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
      savedAt: string;
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
            savedAt: novels.savedAt,
          })
          .from(novels)
          .where(and(eq(novels.isSaved, 1), inArray(novels.title, novelTitles)))
          .orderBy(novels.savedAt) // orden por fecha de guardado ascendente
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
          savedAt: novels.savedAt,
        })
        .from(novels)
        .where(eq(novels.isSaved, 1))
        .orderBy(novels.savedAt)
        .all();
    }

    // Construir índice de orden para preservar dentro de categorías
    const orderIndex = new Map<string, number>();
    savedNovels.forEach((n, i) => orderIndex.set(n.title, i));

    // Traer categorías y relaciones
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

    // Inicializar mapa de categorías
    const categoryMap = new Map<number, NovelInfo[]>();
    dbCategories.forEach((cat) => categoryMap.set(cat.id, []));

    const novelsWithoutCategory: NovelInfo[] = [];

    // Llenar novelas en sus categorías (o sin categoría)
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

    // Ordenar internamente cada grupo por el índice de inserción (savedAt)
    for (const arr of categoryMap.values()) {
      arr.sort((a, b) => {
        const ai = orderIndex.get(a.title) ?? 0;
        const bi = orderIndex.get(b.title) ?? 0;
        return ai - bi;
      });
    }

    novelsWithoutCategory.sort((a, b) => {
      const ai = orderIndex.get(a.title) ?? 0;
      const bi = orderIndex.get(b.title) ?? 0;
      return ai - bi;
    });

    // Armar resultado final
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

  async clearDatabase(): Promise<boolean> {
    try {
      await db_client.delete(novels).where(eq(novels.isSaved, 0));

      return true;
    } catch (error) {
      console.error("Failed to clear database:", error);
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
