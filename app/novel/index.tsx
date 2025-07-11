import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useMutation, useQuery } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  Chapter,
  NovelChaptersFilter,
  NovelChaptersSortUI,
} from "@/types/novel";
import { Frown, Library, ListFilter, Telescope } from "lucide-react-native";
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
import { useChapterDownloadQueue } from "@/hooks/useChapterDownloadQueue";
import { DownloadChapter } from "@/types/download";
import { RefreshControl } from "react-native-gesture-handler";
import { colors } from "@/lib/constants";
import NovelActionsBar from "@/components/novel/novelActionsBar";
import { useHaptics } from "@/hooks/useHaptics";
import NovelRemoveDownloadDrawer from "@/components/novel/novelRemoveDownloadDrawer";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import NovelChaptersFilterDrawer from "@/components/novel/novelChaptersFilterDrawer";
import { useConfig } from "@/providers/appConfig";
import { applyNovelChaptersFiltersAndSort } from "@/lib/novel";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<Chapter>
>(FlashList);

export default function NovelScreen() {
  const router = useRouter();

  // Local pathname state
  const { title } = useLocalSearchParams();

  // States
  const scrollY = useSharedValue(0);
  const [listLoaded, setListLoaded] = React.useState(false);
  const [selectedChapters, setSelectedChapters] = React.useState<Chapter[]>([]);
  const [chaptersToDelete, setChaptersToDelete] = React.useState<
    DownloadChapter[]
  >([]);
  const [novelChaptersFilter] = useConfig<
    Record<string, NovelChaptersFilter["value"]>
  >("novelChaptersFilter", {});
  const [novelChaptersSort] = useConfig<NovelChaptersSortUI>(
    "novelChaptersSort",
    {
      key: "by_chapter",
      label: "By Chapter",
      order: "asc",
    }
  );
  const hasChaptersFilterApplied = React.useMemo(() => {
    return Object.values(novelChaptersFilter).some(
      (v) => v === "checked" || v === "indeterminate"
    );
  }, [novelChaptersFilter]);

  // Drawers
  const bottomDrawerRemoveDownloadRef = useRef<BottomSheetModal>(null);
  const bottomDrawerChaptersFilterRef = useRef<BottomSheetModal>(null);
  const bottomDrawerMoreRef = useRef<BottomSheetModal>(null);
  const bottomDrawerDownloadRef = useRef<BottomSheetModal>(null);
  const bottomDrawerSearchChapterRef = useRef<BottomSheetModal>(null);

  // Fetch novel info data and apply filters and sorts to chapters
  const {
    data: novelInfo,
    isLoading: isLoadingNovel,
    refetch: refetchNovelInfo,
  } = useQuery({
    queryKey: ["novel-info", title],
    queryFn: () => novelController.getNovel({ novelTitle: String(title) }),
    staleTime: 1000 * 60 * 5,
  });

  const novelChapters = React.useMemo<Chapter[]>(() => {
    if (!novelInfo) return [];
    return applyNovelChaptersFiltersAndSort(
      novelInfo.chapters,
      novelChaptersFilter,
      novelChaptersSort
    );
  }, [novelInfo, novelChaptersFilter, novelChaptersSort]);

  const { vibration } = useHaptics();
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

  const { mutate: toggleReadChapter } = useMutation({
    mutationFn: ({
      novelTitle,
      chapterNumber,
    }: {
      novelTitle: string;
      chapterNumber: number;
    }) =>
      novelController.toggleMarkChapterAsRead({
        novelTitle,
        chapterNumber,
      }),
    onSuccess: () => {
      refetchNovelInfo();
    },
  });

  const { mutate: toggleBookmarkChapter } = useMutation({
    mutationFn: ({
      novelTitle,
      chapterNumber,
    }: {
      novelTitle: string;
      chapterNumber: number;
    }) =>
      novelController.toggleBookmarkChapter({
        novelTitle,
        chapterNumber,
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
    if (!chapters?.length) return null;

    const incomplete = chapters.filter((c) => (c.progress ?? 0) < 100);
    if (!incomplete.length) return null;

    const candidate = incomplete.reduce((min, c) =>
      c.number < min.number ? c : min
    );

    const anyRead = chapters.some((c) => (c.progress ?? 0) > 0);
    if (!anyRead) return null;

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
          novelTitle: novelInfo?.title ?? "",
          chapterNumber,
          totalChapters: novelInfo?.chapters.length ?? 0,
          downloaded: downloaded ? 1 : 0,
        },
      });
    },
    [router, novelInfo?.title]
  );

  function handleOpenDeleteChaptersDrawer(chapters: DownloadChapter[]) {
    setChaptersToDelete(chapters);
    bottomDrawerRemoveDownloadRef.current?.present();
  }

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
      handleOpenDeleteChaptersDrawer([chapter]);
    }
  }

  const handleSelectChapter = React.useCallback(
    (chapter: Chapter) => {
      if (selectedChapters.length === 0) {
        vibration();
      }

      setSelectedChapters((prev) => {
        if (prev.some((c) => c.number === chapter.number)) {
          return prev.filter((c) => c.number !== chapter.number);
        } else {
          return [...prev, chapter];
        }
      });
    },
    [selectedChapters.length, queue.length]
  );

  const handleClearSelectedChapters = React.useCallback(() => {
    setSelectedChapters([]);
  }, []);

  const handleSelectAllChapters = React.useCallback(() => {
    if (
      !novelInfo?.chapters ||
      selectedChapters.length === novelInfo?.chapters.length
    ) {
      return;
    }

    setSelectedChapters(novelInfo?.chapters);
  }, [novelInfo?.chapters, selectedChapters.length]);

  const handleSelectRemainingChapters = React.useCallback(() => {
    if (!novelInfo?.chapters) return;

    const remaining = novelInfo?.chapters.filter(
      (c) => !selectedChapters.some((sc) => sc.number === c.number)
    );

    if (remaining.length === 0) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(remaining);
    }
  }, [novelInfo?.chapters, selectedChapters]);

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
          selectedChapters={selectedChapters}
          onSelectChapter={handleSelectChapter}
        />
      );
    },
    [
      queue,
      selectedChapters,
      handleChapterPress,
      handleDownloadPress,
      toggleBookmarkChapter,
      toggleReadChapter,
    ]
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
          rating={novelInfo.rating ?? 0}
          rank={novelInfo.rank ?? 0}
          status={novelInfo.status}
          title={novelInfo.title}
        />
        <View className="px-5 gap-y-5">
          <NovelTopButtons
            novelTitle={novelInfo.title}
            novelIsSaved={novelInfo.isSaved ?? false}
          />
          <NovelDescription description={novelInfo.description} />
        </View>
        <NovelGenres
          genres={novelInfo.genres.split(",").map((g) => g.trim())}
        />
        <View className="flex flex-row items-center justify-between px-5 -mb-2">
          <Text className="text-lg font-medium text-muted_foreground">
            {novelChapters.length} Chapters
          </Text>
          <TouchableOpacity
            className="p-2 -mr-2"
            onPress={() => bottomDrawerChaptersFilterRef.current?.present()}
          >
            <ListFilter
              color={
                hasChaptersFilterApplied
                  ? colors.primary
                  : colors.muted_foreground
              }
              size={20}
              strokeWidth={1.6}
              className="p-2"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [novelInfo, novelChapters]);

  const EmptyChaptersComponent = React.useMemo(() => {
    if (!novelInfo) return null;

    const title = hasChaptersFilterApplied
      ? "Try clearing or adjusting your filters to see more chapters."
      : "A blank page, no chapters yet.";

    return (
      <View className="flex-1 min-h-52">
        <Error title={title} Icon={Library} />
      </View>
    );
  }, [novelChapters, hasChaptersFilterApplied]);

  React.useEffect(() => {
    if (prevQueueLengthRef.current > queue.length) {
      refetchNovelInfo();
    }
    prevQueueLengthRef.current = queue.length;
  }, [queue, refetchNovelInfo]);

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
      <NovelHeader
        scrollY={scrollY}
        novelTitle={novelInfo.title}
        selectedChapters={selectedChapters.length}
        handleClearSelectedChapters={handleClearSelectedChapters}
        handleSelectAllChapters={handleSelectAllChapters}
        handleSelectRemainingChapters={handleSelectRemainingChapters}
      />
      <AnimatedFlashList
        ListHeaderComponent={ListHeader}
        data={novelChapters}
        extraData={[queue.length, selectedChapters.length]}
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
        ListEmptyComponent={EmptyChaptersComponent}
      />

      {listLoaded && selectedChapters.length === 0 && (
        <NovelReadButton
          scrollY={scrollY}
          novelTitle={novelInfo.title}
          novelTotalChapters={novelChapters.length}
          resumeFromNovelChapter={
            resumeChapter ? resumeChapter.number : undefined
          }
        />
      )}

      <NovelActionsBar
        novelTitle={novelInfo.title}
        selectedChapters={selectedChapters}
        setSelectedChapters={setSelectedChapters}
        refetchNovelInfo={refetchNovelInfo}
        enqueueDownload={enqueue}
        onOpenDeleteChaptersDrawer={handleOpenDeleteChaptersDrawer}
      />

      <NovelRemoveDownloadDrawer
        bottomDrawerRef={bottomDrawerRemoveDownloadRef}
        chaptersToDelete={chaptersToDelete}
        setChaptersToDelete={setChaptersToDelete}
        refetchNovelInfo={refetchNovelInfo}
      />

      <NovelChaptersFilterDrawer
        bottomDrawerRef={bottomDrawerChaptersFilterRef}
      />
    </View>
  );
}
