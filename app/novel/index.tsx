import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Chapter } from "@/types/novel";
import { Telescope } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { Text } from "@/components/defaults";
import { useRouter } from "expo-router";
import NovelChapter from "@/components/novel/novelChapter";
import NovelDetails from "@/components/novel/novelDetails";
import NovelTopButtons from "@/components/novel/novelTopButtons";
import NovelDescription from "@/components/novel/novelDescription";
import NovelGenres from "@/components/novel/novelGenres";
import Loading from "@/components/statics/loading";
import NovelHeader from "@/components/novel/novelHeader";
import NovelReadButton from "@/components/novel/novelReadButton";
import { FlashList, FlashListProps } from "@shopify/flash-list";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<Chapter>
>(FlashList);

export default function NovelScreen() {
  const { title } = useLocalSearchParams();

  const { data: novelInfo, isLoading: isLoadingNovelInfo } = useQuery({
    queryKey: ["novel-info", title],
    queryFn: () => novelController.getNovelInfo({ title: String(title) }),
    staleTime: 1000 * 60 * 5,
  });

  const [listLoaded, setListLoaded] = React.useState(false);
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleChapterPress = React.useCallback(
    (chapterNumber: number) => {
      router.push({
        pathname: "/novel/reader",
        params: {
          title: novelInfo?.title ?? "",
          chapterNumber,
          totalChapters: novelInfo?.chapters.length ?? 0,
        },
      });
    },
    [router, novelInfo?.title]
  );

  const renderItem = React.useCallback(
    ({ item }: { item: Chapter }) => (
      <NovelChapter chapter={item} onPress={handleChapterPress} />
    ),
    [handleChapterPress]
  );
  const keyExtractor = React.useCallback(
    (item: Chapter) => `${item.number.toString()}-${item.title.toString()}`,
    []
  );

  const ListHeader = React.useMemo(() => {
    if (!novelInfo) return null;
    return (
      <View className="flex flex-col gap-y-5 pb-4">
        <NovelDetails
          author={novelInfo?.author}
          imageUrl={novelInfo.imageUrl}
          rating={novelInfo.rating}
          status={novelInfo.status}
          title={novelInfo.title}
        />
        <View className="px-5 gap-y-5">
          <NovelTopButtons novelUrl={novelInfo.url} />
          <NovelDescription description={novelInfo.description} />
        </View>
        <NovelGenres
          genres={novelInfo.genres.split(",").map((g) => g.trim())}
        />
        <Text className="text-lg font-medium text-muted_foreground px-5 -mb-2">
          {novelInfo.chapters.length} Chapters
        </Text>
      </View>
    );
  }, [novelInfo]);

  if (isLoadingNovelInfo) {
    return <Loading title="The ink is still drying on this novel..." />;
  }

  if (!novelInfo) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Telescope size={24} color={colors.grayscale} />
        <Text className="text-grayscale mt-2">
          This story has yet to be written.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-2">
          <Text className="text-grayscale underline">
            Go back to the library
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background relative ">
      <NovelHeader scrollY={scrollY} novelTitle={novelInfo.title} />
      <AnimatedFlashList
        ListHeaderComponent={ListHeader}
        data={novelInfo.chapters}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={44}
        onScroll={scrollYHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
        removeClippedSubviews={true}
        onLoad={() => setListLoaded(true)}
      />

      {listLoaded && (
        <NovelReadButton
          scrollY={scrollY}
          novelTitle={novelInfo.title}
          novelTotalChapters={novelInfo.chapters.length}
        />
      )}
    </View>
  );
}
