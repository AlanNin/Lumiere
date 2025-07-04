import { Chapter, NovelInfo } from "@/types/novel";
import { db_client } from "../db/client";
import { novelChapters, novels } from "../db/schema";
import { eq } from "drizzle-orm";

export const novelRepository = {
  async findNovel(
    novelTitle: NovelInfo["title"]
  ): Promise<(NovelInfo & { chapters: Chapter[] }) | null> {
    try {
      const novelRows = await db_client
        .select({
          title: novels.title,
          url: novels.url,
          imageUrl: novels.imageUrl,
          description: novels.description,
          rating: novels.rating,
          author: novels.author,
          genres: novels.genres,
          status: novels.status,
        })
        .from(novels)
        .where(eq(novels.title, novelTitle))
        .limit(1);

      if (novelRows.length === 0) {
        return null;
      }

      const novelRow = novelRows[0];

      const chapterRows = await db_client
        .select({
          id: novelChapters.id,
          number: novelChapters.number,
          title: novelChapters.title,
          progress: novelChapters.progress,
          bookMarked: novelChapters.bookMarked,
          downloaded: novelChapters.downloaded,
          content: novelChapters.content,
          updatedAt: novelChapters.updatedAt,
        })
        .from(novelChapters)
        .where(eq(novelChapters.novelTitle, novelTitle))
        .orderBy(novelChapters.number);

      const novelInfo: NovelInfo & { chapters: Chapter[] } = {
        title: novelRow.title,
        url: novelRow.url,
        imageUrl: novelRow.imageUrl,
        description: novelRow.description,
        rating: novelRow.rating,
        author: novelRow.author,
        genres: novelRow.genres,
        status: novelRow.status,
        chapters: chapterRows.map((c) => ({
          id: Number(c.id),
          novelTitle: novelTitle,
          number: Number(c.number),
          title: String(c.title),
          progress: Number(c.progress),
          bookMarked: Boolean(c.bookMarked),
          downloaded: Boolean(c.downloaded),
          content: c.content === null ? "" : String(c.content),
          updatedAt: String(c.updatedAt),
        })),
      };

      return novelInfo;
    } catch (error) {
      console.error("findNovel failed:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to find novel: ${error.message}`);
      }
      throw new Error("An unknown error occurred while finding novel.");
    }
  },

  async saveNovel(novel: NovelInfo): Promise<boolean> {
    try {
      await db_client.transaction(async (tx) => {
        await tx.insert(novels).values({
          title: novel.title,
          url: novel.url,
          imageUrl: novel.imageUrl,
          description: novel.description,
          rating: novel.rating,
          author: novel.author,
          genres: novel.genres,
          status: novel.status,
        });

        const chapterRows = novel.chapters.map((chap) => ({
          novelTitle: novel.title,
          number: chap.number,
          title: chap.title,
          progress: chap.progress,
          bookMarked: 0,
          downloaded: 0,
          content: null,
        }));

        const MAX_SQL_VARS = 999;
        const colsPerRow = 7;
        const batchSize = Math.floor(MAX_SQL_VARS / colsPerRow);

        for (let i = 0; i < chapterRows.length; i += batchSize) {
          const chunk = chapterRows.slice(i, i + batchSize);
          await tx.insert(novelChapters).values(chunk);
        }
      });

      return true;
    } catch (error) {
      console.error("Failed to save novel:", error);
      if (error instanceof Error) throw error;
      throw new Error("An unknown error occurred.");
    }
  },
};
