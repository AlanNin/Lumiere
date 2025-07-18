import { eq, sql } from "drizzle-orm";
import { db_client } from "../db/client";
import { categories, novelCategories } from "../db/schema";
import { Category } from "@/types/category";

export const categoryRepository = {
  async getCategories(): Promise<Category[]> {
    const dbCategories = await db_client
      .select({
        id: categories.id,
        label: categories.label,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .orderBy(categories.sortOrder)
      .all();

    return dbCategories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      sortOrder: cat.sortOrder,
    }));
  },

  async upsertCategory({
    id,
    label,
  }: {
    id?: number;
    label: string;
  }): Promise<boolean> {
    try {
      if (!label) return false;

      if (id !== undefined) {
        const { changes } = await db_client
          .update(categories)
          .set({ label })
          .where(eq(categories.id, id))
          .run();

        if (changes > 0) {
          return true;
        }
      }

      const [raw] = await db_client
        .select({ maxSort: sql`MAX(${categories.sortOrder})` })
        .from(categories)
        .all();

      const maxSortValue = (raw as { maxSort: number | null }).maxSort ?? 0;
      const nextSort = maxSortValue + 1;

      const result = await db_client
        .insert(categories)
        .values({ label, sortOrder: nextSort })
        .run();

      return result.changes > 0;
    } catch (e) {
      console.error("Failed to upsert category:", e);
      throw e;
    }
  },

  async changeCategorySortOrder({
    id,
    sortOrder,
  }: {
    id: number;
    sortOrder: number;
  }): Promise<boolean> {
    return db_client.transaction(async (tx) => {
      const all = await tx
        .select({ id: categories.id, sortOrder: categories.sortOrder })
        .from(categories)
        .orderBy(categories.sortOrder)
        .all();

      if (!all.length) return false;

      const max = all.length;
      const newPos = Math.min(Math.max(1, sortOrder), max);

      const moving = all.find((c) => c.id === id);
      if (!moving) return false;

      const others = all.filter((c) => c.id !== id);
      others.splice(newPos - 1, 0, moving);

      const updates = others.map((c, idx) => ({
        id: c.id,
        newSort: idx + 1,
      }));

      for (const { id: catId, newSort } of updates) {
        await tx
          .update(categories)
          .set({ sortOrder: newSort })
          .where(sql`${categories.id} = ${catId}`)
          .run();
      }

      return true;
    });
  },

  async removeCategory(id: number): Promise<boolean> {
    return db_client.transaction(async (tx) => {
      await tx
        .delete(novelCategories)
        .where(eq(novelCategories.categoryId, id))
        .run();

      const { changes } = await tx
        .delete(categories)
        .where(eq(categories.id, id))
        .run();

      return changes > 0;
    });
  },

  async sortCategoriesAlphabetically(): Promise<boolean> {
    return db_client.transaction(async (tx) => {
      const allCats = await tx
        .select({ id: categories.id })
        .from(categories)
        .orderBy(categories.label)
        .all();

      if (!allCats.length) return false;

      for (let idx = 0; idx < allCats.length; idx++) {
        const cat = allCats[idx];
        await tx
          .update(categories)
          .set({ sortOrder: idx + 1 })
          .where(eq(categories.id, cat.id))
          .run();
      }

      return true;
    });
  },
};
