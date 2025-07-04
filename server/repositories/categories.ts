import { db_client } from "../db/client";
import { categories } from "../db/schema";
import { Category } from "@/types/category";

export const categoryRepository = {
  async getCategories(): Promise<Category[]> {
    try {
      const rows = await db_client
        .select({
          id: categories.id,
          label: categories.label,
          sortOrder: categories.sortOrder,
        })
        .from(categories)
        .orderBy(categories.sortOrder);

      return rows.map((c) => ({
        id: Number(c.id),
        label: String(c.label),
        sortOrder: Number(c.sortOrder),
        novels: [],
      }));
    } catch (error) {
      console.error("Failed to load categories with novels:", error);
      if (error instanceof Error) throw error;
      throw new Error("An unknown error occurred while loading categories.");
    }
  },
};
