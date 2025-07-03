import { Explore } from "@/types/explore";
import { Chapter, NovelInfo } from "@/types/novel";
import { ExploreSection } from "../queries/novel";
import {
  scrapeNovelChapter,
  scrapeNovelInfo,
  scrapeNovelsExplore,
  scrapeNovelsSearch,
} from "./scrape";

export async function getExploreSection({
  section,
  pageNumber = 1,
}: {
  section: ExploreSection;
  pageNumber?: number;
}): Promise<Explore> {
  if (section === "search") {
    throw new Error("Use scrapeExploreSearch() for search section.");
  }

  const { novels, totalPages } = await scrapeNovelsExplore(section, pageNumber);

  return {
    items: novels,
    totalItems: novels.length,
    pageNumber,
    totalPages,
  };
}

export async function getExploreSearch({
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
}

export async function getNovelInfo({
  title,
}: {
  title: string;
}): Promise<NovelInfo> {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  let info: NovelInfo | null = null;
  try {
    info = await scrapeNovelInfo(slug);
  } catch (err) {
    info = null;
  }
  if (info) {
    return info;
  }

  const fallbackSlug = `${slug}-novel`;
  try {
    const fallbackInfo = await scrapeNovelInfo(fallbackSlug);
    if (fallbackInfo) {
      return fallbackInfo;
    }
  } catch (err) {
    throw new Error(`Novel not found: ${title}`);
  }

  throw new Error(`Novel not found: ${title}`);
}

export async function getNovelChapter({
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
}
