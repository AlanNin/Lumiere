import { Chapter, Novel, NovelInfo } from "@/types/novel";
import cheerio from "cheerio";
import { ExploreSection } from "../controllers/novel";
import { extractChapterTitle, insertTitleHtml, sanitizeHtml } from "@/lib/html";
import { colors } from "@/lib/constants";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  "Content-Type": "application/x-www-form-urlencoded",
};

const EXPLORE_SECTION_MAP: Record<ExploreSection, string> = {
  popular: "most-popular-novels",
  "latest-releases": "latest-release-novels",
  completed: "completed-novels",
  search: "",
};

export async function scrapeNovelsExplore(
  section: ExploreSection,
  pageNumber: number
): Promise<{ novels: Novel[]; totalPages: number }> {
  const url = `https://lightnovelpub.me/list/${EXPLORE_SECTION_MAP[section]}/${pageNumber}`;

  const response = await fetch(url, { headers: DEFAULT_HEADERS });

  const html = await response.text();

  const $ = cheerio.load(html);
  const novels: Novel[] = [];

  $(".ul-list1 .li-row").each((_: number, el: cheerio.Element) => {
    const titleElement = $(el).find(".txt h3.tit a");
    const imageElement = $(el).find(".pic a img");
    const ratingElement = $(el).find(".core span");

    const title = titleElement.text().trim();
    const url = titleElement.attr("href");
    const imageUrl = imageElement.attr("src");
    const rating = ratingElement.text().trim();

    if (title && url) {
      novels.push({
        title,
        imageUrl,
        rating,
      });
    }
  });

  let totalPages = 1;
  const lastPageHref = $("li.last a").attr("href");
  const match = lastPageHref?.match(/\/(\d+)(\/)?$/);
  if (match?.[1]) {
    totalPages = parseInt(match[1], 10);
  }

  return { novels, totalPages };
}

export async function scrapeNovelsSearch(
  searchQuery: string
): Promise<{ novels: Novel[] }> {
  const url = "https://lightnovelpub.me/search/";

  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    method: "POST",
    body: `searchkey=${encodeURIComponent(searchQuery)}`,
  });

  const html = await response.text();

  const $ = cheerio.load(html);
  const novels: Novel[] = [];

  $(".ul-list1 .li-row").each((_: number, el: cheerio.Element) => {
    const titleElement = $(el).find(".txt h3.tit a");
    const imageElement = $(el).find(".pic a img");
    const ratingElement = $(el).find(".core span");

    const title = titleElement.text().trim();
    const url = titleElement.attr("href");
    const imageUrl = imageElement.attr("src");
    const rating = ratingElement.text().trim();

    if (title && url) {
      novels.push({
        title,
        imageUrl,
        rating,
      });
    }
  });

  return { novels };
}

