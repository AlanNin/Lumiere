import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { categoryController } from "@/server/controllers/category";
import { useMutation, useQuery } from "@tanstack/react-query";
import Checkbox from "../checkbox";
import { useEffect, useState } from "react";
import { novelController } from "@/server/controllers/novel";
import { invalidateQueries } from "@/providers/reactQuery";
import { useRouter } from "expo-router";
import { Category } from "@/types/category";

export default function NovelCategoryDrawer({
  bottomDrawerRef,
  categories,
  novelTitle,
  novelCategories,
}: {
  bottomDrawerRef: React.RefObject<BottomSheetModal | null>;
  categories: Category[] | undefined;
  novelTitle: string;
  novelCategories: number[] | undefined;
}) {
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    novelCategories ?? []
  );

  const { mutate: setLibraryStatus } = useMutation({
    mutationFn: () =>
      novelController.setLibraryStatus({
        title: novelTitle,
        saved: true,
        categoriesId: selectedCategories,
      }),
    onSuccess: () => {
      invalidateQueries(
        "library",
        ["novel-info", novelTitle],
        ["explore-novels"]
      );
    },
  });

  function handleChangeCategory(categoryId: number) {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  }

  function handleReset() {
    setSelectedCategories(novelCategories ?? []);
  }

  function handleClose() {
    bottomDrawerRef.current?.dismiss();
    setLibraryStatus();
  }

  useEffect(() => {
    setSelectedCategories(novelCategories ?? []);
  }, [novelCategories]);

  if (!categories) {
    return;
  }

  return (
    <BottomDrawer ref={bottomDrawerRef} onClose={handleReset}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">Set Categories</Text>
        {categories && categories.length > 0 && (
          <Text className="text-muted_foreground/85 text-center mx-2 mb-2">
            Tag your novel so it’s easier to find. Leave it blank and it’ll go
            to <Text className="text-muted_foreground/85 italic">Default</Text>.
          </Text>
        )}
        <View className="flex flex-col gap-y-4 w-full px-12">
          {categories && categories.length > 0 ? (
            <View className="flex flex-col gap-y-2 w-full my-2">
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);

                return (
                  <TouchableOpacity
                    className="w-full flex flex-row items-center gap-x-4 py-2"
                    onPress={() => handleChangeCategory(category.id)}
                    key={category.id}
                  >
                    <Checkbox
                      status={isSelected ? "checked" : "unchecked"}
                      onPress={() => handleChangeCategory(category.id)}
                    />
                    <Text className="text-center">{category.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="flex flex-col gap-y-2 w-full items-center justify-center my-2">
              <Text className="text-muted_foreground italic">
                No categories yet. Add some!
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={handleClose}
          >
            <Text className="text-center">Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={() => {
              bottomDrawerRef.current?.dismiss();
              router.push("/(more)/categories");
            }}
          >
            <Text>Go to Categories</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
