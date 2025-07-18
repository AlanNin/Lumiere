import AddCategoryButton from "@/components/more/categories/addCategoryButton";
import CategoryAZModal from "@/components/more/categories/categoryAZModal";
import CategoryCard from "@/components/more/categories/categoryCard";
import CategoryRemoveModal from "@/components/more/categories/categoryRemoveModal";
import CategoryUpsertModal from "@/components/more/categories/categoryUpsertModal";
import Quote from "@/components/statics/quote";
import TabHeader from "@/components/tabHeader";
import { colors } from "@/lib/constants";
import { invalidateQueries } from "@/providers/reactQuery";
import { categoryController } from "@/server/controllers/category";
import { Category } from "@/types/category";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownAZ, Tags } from "lucide-react-native";
import { useState } from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<Category>
>(FlashList);

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const windowHeight = Dimensions.get("window").height;
  const [contentHeight, setContentHeight] = useState(0);
  const maxScrollY = Math.max(0, contentHeight - windowHeight);
  const [isUpsertCategoryModalOpen, setIsUpsertCategoryModalOpen] = useState(
    false
  );
  const [categoryToUpdate, setCategoryToUpdate] = useState<Category>();
  const [categoryToDelete, setCategoryToDelete] = useState<Category>();
  const [categoryToAZ, setCategoryToAZ] = useState<boolean>(false);

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryController.getCategories(),
  });

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleUpdateCategory(category: Category) {
    setCategoryToUpdate(category);
    setIsUpsertCategoryModalOpen(true);
  }

  function SortAZModalButton() {
    return (
      <TouchableOpacity className="p-2" onPress={() => setCategoryToAZ(true)}>
        <ArrowDownAZ
          color={colors.muted_foreground}
          size={20}
          strokeWidth={1.6}
        />
      </TouchableOpacity>
    );
  }

  const { mutate: changeCategorySortOrder } = useMutation({
    mutationFn: ({
      categoryId,
      newSortOrder,
    }: {
      categoryId: number;
      newSortOrder: number;
    }) =>
      categoryController.changeCategorySortOrder({
        id: categoryId,
        sortOrder: newSortOrder,
      }),
    onSuccess: () => {
      invalidateQueries("library", "categories");
    },
  });

  const { mutate: removeCategory } = useMutation({
    mutationFn: ({ categoryId }: { categoryId: number }) =>
      categoryController.removeCategory(categoryId),
    onSuccess: () => {
      invalidateQueries("library", "categories");
    },
  });

  const { mutate: sortCategoriesAlphabetically } = useMutation({
    mutationFn: () => categoryController.sortCategoriesAlphabetically(),
    onSuccess: () => {
      invalidateQueries("library", "categories");
    },
  });

  if (isLoadingCategories) {
    return <View className="flex-1 bg-background" />;
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Categories"
        renderBackButton
        scrollY={scrollY}
        customRightContent={SortAZModalButton()}
      />
      {categories && categories?.length > 0 ? (
        <AnimatedFlashList
          data={categories}
          renderItem={({ item, index }) => {
            const firstItem = index === 0;
            const lastItem = index === categories.length - 1;
            return (
              <CategoryCard
                category={item}
                isFirstItem={firstItem}
                isLastItem={lastItem}
                handleUpdateCategory={handleUpdateCategory}
                handleChangeCategorySortOrder={changeCategorySortOrder}
                setCategoryToDelete={setCategoryToDelete}
              />
            );
          }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 84,
          }}
          keyExtractor={(item) =>
            `${item.id.toString()}-${item.sortOrder.toString()}`
          }
          showsVerticalScrollIndicator={false}
          estimatedItemSize={80}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          onScroll={scrollYHandler}
          scrollEventThrottle={16}
        />
      ) : (
        <Quote quote="No categories yet. Add some!" Icon={Tags} />
      )}
      <AddCategoryButton
        onPress={() => setIsUpsertCategoryModalOpen(true)}
        scrollY={scrollY}
        maxScrollY={maxScrollY}
      />
      <CategoryUpsertModal
        isOpen={isUpsertCategoryModalOpen}
        handleClose={() => {
          setIsUpsertCategoryModalOpen(false);
          setTimeout(() => setCategoryToUpdate(undefined), 300);
        }}
        categoryToUpdate={categoryToUpdate}
      />
      <CategoryRemoveModal
        categoryToDelete={categoryToDelete}
        handleClose={() => setCategoryToDelete(undefined)}
        handleRemoveCategory={removeCategory}
      />

      <CategoryAZModal
        isOpen={categoryToAZ}
        handleClose={() => setCategoryToAZ(false)}
        sortCategoriesAlphabetically={sortCategoriesAlphabetically}
      />
    </View>
  );
}
