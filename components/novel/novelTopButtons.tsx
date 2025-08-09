import { Globe, Heart } from "lucide-react-native";
import { Linking, TouchableOpacity, View } from "react-native";
import { colors } from "@/lib/constants";
import { Text } from "@/components/defaults";
import { useMutation } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { cn } from "@/lib/cn";
import { invalidateQueries } from "@/providers/reactQuery";
import { getNovelUrl } from "@/lib/novel";
import { Category } from "@/types/category";
import { useState } from "react";

export default function NovelTopButtons({
  novelTitle,
  dbNovelIsSaved,
  handleOpenCategoryDrawer,
  handleCloseCategoryDrawer,
  categories,
}: {
  novelTitle: string;
  dbNovelIsSaved: boolean;
  handleOpenCategoryDrawer: () => void;
  handleCloseCategoryDrawer: () => void;
  categories: Category[] | undefined;
}) {
  const [novelIsSaved, setNovelIsSaved] = useState(dbNovelIsSaved);
  const novelUrl = getNovelUrl(novelTitle);
  function openInBrowser() {
    Linking.openURL(novelUrl);
  }

  const {
    mutate: setLibraryStatus,
    isPending: isPendingLibraryStatus,
  } = useMutation({
    mutationFn: () =>
      novelController.setLibraryStatus({
        title: novelTitle,
        saved: !novelIsSaved,
      }),
    onMutate: () => {
      setNovelIsSaved(!novelIsSaved);

      if (!novelIsSaved && categories && categories.length > 0) {
        handleOpenCategoryDrawer();
      }
    },
    onSuccess: () => {
      invalidateQueries(
        "library",
        ["novel-info", novelTitle],
        ["explore-novels"]
      );
    },
    onError: () => {
      setNovelIsSaved(dbNovelIsSaved);
      handleCloseCategoryDrawer();
    },
  });

  return (
    <View className="flex flex-row items-center justify-center gap-x-20 px-4">
      <TouchableOpacity
        className="flex flex-col items-center gap-y-2.5 w-28"
        onPress={() => setLibraryStatus()}
        onLongPress={handleOpenCategoryDrawer}
        disabled={isPendingLibraryStatus}
      >
        <Heart
          color={novelIsSaved ? colors.primary : colors.grayscale}
          fill={novelIsSaved ? colors.primary : "transparent"}
          size={20}
          strokeWidth={1.6}
        />
        <Text
          className={cn(
            "text-sm",
            novelIsSaved ? "text-primary" : "text-grayscale"
          )}
        >
          {novelIsSaved ? "In Library" : "Add to Library"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex flex-col items-center gap-y-2 w-28"
        onPress={openInBrowser}
      >
        <Globe color={colors.grayscale} size={20} strokeWidth={1.6} />
        <Text className="text-sm text-grayscale">Open in Browser</Text>
      </TouchableOpacity>
    </View>
  );
}
