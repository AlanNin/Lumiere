import AddCategoryButton from "@/components/more/categories/addCategoryButton";
import CategoryAZDrawer from "@/components/more/categories/categoryAZDrawer";
import CategoryCard from "@/components/more/categories/categoryCard";
import CategoryRemoveDrawer from "@/components/more/categories/categoryRemoveDrawer";
import CategoryUpsertDrawer from "@/components/more/categories/categoryUpsertDrawer";
import Quote from "@/components/statics/quote";
import TabHeader from "@/components/tabHeader";
import { colors } from "@/lib/constants";
import { invalidateQueries } from "@/providers/reactQuery";
import { categoryController } from "@/server/controllers/category";
import { Category } from "@/types/category";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownAZ, Tags } from "lucide-react-native";
import { useRef, useState } from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<Category>
>(FlashList);

function SortAZModalButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity className="p-2" onPress={onPress}>
      <ArrowDownAZ
        color={colors.muted_foreground}
        size={20}
        strokeWidth={1.6}
      />
    </TouchableOpacity>
  );
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const windowHeight = Dimensions.get("window").height;
  const [contentHeight, setContentHeight] = useState(0);
  const maxScrollY = Math.max(0, contentHeight - windowHeight);
  const [categoryToUpdate, setCategoryToUpdate] = useState<Category>();
  const [categoryToDelete, setCategoryToDelete] = useState<Category>();
  const bottomDrawerUpsertRef = useRef<BottomSheetModal>(null);
  const bottomDrawerRemoveRef = useRef<BottomSheetModal>(null);
  const bottomDrawerAZRef = useRef<BottomSheetModal>(null);

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
    bottomDrawerUpsertRef.current?.present();
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
      invalidateQueries("library", "categories", ["novel-info"]);
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
        customRightContent={
          <SortAZModalButton
            onPress={() => bottomDrawerAZRef.current?.present()}
          />
        }
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
                setCategoryToDelete={(category) => {
                  setCategoryToDelete(category);
                  bottomDrawerRemoveRef.current?.present();
                }}
              />
            );
          }}
          contentContainerStyle={{
            padding: 20,
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
        onPress={() => bottomDrawerUpsertRef.current?.present()}
        scrollY={scrollY}
        maxScrollY={maxScrollY}
      />

      <CategoryUpsertDrawer
        bottomDrawerRef={bottomDrawerUpsertRef}
        onClose={() => {
          setTimeout(() => setCategoryToUpdate(undefined), 300);
        }}
        categoryToUpdate={categoryToUpdate}
      />

      <CategoryRemoveDrawer
        bottomDrawerRef={bottomDrawerRemoveRef}
        categoryToDelete={categoryToDelete}
        handleRemoveCategory={removeCategory}
        onClose={() => setCategoryToDelete(undefined)}
      />

      <CategoryAZDrawer
        bottomDrawerRef={bottomDrawerAZRef}
        sortCategoriesAlphabetically={sortCategoriesAlphabetically}
      />
    </View>
  );
}
