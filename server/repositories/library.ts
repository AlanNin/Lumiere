import { db_client } from '../db/client';
import { categories, novelCategories, novels, novelChapters } from '../db/schema';
import { eq, and, inArray, sql, lt } from 'drizzle-orm';
import { LibraryCategory } from '@/types/library';
import { NovelInfo } from '@/types/novel';

export const libraryRepository = {
  async getLibrary({ downloadedOnly }: { downloadedOnly: boolean }): Promise<LibraryCategory[]> {
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
          .orderBy(novels.savedAt)
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

    // Build order index to preserve order within categories
    const orderIndex = new Map<string, number>();
    savedNovels.forEach((n, i) => orderIndex.set(n.title, i));

    const novelTitles = savedNovels.map((n) => n.title);

    // Fetch unread chapter counts (progress < 100) for these novels
    const unreadCountsRaw = novelTitles.length
      ? await db_client
          .select({
            novelTitle: novelChapters.novelTitle,
            unreadChapters: sql`COUNT(*)`.as('unreadChapters'),
          })
          .from(novelChapters)
          .where(
            and(inArray(novelChapters.novelTitle, novelTitles), lt(novelChapters.progress, 100))
          )
          .groupBy(novelChapters.novelTitle)
          .all()
      : [];

    const unreadMap = new Map<string, number>();
    unreadCountsRaw.forEach((row) => {
      unreadMap.set(row.novelTitle, Number(row.unreadChapters) || 0);
    });

    // Fetch downloaded chapter counts for these novels
    const downloadedCountsRaw = novelTitles.length
      ? await db_client
          .select({
            novelTitle: novelChapters.novelTitle,
            downloadedChapters: sql`COUNT(*)`.as('downloadedChapters'),
          })
          .from(novelChapters)
          .where(
            and(inArray(novelChapters.novelTitle, novelTitles), eq(novelChapters.downloaded, 1))
          )
          .groupBy(novelChapters.novelTitle)
          .all()
      : [];

    const downloadedMap = new Map<string, number>();
    downloadedCountsRaw.forEach((row) => {
      downloadedMap.set(row.novelTitle, Number(row.downloadedChapters) || 0);
    });

    // Fetch categories and relations
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

    // Initialize category map with NovelInfoLibrary[]
    const categoryMap = new Map<number, NovelInfo[]>();
    dbCategories.forEach((cat) => categoryMap.set(cat.id, []));

    const novelsWithoutCategory: NovelInfo[] = [];

    // Populate novels into categories (or uncategorized), injecting unreadChapters
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
        unreadChapters: unreadMap.get(n.title) ?? 0,
        downloadedChapters: downloadedMap.get(n.title) ?? 0,
      };

      const rels = novelCategoryRelations.filter((r) => r.novelTitle === n.title);
      if (rels.length) {
        rels.forEach((r) => {
          const arr = categoryMap.get(r.categoryId);
          if (arr) arr.push(info);
        });
      } else {
        novelsWithoutCategory.push(info);
      }
    }

    // Sort each category internally by saved order
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

    // Assemble final result
    const result: LibraryCategory[] = [];
    if (novelsWithoutCategory.length > 0) {
      result.push({
        id: 0,
        label: 'Default',
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
      console.error('Failed to clear database:', error);
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error('An unknown error occurred.');
    }
  },
};
