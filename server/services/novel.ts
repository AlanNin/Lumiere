import { Explore } from "@/types/explore";
import { Chapter, NovelInfo } from "@/types/novel";
import { ExploreSection } from "../controllers/novel";
import {
  scrapeNovelChapter,
  scrapeNovelInfo,
  scrapeNovelsExplore,
  scrapeNovelsSearch,
} from "./scrape";
import { novelRepository } from "../repositories/novel";
import { tryAndReTry } from "@/lib/retry";

export const novelService = {
  async getExploreSection({
    section,
    pageNumber = 1,
  }: {
    section: ExploreSection;
    pageNumber?: number;
  }): Promise<Explore> {
    if (section === "search") {
      throw new Error("Use scrapeExploreSearch() for search section.");
    }

    const { novels, totalPages } = await scrapeNovelsExplore(
      section,
      pageNumber
    );

    return {
      items: novels,
      totalItems: novels.length,
      pageNumber,
      totalPages,
    };
  },

  async getExploreSearch({
    searchQuery,
  }: {
    searchQuery: string;
  }): Promise<Explore> {
    if (searchQuery.length === 0) {
      throw new Error("Search query cannot be empty.");
    }

    const { novels } = await scrapeNovelsSearch(searchQuery);

    return {
      items: novels,
      totalItems: novels.length,
    };
  },

  async getNovelInfo({ title }: { title: string }): Promise<NovelInfo> {
    try {
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      let info: NovelInfo | null = null;

      info = await novelRepository.findNovel(title);

      if (info) {
        return info;
      }

      info = await tryAndReTry<NovelInfo>(slug, scrapeNovelInfo);
      await novelRepository.saveNovel(info);

      return info;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async getNovelChapter({
    title,
    chapterNumber,
  }: {
    title: string;
    chapterNumber: number;
  }): Promise<Chapter> {
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    let result: Chapter | null = null;
    try {
      result = await scrapeNovelChapter(slug, chapterNumber);
    } catch (err) {
      result = null;
    }

    if (result) {
      return result;
    }

    const fallbackSlug = `${slug}-novel`;
    try {
      const fallbackResult = await scrapeNovelChapter(
        fallbackSlug,
        chapterNumber
      );
      if (fallbackResult) {
        return fallbackResult;
      }
    } catch (err) {
      throw new Error(`Novel chapter not found: ${title}`);
    }

    throw new Error(`Novel chapter not found: ${title}`);
  },
};
