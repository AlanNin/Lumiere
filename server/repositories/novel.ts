import { Chapter, DownloadChapter, NovelInfo } from "@/types/novel";
import { db_client } from "../db/client";
import { novelCategories, novelChapters, novels } from "../db/schema";
import { and, eq, lt } from "drizzle-orm";

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
          isSaved: novels.isSaved,
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
        isSaved: Boolean(novelRow.isSaved),
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
        }));

        const BATCH_SIZE = 1000;

        for (let i = 0; i < chapterRows.length; i += BATCH_SIZE) {
          const chunk = chapterRows.slice(i, i + BATCH_SIZE);
          await tx.insert(novelChapters).values(chunk).onConflictDoNothing();
        }
      });
      return true;
    } catch (error) {
      console.error("Failed to save novel:", error);
      if (error instanceof Error) throw error;
      throw new Error("An unknown error occurred.");
    }
  },

  async setLibraryStatus({
    title,
    saved,
    categoriesId,
  }: {
    title: string;
    saved: boolean;
    categoriesId?: number[];
  }): Promise<boolean> {
    try {
      await db_client.transaction(async (tx) => {
        const upd = await tx
          .update(novels)
          .set({ isSaved: saved ? 1 : 0 })
          .where(eq(novels.title, title));

        if (upd.changes === 0) {
          throw new Error("NOVEL_NOT_FOUND");
        }

        await tx
          .delete(novelCategories)
          .where(eq(novelCategories.novelTitle, title))
          .run();

        if (saved && categoriesId && categoriesId.length > 0) {
          const rows = categoriesId.map((catId) => ({
            novelTitle: title,
            categoryId: catId,
          }));
          await tx
            .insert(novelCategories)
            .values(rows)
            .onConflictDoNothing()
            .run();
        }
      });

      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "NOVEL_NOT_FOUND") {
        return false;
      }
      console.error("Failed to set library status:", error);
      if (error instanceof Error) throw error;
      throw new Error("An unknown error occurred.");
    }
  },

  async refreshNovel(novel: NovelInfo): Promise<boolean> {
    try {
      await db_client.transaction(async (tx) => {
        await tx
          .insert(novels)
          .values({
            title: novel.title,
            url: novel.url,
            imageUrl: novel.imageUrl,
            description: novel.description,
            rating: novel.rating,
            author: novel.author,
            genres: novel.genres,
            status: novel.status,
          })
          .onConflictDoUpdate({
            target: novels.url,
            set: {
              imageUrl: novel.imageUrl,
              description: novel.description,
              rating: novel.rating,
              author: novel.author,
              genres: novel.genres,
              status: novel.status,
            },
          });

        const BATCH = 1000;
        const insertPayload = novel.chapters.map((chap) => ({
          novelTitle: novel.title,
          number: chap.number,
          title: chap.title,
        }));

        for (let i = 0; i < insertPayload.length; i += BATCH) {
          const chunk = insertPayload.slice(i, i + BATCH);
          await tx.insert(novelChapters).values(chunk).onConflictDoNothing();
        }

        for (const chap of novel.chapters) {
          await tx
            .update(novelChapters)
            .set({ title: chap.title })
            .where(
              and(
                eq(novelChapters.novelTitle, novel.title),
                eq(novelChapters.number, chap.number)
              )
            );
        }
      });

      return true;
    } catch (e) {
      console.error("Failed to refresh novel:", e);
      throw e;
    }
  },

  async getNovelChapter(
    novelTitle: string,
    chapterNumber: number
  ): Promise<Chapter | null> {
    try {
      const row = await db_client
        .select({
          novelTitle: novelChapters.novelTitle,
          number: novelChapters.number,
          title: novelChapters.title,
          progress: novelChapters.progress,
          bookMarked: novelChapters.bookMarked,
          downloaded: novelChapters.downloaded,
          content: novelChapters.content,
        })
        .from(novelChapters)
        .where(
          and(
            eq(novelChapters.novelTitle, novelTitle),
            eq(novelChapters.number, chapterNumber)
          )
        )
        .get();

      if (!row) {
        return null;
      }

      const chapter: Chapter = {
        novelTitle: row.novelTitle,
        number: row.number,
        title: row.title,
        progress: row.progress,
        bookMarked: Boolean(row.bookMarked),
        downloaded: Boolean(row.downloaded),
        content: String(row.content),
      };

      return chapter;
    } catch (e) {
      console.error("Failed to get novel chapter:", e);
      throw e;
    }
  },

  async updateNovelChapterProgress({
    novelTitle,
    chapterNumber,
    chapterProgress,
  }: {
    novelTitle: string;
    chapterNumber: number;
    chapterProgress: number;
  }): Promise<boolean> {
    try {
      const result = await db_client
        .update(novelChapters)
        .set({ progress: chapterProgress })
        .where(
          and(
            eq(novelChapters.novelTitle, novelTitle),
            eq(novelChapters.number, chapterNumber),
            lt(novelChapters.progress, 100)
          )
        )
        .run();

      return result.changes > 0;
    } catch (e) {
      throw e;
    }
  },

  async downloadChapters(chapters: DownloadChapter[]): Promise<boolean> {
    try {
      if (chapters.length === 0) return false;

      const chaptersWithContent = chapters.filter(
        (chap): chap is DownloadChapter & { chapterContent: string } =>
          typeof chap.chapterContent === "string" &&
          chap.chapterContent.trim().length > 0
      );

      if (chaptersWithContent.length === 0) return false;

      const result = await db_client.transaction(async (tx) => {
        let totalChanges = 0;

        for (const { novelTitle, chapterNumber, chapterContent } of chapters) {
          const res = await tx
            .update(novelChapters)
            .set({ downloaded: 1, content: chapterContent })
            .where(
              and(
                eq(novelChapters.novelTitle, novelTitle),
                eq(novelChapters.number, chapterNumber)
              )
            )
            .run();

          totalChanges += res.changes;
        }

        return totalChanges;
      });

      return result > 0;
    } catch (e) {
      console.error("Failed to download chapters:", e);
      throw e;
    }
  },

  async removeDownloadedChapters(
    chapters: {
      novelTitle: string;
      chapterNumber: number;
    }[]
  ): Promise<boolean> {
    try {
      if (chapters.length === 0) return false;

      const totalChanges = await db_client.transaction(async (tx) => {
        let changesCount = 0;

        for (const { novelTitle, chapterNumber } of chapters) {
          const res = await tx
            .update(novelChapters)
            .set({ downloaded: 0, content: null })
            .where(
              and(
                eq(novelChapters.novelTitle, novelTitle),
                eq(novelChapters.number, chapterNumber)
              )
            )
            .run();

          changesCount += res.changes;
        }

        return changesCount;
      });

      return totalChanges > 0;
    } catch (e) {
      console.error("Failed to reset downloaded chapters:", e);
      throw e;
    }
  },
};
