import {
  Chapter,
  NovelChaptersFilter,
  NovelChaptersSortUI,
} from "@/types/novel";
import slugify from "./slug";

export function getNovelUrl(novelTitle: string) {
  const novelTitleSlug = slugify(novelTitle);

  return `https://novelfire.net/book/${novelTitleSlug}`;
}

export function applyNovelChaptersFiltersAndSort(
  chapters: Chapter[],
  filters: Record<string, NovelChaptersFilter["value"]>,
  sort: NovelChaptersSortUI
): Chapter[] {
  let list = [...chapters];

  for (const [key, value] of Object.entries(filters)) {
    if (value === "checked") {
      if (key === "downloaded") list = list.filter((c) => c.downloaded);
      if (key === "bookmarked") list = list.filter((c) => c.bookMarked);
      if (key === "unread") list = list.filter((c) => c.progress! < 100);
    } else if (value === "indeterminate") {
      if (key === "downloaded") list = list.filter((c) => !c.downloaded);
      if (key === "bookmarked") list = list.filter((c) => !c.bookMarked);
      if (key === "unread") list = list.filter((c) => c.progress === 100);
    }
  }

  const ascOrder = sort.order === "asc";
  list.sort((a, b) => (ascOrder ? a.number - b.number : b.number - a.number));

  return list;
}
