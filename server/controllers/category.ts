import { Category } from "@/types/category";
import { categoryService } from "../services/category";

export const categoryController = {
  async getCategories(): Promise<Category[]> {
    try {
      return await categoryService.getCategoies();
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw new Error("An unknown error occurred.");
    }
  },
};
