import React from "react";
import FilterCategory from "@/components/filterCategory";
import TabHeader from "@/components/tabHeader";
import NovelCard from "@/components/novel/novelCard";
import { Novel } from "@/types/novel";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from "react-native";
import { colors, keyboardShownContentHeight } from "@/lib/constants";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ExploreSection, novelController } from "@/server/controllers/novel";
import {
  LucideIcon,
  Telescope,
  Heart,
  BadgeAlert,
  Search,
  ClockPlus,
} from "lucide-react-native";
import useDebounce from "@/hooks/useDebounce";
import Quote from "@/components/statics/quote";
import Loading from "@/components/statics/loading";
import { useKeyboard } from "@react-native-community/hooks";
import { cn } from "@/lib/cn";

type FilterOption = {
  key: ExploreSection;
  label: string;
  Icon: LucideIcon;
};

function RenderNovels({
  novels,
  width,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  novels?: Novel[];
  width: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) {
  const { keyboardShown } = useKeyboard();

  if (!novels || novels.length === 0) {
    return (
      <View
        className={cn(
          "items-center justify-center flex",
          keyboardShown ? keyboardShownContentHeight : "flex-1"
        )}
      >
        <Quote quote="Archives empty. Try another search." Icon={Telescope} />
      </View>
    );
  }

  const handleScroll = React.useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const scrollTop = contentOffset.y;
      const scrollHeight = contentSize.height;
      const clientHeight = layoutMeasurement.height;

      if (
        hasNextPage &&
        !isFetchingNextPage &&
        scrollHeight - scrollTop <= clientHeight + 200
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );
  return (
    <View className="flex-1">
      <FlatList
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={novels}
        renderItem={({ item, index }) => {
          const lastItem = index === novels.length - 1;
          const maxWidth = lastItem ? width / 2 - 21 : width;

          return (
            <NovelCard
              title={item.title}
              imageUri={item.customImageUri ?? item.imageUrl}
              containerClassName={index && index % 2 ? "ml-2" : "mr-2"}
              containerStyle={{ maxWidth }}
              href={{
                pathname: "/novel",
                params: { title: item.title, isLocal: "false" },
              }}
              showSavedBadge={item.isSaved}
            />
          );
        }}
        contentContainerClassName="gap-4 p-4"
        keyExtractor={(item) => item.title}
        numColumns={2}
        ListFooterComponent={() => (
          <>
            {isFetchingNextPage && (
              <View className="h-28 w-full items-center justify-center flex flex-col">
                <ActivityIndicator size="large" color={colors.grayscale} />
              </View>
            )}
          </>
        )}
      />
    </View>
  );
}

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { keyboardShown } = useKeyboard();

  const allFilterOptions: FilterOption[] = React.useMemo(
    () => [
      {
        key: "search" as ExploreSection,
        label: "Search",
        Icon: Search,
      },
      {
        key: "new",
        label: "New",
        Icon: ClockPlus,
      },
      {
        key: "popular",
        label: "Popular",
        Icon: Heart,
      },
      {
        key: "latest-releases",
        label: "Latest Releases",
        Icon: BadgeAlert,
      },
    ],
    []
  );

  const [selectedFilter, setSelectedFilter] = React.useState<FilterOption>(
    allFilterOptions[1]
  );

  const filterOptions = React.useMemo(() => {
    if (isSearchOpen) {
      return allFilterOptions;
    } else {
      return allFilterOptions.filter((option) => option.key !== "search");
    }
  }, [isSearchOpen, allFilterOptions]);

  function handleChangeFilter(filter: FilterOption) {
    setSelectedFilter(filter);
    setSearchQuery("");
    setIsSearchOpen(false);
  }

  const {
    data: novelsData,
    fetchNextPage: fetchNextNovelsPage,
    hasNextPage: hasNextNovelsPage,
    isFetchingNextPage: isFetchingNextNovelsPage,
    isLoading: isLoadingNovels,
  } = useInfiniteQuery({
    queryKey: [
      "explore-novels",
      isSearchOpen ? `search-${debouncedSearchQuery}` : selectedFilter.key,
    ],
    queryFn: ({ pageParam }) =>
      novelController.exploreNovels({
        section: isSearchOpen ? "search" : selectedFilter.key,
        pageNumber: pageParam,
        searchQuery: debouncedSearchQuery,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageNumber! < lastPage.totalPages!
        ? lastPage.pageNumber! + 1
        : undefined,
  });

  const novels = novelsData?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Explore"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        showSearch={true}
      />
      <View className="flex flex-col gap-y-2 border-b-[0.5px] border-muted pb-4">
        <FlatList
          data={filterOptions}
          renderItem={({ item }) => (
            <FilterCategory
              label={item.label}
              Icon={item.Icon}
              selected={
                isSearchOpen
                  ? item.key === "search"
                  : item.key === selectedFilter.key
              }
              onPress={() => handleChangeFilter(item)}
            />
          )}
          horizontal
          contentContainerClassName="flex-row gap-x-2 px-4 "
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </View>
      {isSearchOpen && debouncedSearchQuery.length === 0 ? (
        <View
          className={cn(
            "items-center justify-center flex",
            keyboardShown ? keyboardShownContentHeight : "flex-1"
          )}
        >
          <Quote
            quote="Type a name, and perhaps a tale will answer."
            Icon={Search}
          />
        </View>
      ) : (
        <>
          {isLoadingNovels ? (
            <View
              className={cn(
                "items-center justify-center flex",
                keyboardShown ? keyboardShownContentHeight : "flex-1"
              )}
            >
              <Loading />
            </View>
          ) : (
            <RenderNovels
              novels={novels}
              width={width}
              hasNextPage={hasNextNovelsPage}
              isFetchingNextPage={isFetchingNextNovelsPage}
              fetchNextPage={fetchNextNovelsPage}
            />
          )}
        </>
      )}
    </View>
  );
}
