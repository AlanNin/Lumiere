import { sql } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: int().primaryKey({ autoIncrement: true }),
  label: text().notNull(),
  sortOrder: int("sort_order")
    .notNull()
    .default(
      sql`(
          SELECT COALESCE(MAX(sort_order), 0) + 1
          FROM categories
        )`
    ),
});

export const novels = sqliteTable("novels", {
  title: text().primaryKey(),
  url: text().notNull(),
  imageUrl: text().notNull(),
  description: text().notNull(),
  rating: int().notNull(),
  author: text().notNull(),
  genres: text().notNull(),
  status: text().notNull(),
  categoryId: int("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
});

export const novelChapters = sqliteTable(
  "novel_chapters",
  {
    id: int().primaryKey({ autoIncrement: true }),
    novelTitle: text("novel_title")
      .notNull()
      .references(() => novels.title, { onDelete: "cascade" }),
    number: int().notNull(),
    title: text().notNull(),
    progress: int()
      .notNull()
      .default(sql`0`),
    bookMark: int("book_mark")
      .notNull()
      .default(sql`0`),
    downloaded: int("downloaded")
      .notNull()
      .default(sql`0`),
    content: text(),
  },
  (table) => [
    index("novel_title_chapter_number_idx").on(table.novelTitle, table.number),
  ]
);

export const novelRelations = relations(novels, ({ many, one }) => ({
  chapters: many(novelChapters),
  category: one(categories, {
    fields: [novels.categoryId],
    references: [categories.id],
  }),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  novels: many(novels),
}));
