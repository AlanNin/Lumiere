import { Text } from "@/components/defaults";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/constants";
import { Category } from "@/types/category";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";

export default function CategoryCard({
  category,
  isFirstItem,
  isLastItem,
  handleUpdateCategory,
  handleChangeCategorySortOrder,
  setCategoryToDelete,
}: {
  category: Category;
  isFirstItem: boolean;
  isLastItem: boolean;
  handleUpdateCategory: (category: Category) => void;
  handleChangeCategorySortOrder: ({
    categoryId,
    newSortOrder,
  }: {
    categoryId: number;
    newSortOrder: number;
  }) => void;
  setCategoryToDelete: (category: Category) => void;
}) {
  return (
    <View
      className="flex flex-col gap-y-4 w-full bg-primary_dark/10 p-4 pb-2 rounded-lg mb-4"
      key={category.id}
    >
      <View className="flex flex-row items-center gap-x-4">
        <Tag
          color={colors.muted_foreground}
          size={16}
          strokeWidth={1.5}
          style={{
            transform: [{ rotate: "135deg" }],
          }}
        />
        <Text className="text-muted_foreground">{category.label}</Text>
      </View>
      <View className="flex flex-row items-center justify-between w-full">
        <View className="flex flex-row items-center gap-x-3 -mx-2">
          <TouchableOpacity
            className={cn("p-2", isFirstItem && "opacity-50")}
            disabled={isFirstItem}
            onPress={() =>
              handleChangeCategorySortOrder({
                categoryId: category.id,
                newSortOrder: category.sortOrder - 1,
              })
            }
          >
            <ChevronUp
              color={colors.muted_foreground}
              fill={colors.muted_foreground}
              size={16}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
          <TouchableOpacity
            className={cn("p-2", isLastItem && "opacity-50")}
            disabled={isLastItem}
            onPress={() =>
              handleChangeCategorySortOrder({
                categoryId: category.id,
                newSortOrder: category.sortOrder + 1,
              })
            }
          >
            <ChevronDown
              color={colors.muted_foreground}
              fill={colors.muted_foreground}
              size={16}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
        </View>
        <View className="flex flex-row items-center gap-x-3">
          <TouchableOpacity
            className="p-2"
            onPress={() => handleUpdateCategory(category)}
          >
            <Pencil
              color={colors.muted_foreground}
              size={16}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => setCategoryToDelete(category)}
          >
            <Trash2
              color={colors.muted_foreground}
              size={16}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
