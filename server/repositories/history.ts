import { db_client } from '../db/client';
import { novelChapters, novels } from '../db/schema';
import { desc, sql, eq, and } from 'drizzle-orm';
import type { ChapterHistory, HistoryBatch } from '@/types/history';

export const historyRepository = {
  async getHistory(): Promise<HistoryBatch[]> {
    const rows = await db_client
      .select({
        id: novelChapters.id,
        novelTitle: novelChapters.novelTitle,
        novelImage: novels.imageUrl,
        isNovelSaved: novels.isSaved,
        novelCustomImage: novels.customImageUri,
        chapterNumber: novelChapters.number,
        chapterProgress: novelChapters.progress,
        chapterTitle: novelChapters.title,
        readAt: novelChapters.readAt,
        downloaded: novelChapters.downloaded,
        isNovelRead: sql<boolean>`NOT EXISTS (
          SELECT 1
          FROM ${novelChapters} nc3
          WHERE nc3.novel_title = ${novelChapters.novelTitle}
          AND nc3.progress < 100
        )`,

        nextChapterNumber: sql<number | null>`(
          SELECT MIN(nc2.number)
          FROM ${novelChapters} AS nc2
          WHERE nc2.novel_title = ${novelChapters.novelTitle}
            AND nc2.number > ${novelChapters.number}
        )`,
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
          isNovelSaved: Boolean(r.isNovelSaved),
          novelCustomImage: r.novelCustomImage,
          chapterNumber: r.chapterNumber,
          chapterProgress: r.chapterProgress,
          nextChapterNumber: r.nextChapterNumber ?? null,
          readAt: r.readAt!,
          downloaded: Boolean(r.downloaded),
          isNovelRead: Boolean(r.isNovelRead),
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function getBucketKey(readAt: string): string {
      const date = new Date(readAt.slice(0, 10));
      date.setHours(0, 0, 0, 0);
      const daysDiff = Math.round((today.getTime() - date.getTime()) / (86400 * 1000));

      if (daysDiff === 0) return 'today';
      if (daysDiff < 7) return `${daysDiff}d`;

      const weeks = Math.floor(daysDiff / 7);
      if (weeks <= 3) return `${weeks}w`;

      const months =
        (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
      if (months < 12) return `${months}mo`;

      return `${today.getFullYear() - date.getFullYear()}y`;
    }

    const map = new Map<string, { readAt: string; chapters: ChapterHistory[] }>();
    for (const h of latest) {
      const key = getBucketKey(h.readAt);
      if (!map.has(key)) map.set(key, { readAt: h.readAt, chapters: [] });
      map.get(key)!.chapters.push(h);
    }

    return Array.from(map.values()).map<HistoryBatch>(({ readAt, chapters }) => ({
      readAt,
      chaptersHistory: chapters,
      isNovelRead: chapters.every((c) => c.isNovelRead),
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
          and(eq(novelChapters.novelTitle, novelTitle), eq(novelChapters.number, chapterNumber))
        )
        .run();

      return changes > 0;
    } catch (e) {
      console.error('Failed to remove chapter from history:', e);
      throw e;
    }
  },

  async removeNovelFromHistory({ novelTitle }: { novelTitle: string }): Promise<boolean> {
    try {
      const { changes } = await db_client
        .update(novelChapters)
        .set({ readAt: null })
        .where(eq(novelChapters.novelTitle, novelTitle))
        .run();

      return changes > 0;
    } catch (e) {
      console.error('Failed to remove novel from history:', e);
      throw e;
    }
  },

  async removeAllHistory(): Promise<boolean> {
    try {
      const { changes } = await db_client.update(novelChapters).set({ readAt: null }).run();

      return changes > 0;
    } catch (e) {
      console.error('Failed to remove all history:', e);
      throw e;
    }
  },
};
