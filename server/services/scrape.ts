import { Chapter, Novel, NovelInfo } from "@/types/novel";
import cheerio from "cheerio";
import { extractChapterTitle, insertTitleHtml, sanitizeHtml } from "@/lib/html";
import { colors } from "@/lib/constants";
import {
  ScrapeNovelChapter,
  ScrapeNovelInfo,
  ScrapeNovelsExplore,
  ScrapeNovelsSearch,
} from "@/types/scrape";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  "Content-Type": "application/x-www-form-urlencoded",
};

export async function scrapeNovelsExplore({
  novelsExploreUrl,
}: ScrapeNovelsExplore): Promise<{ novels: Novel[]; totalPages: number }> {
  const response = await fetch(novelsExploreUrl, { headers: DEFAULT_HEADERS });
  if (!response.ok) {
    throw new Error(`Failed to fetch explore page: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const novels: Novel[] = [];

  // Each novel-item under #list-novel
  $("#list-novel .novel-item").each((_: number, el: cheerio.Element) => {
    const anchor = $(el).find("a").first();
    const title =
      anchor.attr("title")?.trim() || anchor.find(".novel-title").text().trim();
    const url = anchor.attr("href") || "";

    // Fetch Image
    const imgEl = anchor.find("figure.novel-cover img").first();
    const dataSrc = imgEl.attr("data-src")?.trim();
    const src = imgEl.attr("src")?.trim();
    const imageUrl = dataSrc
      ? dataSrc
      : src && !src.startsWith("data:")
      ? src
      : "";

    // Rank badge: <span class="badge _bl">R 11774</span>
    const rankText = anchor.find("span.badge._bl").text().trim();
    const rankMatch = rankText.match(/(\d+)/);
    const rank = rankMatch ? parseInt(rankMatch[1], 10) : undefined;

    if (title && url) {
      novels.push({ title, imageUrl, rank });
    }
  });

  // Determine totalPages by scanning all pagination links for ?page=N
  let totalPages = 1;
  $('.pagination a.page-link[href*="?page="]').each(
    (_: number, link: cheerio.Element) => {
      const href = $(link).attr("href")!;
      const m = href.match(/[?&]page=(\d+)/);
      if (m) {
        totalPages = Math.max(totalPages, parseInt(m[1], 10));
      }
    }
  );

  return { novels, totalPages };
}

export async function scrapeNovelsSearch({
  searchNovelsUrl,
}: ScrapeNovelsSearch): Promise<{ novels: Novel[] }> {
  const response = await fetch(searchNovelsUrl, {
    headers: DEFAULT_HEADERS,
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch search results for "${searchNovelsUrl}"`);
  }

  const { html: rawHtml } = (await response.json()) as { html: string };
  const $ = cheerio.load(rawHtml);

  const novels: Novel[] = [];

  $(".novel-item").each((_: number, el: cheerio.Element) => {
    const anchor = $(el).find("a").first();
    const title = anchor.find(".novel-title").text().trim();
    const novelUrl = anchor.attr("href") ?? "";
    const imageUrl = anchor.find(".novel-cover img").attr("src") ?? "";
    // extract rank from the first .novel-stats strong, e.g. "Rank 98"
    const rankText = anchor.find(".novel-stats strong").text().trim();
    const rankMatch = rankText.match(/Rank\s+(\d+)/i);
    const rank = rankMatch ? parseInt(rankMatch[1], 10) : undefined;

    if (title && novelUrl) {
      novels.push({
        title,
        imageUrl,
        rank: rank,
      });
    }
  });

  return { novels };
}

