import { Chapter, NovelInfo } from "@/types/novel";
import { db_client } from "../db/client";
import { novelCategories, novelChapters, novels } from "../db/schema";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { DownloadChapter } from "@/types/download";

export const novelRepository = {
  async findNovel({
    novelTitle,
  }: {
    novelTitle: NovelInfo["title"];
  }): Promise<(NovelInfo & { chapters: Chapter[] }) | null> {
    try {
      const novelRows = await db_client
        .select({
          title: novels.title,
          imageUrl: novels.imageUrl,
          customImageUri: novels.customImageUri,
          description: novels.description,
          rating: novels.rating,
          rank: novels.rank,
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
          readAt: novelChapters.readAt,
        })
        .from(novelChapters)
        .where(eq(novelChapters.novelTitle, novelTitle))
        .orderBy(novelChapters.number);

      const categoryRows = await db_client
        .select({ categoryId: novelCategories.categoryId })
        .from(novelCategories)
        .where(eq(novelCategories.novelTitle, novelTitle));

      const novelInfo: NovelInfo & { chapters: Chapter[] } = {
        title: novelRow.title,
        imageUrl: novelRow.imageUrl,
        customImageUri: novelRow.customImageUri,
        description: novelRow.description,
        rating: novelRow.rating,
        rank: novelRow.rank,
        author: novelRow.author,
        genres: novelRow.genres,
        status: novelRow.status,
        isSaved: Boolean(novelRow.isSaved),
        categoriesIds: categoryRows.map((c) => c.categoryId),
        chapters: chapterRows.map((c) => ({
          id: Number(c.id),
          novelTitle: novelTitle,
          number: Number(c.number),
          title: String(c.title),
          progress: Number(c.progress),
          bookMarked: Boolean(c.bookMarked),
          downloaded: Boolean(c.downloaded),
          content: c.content === null ? "" : String(c.content),
          readAt: String(c.readAt),
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
          imageUrl: novel.imageUrl,
          description: novel.description,
          rank: novel.rank ?? 0,
          rating: novel.rating ?? 0,
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

        if (!saved) {
          await tx
            .delete(novelCategories)
            .where(eq(novelCategories.novelTitle, title))
            .run();
          return;
        }

        await tx
          .delete(novelCategories)
          .where(eq(novelCategories.novelTitle, title))
          .run();

        if (categoriesId && categoriesId.length > 0) {
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
            imageUrl: novel.imageUrl,
            description: novel.description,
            rating: novel.rating ?? 0,
            rank: novel.rank ?? 0,
            author: novel.author,
            genres: novel.genres,
            status: novel.status,
          })
          .onConflictDoUpdate({
            target: novels.title,
            set: {
              imageUrl: novel.imageUrl,
              description: novel.description,
              rating: novel.rating,
              rank: novel.rank,
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

      if (!row) return null;

      const next = await db_client
        .select({
          number: novelChapters.number,
          title: novelChapters.title,
          downloaded: novelChapters.downloaded,
        })
        .from(novelChapters)
        .where(
          and(
            eq(novelChapters.novelTitle, novelTitle),
            gt(novelChapters.number, chapterNumber)
          )
        )
        .orderBy(asc(novelChapters.number))
        .limit(1)
        .get();

      const previous = await db_client
        .select({
          number: novelChapters.number,
          title: novelChapters.title,
          downloaded: novelChapters.downloaded,
        })
        .from(novelChapters)
        .where(
          and(
            eq(novelChapters.novelTitle, novelTitle),
            lt(novelChapters.number, chapterNumber)
          )
        )
        .orderBy(desc(novelChapters.number))
        .limit(1)
        .get();

      const chapter: Chapter = {
        novelTitle: row.novelTitle,
        number: row.number,
        title: row.title,
        progress: row.progress,
        bookMarked: Boolean(row.bookMarked),
        downloaded: Boolean(row.downloaded),
        content: String(row.content),
        previousChapter: previous
          ? {
              number: previous.number,
              title: previous.title,
              downloaded: Boolean(previous.downloaded),
            }
          : undefined,
        nextChapter: next
          ? {
              number: next.number,
              title: next.title,
              downloaded: Boolean(next.downloaded),
            }
          : undefined,
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

  async updateNovelChapterReadAt({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    const { changes } = await db_client
      .update(novelChapters)
      .set({ readAt: sql`DATETIME('now', 'localtime')` })
      .where(
        and(
          eq(novelChapters.novelTitle, novelTitle),
          eq(novelChapters.number, chapterNumber)
        )
      )
      .run();

    return changes > 0;
  },

  async updateNovelCustomImage(
    novelTitle: NovelInfo["title"],
    customImageUri: string
  ): Promise<boolean> {
    try {
      await db_client.transaction(async (tx) => {
        await tx
          .update(novels)
          .set({
            customImageUri: customImageUri === "" ? null : customImageUri,
          })
          .where(eq(novels.title, novelTitle))
          .run();

        return true;
      });

      return true;
    } catch (e) {
      console.error("Failed to update novel cover:", e);
      throw e;
    }
  },

  async downloadChapter(chapter: DownloadChapter): Promise<boolean> {
    try {
      const { novelTitle, chapterNumber, chapterContent } = chapter;

      if (
        typeof chapterContent !== "string" ||
        chapterContent.trim().length === 0
      ) {
        return false;
      }

      const res = await db_client.transaction(async (tx) => {
        const result = await tx
          .update(novelChapters)
          .set({ downloaded: 1, content: chapterContent })
          .where(
            and(
              eq(novelChapters.novelTitle, novelTitle),
              eq(novelChapters.number, chapterNumber)
            )
          )
          .run();
        return result;
      });

      return (res?.changes ?? 0) > 0;
    } catch (e) {
      console.error("Failed to download chapter:", e);
      throw e;
    }
  },

  async removeDownloadedChapters(
    chapters: Array<{ novelTitle: string; chapterNumber: number }>
  ): Promise<boolean> {
    if (!Array.isArray(chapters)) {
      throw new Error("Expected chapters to be an array");
    }
    const valid: typeof chapters = [];
    const skipped: typeof chapters = [];

    for (const ch of chapters) {
      if (
        ch &&
        typeof ch.novelTitle === "string" &&
        Number.isInteger(ch.chapterNumber)
      ) {
        valid.push(ch);
      } else {
        skipped.push(ch);
      }
    }
    if (valid.length === 0) {
      return false;
    }

    try {
      const groups = valid.reduce<Record<string, number[]>>(
        (acc, { novelTitle, chapterNumber }) => {
          acc[novelTitle] = acc[novelTitle] || [];
          acc[novelTitle].push(chapterNumber);
          return acc;
        },
        {}
      );

      const totalChanges = await db_client.transaction(async (tx) => {
        let changes = 0;

        for (const [novelTitle, numbers] of Object.entries(groups)) {
          const uniqueNumbers = Array.from(new Set(numbers)).sort(
            (a, b) => a - b
          );

          const res = await tx
            .update(novelChapters)
            .set({ downloaded: 0, content: null })
            .where(
              and(
                eq(novelChapters.novelTitle, novelTitle),
                inArray(novelChapters.number, uniqueNumbers)
              )
            )
            .run();

          changes += res.changes;
        }

        return changes;
      });

      return totalChanges > 0;
    } catch (e) {
      console.error("Failed to reset downloaded chapters:", e);
      throw e;
    }
  },

  async removeAllDownloadedChaptersFromNovels(
    novelTitles: NovelInfo["title"][]
  ): Promise<boolean> {
    const uniqueNovels = Array.from(new Set(novelTitles)).sort();

    try {
      const result = await db_client.transaction(async (tx) => {
        const res = await tx
          .update(novelChapters)
          .set({ downloaded: 0, content: null })
          .where(
            and(
              eq(novelChapters.downloaded, 1),
              inArray(novelChapters.novelTitle, uniqueNovels)
            )
          )
          .run();

        return res;
      });

      return result.changes > 0;
    } catch (e) {
      console.error("Failed to remove downloaded chapters:", e);
      throw e;
    }
  },

  async markChaptersAsBookmarked({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    if (chapterNumbers.length === 0) return true;

    const filter = and(
      eq(novelChapters.novelTitle, novelTitle),
      inArray(novelChapters.number, chapterNumbers)
    );

    const { changes } = await db_client
      .update(novelChapters)
      .set({ bookMarked: 1 })
      .where(filter)
      .run();

    if (changes === 0) {
      throw new Error("NO_CHAPTERS_UPDATED");
    }

    return true;
  },

  async unMarkChaptersAsBookmarked({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    if (chapterNumbers.length === 0) return true;

    const filter = and(
      eq(novelChapters.novelTitle, novelTitle),
      inArray(novelChapters.number, chapterNumbers)
    );

    const { changes } = await db_client
      .update(novelChapters)
      .set({ bookMarked: 0 })
      .where(filter)
      .run();

    if (changes === 0) {
      throw new Error("NO_CHAPTERS_UPDATED");
    }

    return true;
  },

  async toggleBookmarkChapter({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    const filter = and(
      eq(novelChapters.novelTitle, novelTitle),
      eq(novelChapters.number, chapterNumber)
    );

    const chapter = await db_client
      .select({ bookMarked: novelChapters.bookMarked })
      .from(novelChapters)
      .where(filter)
      .get();

    if (!chapter) {
      throw new Error("NO_CHAPTER_FOUND");
    }

    const newBookmarked = chapter.bookMarked === 1 ? 0 : 1;

    const { changes } = await db_client
      .update(novelChapters)
      .set({ bookMarked: newBookmarked })
      .where(filter)
      .run();

    if (changes === 0) {
      throw new Error("NO_CHAPTERS_UPDATED");
    }
    return true;
  },

  async markChaptersAsRead({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    if (chapterNumbers.length === 0) return true;

    const filter = and(
      eq(novelChapters.novelTitle, novelTitle),
      inArray(novelChapters.number, chapterNumbers)
    );

    const { changes } = await db_client
      .update(novelChapters)
      .set({ progress: 100 })
      .where(filter)
      .run();

    if (changes === 0) {
      throw new Error("NO_CHAPTERS_UPDATED");
    }
    return true;
  },

  async unMarkChaptersAsRead({
    novelTitle,
    chapterNumbers,
  }: {
    novelTitle: string;
    chapterNumbers: number[];
  }): Promise<boolean> {
    if (chapterNumbers.length === 0) return true;

    const filter = and(
      eq(novelChapters.novelTitle, novelTitle),
      inArray(novelChapters.number, chapterNumbers)
    );

    const { changes } = await db_client
      .update(novelChapters)
      .set({ progress: 0 })
      .where(filter)
      .run();

    if (changes === 0) {
      throw new Error("NO_CHAPTERS_UPDATED");
    }
    return true;
  },

  async markChaptersBeforeAsRead({
    novelTitle,
    uptoChapter,
  }: {
    novelTitle: string;
    uptoChapter: number;
  }): Promise<boolean> {
    if (uptoChapter <= 1) return true;

    const { changes } = await db_client
      .update(novelChapters)
      .set({ progress: 100 })
      .where(
        and(
          eq(novelChapters.novelTitle, novelTitle),
          lt(novelChapters.number, uptoChapter)
        )
      )
      .run();

    return changes > 0;
  },
};
