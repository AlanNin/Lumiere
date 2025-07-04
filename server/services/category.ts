import { Category } from "@/types/category";
import { categoryRepository } from "../repositories/categories";

export const categoryService = {
  async getCategoies(): Promise<Category[]> {
    try {
      return await categoryRepository.getCategories();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
