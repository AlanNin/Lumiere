import { sql } from "drizzle-orm";
import {
  index,
  int,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: int().primaryKey({ autoIncrement: true }),
  label: text().notNull(),
  sortOrder: int("sort_order").notNull(),
});

export const novelCategories = sqliteTable(
  "novel_categories",
  {
    novelTitle: text("novel_title")
      .notNull()
      .references(() => novels.title, { onDelete: "cascade" }),
    categoryId: int("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("novel_categories_pk").on(table.novelTitle, table.categoryId),
  ]
);

export const novels = sqliteTable("novels", {
  title: text().primaryKey(),
  url: text().notNull().unique(),
  imageUrl: text("image_url").notNull(),
  description: text().notNull(),
  rating: int().notNull(),
  author: text().notNull(),
  genres: text().notNull(),
  status: text().notNull(),
  isSaved: int("is_saved")
    .notNull()
    .default(sql`0`),
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
    bookMarked: int("book_marked")
      .notNull()
      .default(sql`0`),
    downloaded: int()
      .notNull()
      .default(sql`0`),
    content: text(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("novel_chapters_pk").on(table.novelTitle, table.number),
  ]
);

export const novelRelations = relations(novels, ({ many }) => ({
  chapters: many(novelChapters),
  categories: many(novelCategories),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  novels: many(novelCategories),
}));

export const novelCategoryRelations = relations(novelCategories, ({ one }) => ({
  novel: one(novels, {
    fields: [novelCategories.novelTitle],
    references: [novels.title],
  }),
  category: one(categories, {
    fields: [novelCategories.categoryId],
    references: [categories.id],
  }),
}));