export async function scrapeNovelInfo(
  novelTitleSlug: string
): Promise<NovelInfo | null> {
  const novelInfoUrl = `https://lightnovelpub.me/book/${novelTitleSlug}`;
  const novelChaptersUrl = `https://novelbin.com/ajax/chapter-archive?novelId=${novelTitleSlug}`;
  const [novelInfoHtml, novelChaptersHtml] = await Promise.all([
    fetch(novelInfoUrl, { headers: DEFAULT_HEADERS }).then((r) => r.text()),
    fetch(novelChaptersUrl, { headers: DEFAULT_HEADERS }).then((r) => r.text()),
  ]);
  if (!novelInfoHtml || !novelChaptersHtml) {
    throw new Error("Novel not found");
  }
  const NI$ = cheerio.load(novelInfoHtml);
  const NC$ = cheerio.load(novelChaptersHtml);

  // ——— Novel metadata —————————————————————————————————————————————————
  const rawTitle = NI$(".m-info h3.tit").text().trim();
  const fullTitle = rawTitle.replace(/\.+$/, "");
  if (!fullTitle) return null;

  const ratingRaw = parseFloat(
    NI$(".score p.vote").first().text().split("/")[0]
  );
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : 0;

  const rawDesc = NI$(".m-desc .txt .inner").text().trim();
  const description = rawDesc
    .replace(/You['']?re reading[\s\S]*?free on [^\.!?]+[\.!?]?/i, "")
    .replace(/\s*com !$/i, "")
    .trim();

  const genresArray = NI$(".m-book1 .txt .glyphicon-th-list")
    .next(".right")
    .find("a")
    .map((_: number, a: cheerio.Element) => NI$(a).text().trim())
    .get();

  const author = NI$(".m-book1 .txt .glyphicon-user")
    .next(".right")
    .find("a")
    .first()
    .text()
    .trim();

  const status = NI$(".m-book1 .txt .glyphicon-time")
    .next(".right")
    .text()
    .trim();

  const imageUrl = NI$(".m-book1 .pic img").attr("src") || "";

  // ——— Chapters —————————————————————————————————————————————————————
  const items = NC$(".list-chapter li").toArray();
  const chapters: Chapter[] = items
    .map((liEl: cheerio.Element, idx: number) => {
      const li = NC$(liEl);
      const rawText = li.find(".nchr-text, .chapter-title").text().trim();
      const url = li.find("a").attr("href") || "";

      const numberMatch = rawText.match(/^(?:Chapter\s*)?(\d+)/i);
      let number: number;
      if (numberMatch) {
        number = parseInt(numberMatch[1], 10);
      } else {
        number = idx + 1;
      }

      const title = extractChapterTitle(rawText);

      return { number, title, url };
    })
    .filter((ch: Chapter): ch is Chapter => ch.number > 0)
    .sort((a: Chapter, b: Chapter) => a.number - b.number);

  // ——— Build and return —————————————————————————————————————————————
  const novelInfo: NovelInfo = {
    title: fullTitle,
    url: novelInfoUrl,
    imageUrl,
    rating,
    genres: genresArray.join(","),
    status,
    author,
    description,
    chapters,
  };
  return novelInfo;
}

export async function scrapeNovelChapter(
  chapterUrl: string,
  chapterNumber: number
): Promise<Chapter | null> {
  const res = await fetch(chapterUrl, { headers: DEFAULT_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch chapter ${chapterNumber}`);
  const html = await res.text();

  if (!html) throw new Error("Novel chapter not found");

  const $ = cheerio.load(html);
  const chr = $("#chapter");
  if (chr.length === 0) return null;

  const novelTitle =
    $(".col-xs-12 a.novel-title").first().attr("title")?.trim() ||
    $(".col-xs-12 a.novel-title").first().text().trim();

  const rawTitle = chr
    .find("h2 a.chr-title span.chr-text")
    .first()
    .text()
    .trim();

  const onlyNumberMatch = rawTitle.match(/^Chapter\s*(\d+)\s*$/i);

  const sepMatch = rawTitle.match(/^Chapter\s*(\d+)\s*(?:[:\-])\s*(.+)$/i);
  const number = sepMatch ? parseInt(sepMatch[1], 10) : chapterNumber;
  const title = sepMatch
    ? sepMatch[2].trim()
    : rawTitle.replace(/^[^A-Za-z0-9]+/, "").trim();

  const dirtyHtml = chr.find("#chr-content").html()?.trim() ?? "";

  const cleanHtml = sanitizeHtml(dirtyHtml);

  const htmlWithTitle = insertTitleHtml(title, chapterNumber, cleanHtml);

  const htmlContent = `
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

  if (onlyNumberMatch) {
    return {
      novelTitle,
      number: parseInt(onlyNumberMatch[1], 10),
      title: "",
      url: chapterUrl,
      content: htmlContent,
    };
  }

  return {
    novelTitle,
    number,
    title,
    url: chapterUrl,
    content: htmlContent,
  };
}
