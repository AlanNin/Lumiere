import { Category } from "@/types/category";
import { categoryService } from "../services/category";

export const categoryController = {
  async getCategories(): Promise<Category[]> {
    try {
      return await categoryService.getCategories();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async upsertCategory({
    id,
    label,
  }: {
    id?: number;
    label: string;
  }): Promise<boolean> {
    try {
      return await categoryService.upsertCategory({ id, label });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async changeCategorySortOrder({
    id,
    sortOrder,
  }: {
    id: number;
    sortOrder: number;
  }): Promise<boolean> {
    try {
      return await categoryService.changeCategorySortOrder({ id, sortOrder });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async removeCategory(id: number): Promise<boolean> {
    try {
      return await categoryService.removeCategory(id);
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async sortCategoriesAlphabetically(): Promise<boolean> {
    try {
      return await categoryService.sortCategoriesAlphabetically();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
