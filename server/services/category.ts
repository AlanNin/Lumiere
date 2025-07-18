import { Category } from "@/types/category";
import { categoryRepository } from "../repositories/categories";

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      return await categoryRepository.getCategories();
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
      return await categoryRepository.upsertCategory({ id, label });
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
      return await categoryRepository.changeCategorySortOrder({
        id,
        sortOrder,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async removeCategory(id: number): Promise<boolean> {
    try {
      return await categoryRepository.removeCategory(id);
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },

  async sortCategoriesAlphabetically(): Promise<boolean> {
    try {
      return await categoryRepository.sortCategoriesAlphabetically();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
