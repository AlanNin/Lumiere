import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useMutation, useQuery } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { Chapter } from "@/types/novel";
import { Telescope } from "lucide-react-native";
import { Text } from "@/components/defaults";
import { useRouter } from "expo-router";
import NovelChapter from "@/components/novel/novelChapter";
import NovelDetails from "@/components/novel/novelDetails";
import NovelTopButtons from "@/components/novel/novelTopButtons";
import NovelDescription from "@/components/novel/novelDescription";
import NovelGenres from "@/components/novel/novelGenres";
import NovelHeader from "@/components/novel/novelHeader";
import NovelReadButton from "@/components/novel/novelReadButton";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import Loading from "@/components/statics/loading";
import Error from "@/components/statics/error";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomDrawer from "@/components/bottomDrawer";
import { useChapterDownloadQueue } from "@/hooks/useChapterDownloadQueue";
import { DownloadChapter } from "@/types/download";
import { RefreshControl } from "react-native-gesture-handler";
import { colors } from "@/lib/constants";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<Chapter>
>(FlashList);

export default function NovelScreen() {
  const bottomDrawerDownloadRef = useRef<BottomSheetModal>(null);
  const { title } = useLocalSearchParams();
  const [listLoaded, setListLoaded] = React.useState(false);
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const [chaptersToDelete, setChaptersToDelete] = React.useState<
    DownloadChapter[]
  >([]);

  const {
    data: novelInfo,
    isLoading: isLoadingNovel,
    refetch: refetchNovelInfo,
  } = useQuery({
    queryKey: ["novel-info", title],
    queryFn: () => novelController.getNovel({ title: String(title) }),
    staleTime: 1000 * 60 * 5,
  });

  const { enqueue, queue } = useChapterDownloadQueue();

  const prevQueueLengthRef = useRef<number>(queue.length);

  const { mutate: refreshNovel, isPending: isRefreshing } = useMutation({
    mutationFn: () =>
      novelController.refreshNovel({
        title: String(title),
      }),
    onSuccess: () => {
      refetchNovelInfo();
    },
  });

  const { mutate: removeDownloadChapters } = useMutation({
    mutationFn: (chapters: DownloadChapter[]) =>
      novelController.removeDownloadedNovelChapters({
        chapters,
      }),
    onSuccess: () => {
      refetchNovelInfo();
    },
  });

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const resumeChapter = React.useMemo<Chapter | null>(() => {
    const chapters = novelInfo?.chapters;
    if (!chapters || chapters.length === 0) return null;

    const incomplete = chapters.filter((chap) => chap.progress! < 100);

    if (incomplete.length === 0) {
      return null;
    }

    const candidate = incomplete.reduce((minChap, chap) =>
      chap.number < minChap.number ? chap : minChap
    );

    if (candidate.number === 1 && candidate.progress === 0) {
      return null;
    }

    return candidate;
  }, [novelInfo]);

  const handleChapterPress = React.useCallback(
    ({
      chapterNumber,
      downloaded,
    }: {
      chapterNumber: number;
      downloaded?: boolean;
    }) => {
      router.push({
        pathname: "/novel/reader",
        params: {
          title: novelInfo?.title ?? "",
          chapterNumber,
          totalChapters: novelInfo?.chapters.length ?? 0,
          downloaded: downloaded ? 1 : 0,
        },
      });
    },
    [router, novelInfo?.title]
  );

  function handleDownloadPress({
    chapter,
    isDownloaded,
    isDownloading,
  }: {
    chapter: DownloadChapter;
    isDownloaded?: boolean;
    isDownloading: boolean;
  }) {
    if (isDownloading) return;
    if (!isDownloaded) {
      enqueue([chapter]);
    } else {
      setChaptersToDelete([chapter]);
      bottomDrawerDownloadRef.current?.present();
    }
  }

  React.useEffect(() => {
    if (prevQueueLengthRef.current > queue.length) {
      refetchNovelInfo();
    }
    prevQueueLengthRef.current = queue.length;
  }, [queue, refetchNovelInfo]);

  const handleDeleteChapters = React.useCallback(() => {
    removeDownloadChapters(chaptersToDelete);
    setChaptersToDelete([]);
    bottomDrawerDownloadRef.current?.dismiss();
  }, [removeDownloadChapters, bottomDrawerDownloadRef, chaptersToDelete]);

  const handleCancelDeleteChapters = React.useCallback(() => {
    setChaptersToDelete([]);
    bottomDrawerDownloadRef.current?.dismiss();
  }, [bottomDrawerDownloadRef]);

  const renderItem = React.useCallback(
    ({ item }: { item: Chapter }) => {
      const isDownloading = queue.some(
        (c) =>
          c.novelTitle === item.novelTitle && c.chapterNumber === item.number
      );

      return (
        <NovelChapter
          chapter={item}
          isDownloading={isDownloading}
          onChapterPress={handleChapterPress}
          onDownloadPress={handleDownloadPress}
        />
      );
    },
    [handleChapterPress, handleDownloadPress, queue]
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
          <NovelTopButtons
            novelUrl={novelInfo.url}
            novelTitle={novelInfo.title}
            novelIsSaved={novelInfo.isSaved ?? false}
          />
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

  if (isLoadingNovel) {
    return <Loading title="The ink is still drying on this novel..." />;
  }

  if (!novelInfo) {
    return (
      <Error
        title="This story has yet to be written."
        Icon={Telescope}
        pressable={{
          title: "Go back to the library",
          onPress: () => router.back(),
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-background relative">
      <NovelHeader scrollY={scrollY} novelTitle={novelInfo.title} />
      <AnimatedFlashList
        ListHeaderComponent={ListHeader}
        data={novelInfo.chapters}
        extraData={queue}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={44}
        onScroll={scrollYHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
        removeClippedSubviews={true}
        onLoad={() => setListLoaded(true)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshNovel}
            progressBackgroundColor={colors.primary}
            colors={[colors.primary_foreground]}
          />
        }
      />

      {listLoaded && (
        <NovelReadButton
          scrollY={scrollY}
          novelTitle={novelInfo.title}
          novelTotalChapters={novelInfo.chapters.length}
          resumeFromNovelChapter={
            resumeChapter ? resumeChapter.number : undefined
          }
        />
      )}
      <BottomDrawer ref={bottomDrawerDownloadRef}>
        <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-8 flex-1">
          <Text className="text-lg font-medium text-center">
            Delete Downloaded{" "}
            {chaptersToDelete.length > 1 ? "Chapters" : "Chapter"}
          </Text>
          <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
            You won't be able to read{" "}
            {chaptersToDelete.length > 1 ? "these chapters" : "this chapter"}{" "}
            without internet connection.
          </Text>
          <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
            <TouchableOpacity
              className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
              onPress={handleDeleteChapters}
            >
              <Text>I Understand, Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
              onPress={handleCancelDeleteChapters}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomDrawer>
    </View>
  );
}
