import { db_client } from "../db/client";
import { novelChapters, novels } from "../db/schema";
import { desc, sql, eq, and } from "drizzle-orm";
import type { ChapterHistory, HistoryBatch } from "@/types/history";

export const historyRepository = {
  async getHistory(): Promise<HistoryBatch[]> {
    const rows = await db_client
      .select({
        id: novelChapters.id,
        novelTitle: novelChapters.novelTitle,
        novelImage: novels.imageUrl,
        novelCustomImage: novels.customImageUri,
        chapterNumber: novelChapters.number,
        chapterTitle: novelChapters.title,
        readAt: novelChapters.readAt,
        downloaded: novelChapters.downloaded,
      })
      .from(novelChapters)
      .leftJoin(novels, eq(novelChapters.novelTitle, novels.title))
      .where(sql`${novelChapters.readAt} IS NOT NULL`)
      .orderBy(desc(novelChapters.readAt))
      .all();

    const seen = new Set<string>();
    const latest: ChapterHistory[] = [];
    for (const r of rows) {
      if (!seen.has(r.novelTitle)) {
        seen.add(r.novelTitle);
        latest.push({
          id: r.id,
          novelTitle: r.novelTitle,
          novelImage: r.novelImage!,
          novelCustomImage: r.novelCustomImage,
          chapterNumber: r.chapterNumber,
          chapterTitle: r.chapterTitle,
          readAt: r.readAt!,
          downloaded: Boolean(r.downloaded),
        });
      }
    }

    const map = new Map<string, ChapterHistory[]>();
    for (const h of latest) {
      const day = h.readAt.slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(h);
      map.set(day, arr);
    }

    const sortedDays = Array.from(map.keys()).sort((a, b) => (a > b ? -1 : 1));
    return sortedDays.map<HistoryBatch>((day) => ({
      readAt: day,
      chaptersHistory: map.get(day)!,
    }));
  },

  async removeChapterFromHistory({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }): Promise<boolean> {
    try {
      const { changes } = await db_client
        .update(novelChapters)
        .set({ readAt: null })
        .where(
          and(
            eq(novelChapters.novelTitle, novelTitle),
            eq(novelChapters.number, chapterNumber)
          )
        )
        .run();

      return changes > 0;
    } catch (e) {
      console.error("Failed to remove chapter from history:", e);
      throw e;
    }
  },

  async removeNovelFromHistory({
    novelTitle,
  }: {
    novelTitle: string;
  }): Promise<boolean> {
    try {
      const { changes } = await db_client
        .update(novelChapters)
        .set({ readAt: null })
        .where(eq(novelChapters.novelTitle, novelTitle))
        .run();

      return changes > 0;
    } catch (e) {
      console.error("Failed to remove novel from history:", e);
      throw e;
    }
  },

  async removeAllHistory(): Promise<boolean> {
    try {
      const { changes } = await db_client
        .update(novelChapters)
        .set({ readAt: null })
        .run();

      return changes > 0;
    } catch (e) {
      console.error("Failed to remove all history:", e);
      throw e;
    }
  },
};
