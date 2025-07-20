import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Chapter,
  NovelChaptersFilter,
  NovelChaptersSortUI,
} from "@/types/novel";
import { Library, ListFilter, Telescope } from "lucide-react-native";
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
import { colors } from "@/lib/constants";
import NovelActionsBar from "@/components/novel/novelActionsBar";
import { useHaptics } from "@/hooks/useHaptics";
import NovelRemoveDownloadDrawer from "@/components/novel/novelRemoveDownloadDrawer";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import NovelChaptersFilterDrawer from "@/components/novel/novelChaptersFilterDrawer";
import { useConfig } from "@/providers/appConfig";
import { applyNovelChaptersFiltersAndSort } from "@/lib/novel";
import { useNovelRefreshQueue } from "@/hooks/useNovelRefreshQueue";
import NovelFindChapterDrawer from "@/components/novel/novelFindChapterDrawer";
import NovelDownloadChaptersDrawer from "@/components/novel/novelDownloadChaptersDrawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NovelMoreChapterDrawer from "@/components/novel/novelMoreChapterDrawer";
import NovelCategoryDrawer from "@/components/novel/novelCategoryDrawer";
import { categoryController } from "@/server/controllers/category";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<Chapter>
>(FlashList);

export default function NovelScreen() {
  const router = useRouter();

  // Local pathname state
  const { title } = useLocalSearchParams();

  // States
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashList<Chapter>>(null);
  const scrollY = useSharedValue(0);
  const [listLoaded, setListLoaded] = React.useState(false);
  const [selectedChapters, setSelectedChapters] = React.useState<Chapter[]>([]);
  const windowHeight = Dimensions.get("window").height;
  const [contentHeight, setContentHeight] = useState(0);
  const maxScrollY = Math.max(0, contentHeight - windowHeight);
  const [chaptersToDelete, setChaptersToDelete] = React.useState<
    DownloadChapter[]
  >([]);
  const [novelChaptersFilter] = useConfig<
    Record<string, NovelChaptersFilter["value"]>
  >(`novelChaptersFilter-${String(title)}`, {});
  const [novelChaptersSort] = useConfig<NovelChaptersSortUI>(
    `novelChaptersSort-${String(title)}`,
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
  const [highlightChapter, setHighlightChapter] = useState<number | null>(null);

  // Drawers
  const bottomDrawerRemoveDownloadRef = useRef<BottomSheetModal>(null);
  const bottomDrawerChaptersFilterRef = useRef<BottomSheetModal>(null);
  const bottomDrawerSearchChapterRef = useRef<BottomSheetModal>(null);
  const bottomDraweChaptersDownloadRef = useRef<BottomSheetModal>(null);
  const bottomDrawerMoreRef = useRef<BottomSheetModal>(null);
  const bottomDrawerCategoryRef = useRef<BottomSheetModal>(null);

  // Fetch novel info data and apply filters and sorts to chapters, and categories
  const {
    data: novelInfo,
    isLoading: isLoadingNovel,
    refetch: refetchNovelInfo,
  } = useQuery({
    queryKey: ["novel-info", title],
    queryFn: () => novelController.getNovel({ novelTitle: String(title) }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryController.getCategories(),
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
  const { enqueueDownload, queueDownload } = useChapterDownloadQueue();
  const { enqueueRefresh, isRefreshing } = useNovelRefreshQueue();

  const isDownloadingFromThisNovel = queueDownload.some(
    (c) => c.novelTitle === novelInfo?.title
  );

  const prevQueueDownloadLengthRef = useRef<number>(queueDownload.length);

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const allChaptersCompleted = React.useMemo(() => {
    const chapters = novelInfo?.chapters;
    if (!chapters?.length) return false;
    return chapters.every((c) => (c.progress ?? 0) === 100);
  }, [novelInfo]);

  const hasDownloadedChapters = React.useMemo(() => {
    const chapters = novelInfo?.chapters;
    if (!chapters?.length) return false;
    return chapters.some((c) => c.downloaded);
  }, [novelInfo]);

  const resumeChapter = React.useMemo<Chapter | null>(() => {
    const chapters = novelInfo?.chapters;
    if (!chapters?.length) return null;

    // find the lowest chapter number in the list
    const minChapterNumber = Math.min(...chapters.map((c) => c.number));

    // 1) Find the highest-numbered chapter that is fully read (progress === 100)
    const fullyRead = chapters.filter((c) => (c.progress ?? 0) === 100);
    const maxReadNumber = fullyRead.length
      ? Math.max(...fullyRead.map((c) => c.number))
      : 0;

    // 2) If there is a next chapter after the last fully read, and it has some progress (<100 but >0), resume there
    const nextAfterRead = chapters.find(
      (c) =>
        c.number === maxReadNumber + 1 &&
        (c.progress ?? 0) > 0 &&
        (c.progress ?? 0) < 100
    );
    if (nextAfterRead) {
      return nextAfterRead;
    }

    // 3) If no chapter in progress after last read, return the next unread chapter,
    //    but skip it if it's the very first one (lowest number) with 0 progress
    const nextUnread = chapters.find(
      (c) => c.number === maxReadNumber + 1 && (c.progress ?? 0) === 0
    );
    if (
      nextUnread &&
      !(
        nextUnread.number === minChapterNumber &&
        (nextUnread.progress ?? 0) === 0
      )
    ) {
      return nextUnread;
    }

    // 4) Otherwise, fall back to any chapter in progress (1–99%), picking the highest number
    const inProgress = chapters.filter(
      (c) => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100
    );
    if (inProgress.length > 0) {
      return inProgress.reduce((prev, c) =>
        c.number > prev.number ? c : prev
      );
    }

    // 5) If nothing applies, return null
    return null;
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
      enqueueDownload([chapter]);
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
    [selectedChapters.length, queueDownload.length]
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

  const handleFindChapter = useCallback((chapterNumber: number) => {
    const index = chapterNumber - 1;
    const viewOffset = index <= 5 ? 200 : 0;
    setHighlightChapter(chapterNumber);
    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
      viewOffset,
    });
    setTimeout(() => {
      setHighlightChapter(null);
    }, 2000);
  }, []);

  const renderItem = React.useCallback(
    ({ item }: { item: Chapter }) => {
      const isDownloading = queueDownload.some(
        (c) =>
          c.novelTitle === item.novelTitle && c.chapterNumber === item.number
      );

      const isHighlighted = highlightChapter === item.number;

      return (
        <NovelChapter
          chapter={item}
          isDownloading={isDownloading}
          onChapterPress={handleChapterPress}
          onDownloadPress={handleDownloadPress}
          selectedChapters={selectedChapters}
          onSelectChapter={handleSelectChapter}
          isHighlighted={isHighlighted}
        />
      );
    },
    [
      queueDownload,
      selectedChapters,
      highlightChapter,
      handleChapterPress,
      handleDownloadPress,
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
          imageUrl={novelInfo.customImageUri ?? novelInfo.imageUrl}
          rating={novelInfo.rating ?? 0}
          rank={novelInfo.rank ?? 0}
          status={novelInfo.status}
          title={novelInfo.title}
        />
        <View className="px-5 gap-y-5">
          <NovelTopButtons
            novelTitle={novelInfo.title}
            novelIsSaved={novelInfo.isSaved ?? false}
            handleOpenCategoryDrawer={() =>
              bottomDrawerCategoryRef.current?.present()
            }
            categories={categories}
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
            onPress={() => {
              setSelectedChapters([]);
              bottomDrawerChaptersFilterRef.current?.present();
            }}
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
    if (prevQueueDownloadLengthRef.current > queueDownload.length) {
      refetchNovelInfo();
    }
    prevQueueDownloadLengthRef.current = queueDownload.length;
  }, [queueDownload, refetchNovelInfo]);

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
        isDownloadingFromThisNovel={isDownloadingFromThisNovel}
        handleClearSelectedChapters={handleClearSelectedChapters}
        handleSelectAllChapters={handleSelectAllChapters}
        handleSelectRemainingChapters={handleSelectRemainingChapters}
        handleOpenSearchChapterDrawer={() =>
          bottomDrawerSearchChapterRef.current?.present()
        }
        handleOpenDownloadChaptersDrawer={() =>
          bottomDraweChaptersDownloadRef.current?.present()
        }
        handleOpenMoreChapterDrawer={() =>
          bottomDrawerMoreRef.current?.present()
        }
      />

      <AnimatedFlashList
        ref={listRef}
        ListHeaderComponent={ListHeader}
        data={novelChapters}
        extraData={[queueDownload.length, selectedChapters.length]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={44}
        onScroll={scrollYHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (allChaptersCompleted ? 12 : 84),
        }}
        removeClippedSubviews={true}
        onLoad={() => setListLoaded(true)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing(String(title))}
            onRefresh={() => enqueueRefresh([String(title)])}
            progressBackgroundColor={colors.primary}
            colors={[colors.primary_foreground]}
          />
        }
        ListEmptyComponent={EmptyChaptersComponent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, height) => setContentHeight(height)}
      />

      {listLoaded && !allChaptersCompleted && selectedChapters.length === 0 && (
        <NovelReadButton
          scrollY={scrollY}
          novelTitle={novelInfo.title}
          novelTotalChapters={novelChapters.length}
          resumeFromNovelChapter={
            resumeChapter ? resumeChapter.number : undefined
          }
          maxScrollY={maxScrollY}
        />
      )}

      <NovelActionsBar
        novelTitle={novelInfo.title}
        selectedChapters={selectedChapters}
        setSelectedChapters={setSelectedChapters}
        refetchNovelInfo={refetchNovelInfo}
        enqueueDownload={enqueueDownload}
        onOpenDeleteChaptersDrawer={handleOpenDeleteChaptersDrawer}
        isSortAsc={novelChaptersSort.order === "asc"}
      />

      <NovelRemoveDownloadDrawer
        bottomDrawerRef={bottomDrawerRemoveDownloadRef}
        chaptersToDelete={chaptersToDelete}
        setChaptersToDelete={setChaptersToDelete}
        refetchNovelInfo={refetchNovelInfo}
      />

      <NovelChaptersFilterDrawer
        bottomDrawerRef={bottomDrawerChaptersFilterRef}
        novelTitle={novelInfo.title}
      />

      <NovelFindChapterDrawer
        bottomDrawerRef={bottomDrawerSearchChapterRef}
        maxChapters={novelChapters.length}
        handleFindChapter={handleFindChapter}
      />

      <NovelDownloadChaptersDrawer
        bottomDrawerRef={bottomDraweChaptersDownloadRef}
        novelTitle={novelInfo.title}
        chapters={novelInfo?.chapters ?? []}
        currentChapter={
          resumeChapter ? Math.max(resumeChapter.number - 1, 1) : 1
        }
        maxChapters={novelChapters.length}
        allChaptersCompleted={allChaptersCompleted}
        hasDownloadedChapters={hasDownloadedChapters}
        refetchNovelInfo={refetchNovelInfo}
      />

      <NovelMoreChapterDrawer
        bottomDrawerRef={bottomDrawerMoreRef}
        novelTitle={novelInfo.title}
        novelImageUrl={novelInfo.imageUrl}
        novelCustomImageUri={novelInfo.customImageUri}
        refetchNovelInfo={refetchNovelInfo}
      />

      <NovelCategoryDrawer
        bottomDrawerRef={bottomDrawerCategoryRef}
        categories={categories}
        novelTitle={novelInfo.title}
        novelCategories={novelInfo.categoriesIds}
      />
    </View>
  );
}
