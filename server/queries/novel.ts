import { Explore } from "@/types/explore";
import {
  getExploreSection,
  getExploreSearch,
  getNovelInfo,
  getNovelChapter,
} from "../services/novel";
import { Chapter, NovelInfo } from "@/types/novel";

export type ExploreSection =
  | "popular"
  | "latest-releases"
  | "completed"
  | "search";

export const novelService = {
  async exploreNovels({
    section,
    pageNumber = 1,
    searchQuery,
  }: {
    section: ExploreSection;
    pageNumber?: number;
    searchQuery?: string;
  }): Promise<Explore> {
    try {
      let data: Explore;

      if (section === "search") {
        data = await getExploreSearch({ searchQuery: searchQuery ?? "" });
      } else {
        data = await getExploreSection({ section, pageNumber });
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async getNovelInfo({ title }: { title: string }): Promise<NovelInfo> {
    try {
      let data: NovelInfo;

      data = await getNovelInfo({ title });

      return data;
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
    try {
      let data: Chapter;

      data = await getNovelChapter({ title, chapterNumber });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
