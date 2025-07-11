import slugify from "./slug";

export function getNovelUrl(novelTitle: string) {
  const novelTitleSlug = slugify(novelTitle);

  return `https://novelfire.net/book/${novelTitleSlug}`;
}