export async function scrapeNovelInfo({
  novelInfoUrl,
  novelChaptersUrl,
}: ScrapeNovelInfo): Promise<NovelInfo | null> {
  // Fetch both the info page and the chapters list in parallel
  const [htmlInfo, htmlChapters] = await Promise.all([
    fetch(novelInfoUrl, { headers: DEFAULT_HEADERS }).then((r) => r.text()),
    fetch(novelChaptersUrl, { headers: DEFAULT_HEADERS }).then((r) => r.text()),
  ]);

  if (!htmlInfo || !htmlChapters) {
    throw new Error("Novel not found");
  }

  const $ = cheerio.load(htmlInfo);
  const $$ = cheerio.load(htmlChapters);

  // ——— Novel metadata —————————————————————————————————————————————
  // Full title from the header
  const title = $("header.novel-header h1.novel-title").text().trim();
  if (!title) return null;

  // Cover image URL (prefers lazy-loaded data-src)
  const imageUrl =
    $("header.novel-header .cover img").attr("data-src") ||
    $("header.novel-header .cover img").attr("src") ||
    "";

  // Collect all authors (there may be more than one)
  const authors = $(
    'header.novel-header .author a.property-item span[itemprop="author"]'
  )
    .map((_: number, el: cheerio.Element) => $(el).text().trim())
    .get()
    .join(", ");

  // Star rating from the data-rating attribute
  const ratingRaw = parseFloat(
    $(".rating-star .my-rating").attr("data-rating") || "0"
  );
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : 0;

  // Rank from the rank text
  const rankText = $(".rating .rank strong").text().trim();
  const rankMatch = rankText.match(/\d+/);
  const rank = rankMatch ? parseInt(rankMatch[0], 10) : 0;

  // Status (Completed, Ongoing, etc.)
  const status =
    $(".header-stats .completed").text().trim() ||
    $('.header-stats span small:contains("Status")')
      .prev("strong")
      .text()
      .trim() ||
    "";

  // Genres list
  const genres = $(".categories ul li a.property-item")
    .map((_: number, el: cheerio.Element) => $(el).text().trim())
    .get()
    .join(",");

  // Description
  const summaryParas: string[] = $("div.summary .content p")
    .map((_: number, p: cheerio.Element) => $(p).text().trim())
    .get()
    .filter((t: string) => t.length > 0)
    .filter((t: string) => /[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/.test(t));

  let description: string;
  if (summaryParas.length > 0) {
    description = summaryParas.join("\n\n");
  } else {
    description =
      $('article[itemprop="itemReviewed"] meta[itemprop="description"]')
        .attr("content")
        ?.trim() || "";
  }

  // ——— Chapters parsing —————————————————————————————————————————————————————
  const items = $$(".list-chapter li").toArray();
  const chapters: Chapter[] = items
    .map((liEl: cheerio.Element, idx: number) => {
      const li = $$(liEl);
      const rawText = li.find(".nchr-text, .chapter-title").text().trim();
      const url = li.find("a").attr("href") || "";

      const numMatch = rawText.match(/^(?:Chapter\s*)?(\d+)/i);
      const number = numMatch ? parseInt(numMatch[1], 10) : idx;

      const title = extractChapterTitle(rawText);
      return { number, title, url };
    })
    .sort((a: Chapter, b: Chapter) => a.number - b.number);

  // ——— Build and return the result —————————————————————————————————————————————
  return {
    title,
    imageUrl,
    rating,
    rank,
    genres,
    status,
    author: authors,
    description,
    chapters,
  };
}

export async function scrapeNovelChapter({
  novelChapterUrl,
  chapterNumber,
}: ScrapeNovelChapter): Promise<Chapter | null> {
  const res = await fetch(novelChapterUrl, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch chapter from ${novelChapterUrl}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // --- 1) Novel title ---
  const $titleLink = $(".titles a.booktitle").first();
  const novelTitle =
    $titleLink.attr("title")?.trim() || $titleLink.text().trim() || "";

  // --- 2) Raw chapter title, e.g. "Chapter 1 Just an old Book" ---
  const rawTitle = $(".titles .chapter-title").first().text().trim();

  // --- 3) Parse out number & subtitle safely ---
  let number: number;

  const title = extractChapterTitle(rawTitle);
  const onlyNum = rawTitle.match(/^Chapter\s*(\d+)\s*$/i);
  const withSub = rawTitle.match(/^Chapter\s*(\d+)[\s:-]+\s*(.+)$/i);

  if (onlyNum) {
    number = parseInt(onlyNum[1], 10);
  } else if (withSub) {
    number = parseInt(withSub[1], 10);
  } else {
    // fallback if the site changed format
    const fallback = rawTitle.match(/^(\d+)/);
    number = fallback ? parseInt(fallback[1], 10) : chapterNumber;
  }

  // --- 4) Chapter content ---
  // pick up only the reader HTML
  const $contentDiv = $("#chapter-container #content");
  if (!$contentDiv.length) {
    throw new Error("Couldn't find the chapter content container");
  }
  const dirtyHtml = $contentDiv.html()!.trim();

  // sanitize & wrap
  const cleanHtml = sanitizeHtml(dirtyHtml);
  const htmlWithTitle = insertTitleHtml(title, number, cleanHtml);
  const body = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          :root, html, body {
            background-color: ${colors.background};
            color: ${colors.grayscale_foreground};
          }
        </style>
      </head>
      <body>
        ${htmlWithTitle}
      </body>
    </html>`;

  return {
    novelTitle,
    number,
    title,
    content: body,
  };
}
