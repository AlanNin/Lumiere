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
import { colors } from "@/lib/constants";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ExploreSection, novelController } from "@/server/controllers/novel";
import {
  LucideIcon,
  Telescope,
  Heart,
  BadgeAlert,
  Check,
  Search,
} from "lucide-react-native";
import useDebounce from "@/hooks/useDebounce";
import { Text } from "@/components/defaults";
import Quote from "@/components/statics/quote";
import Loading from "@/components/statics/loading";

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
  if (!novels || novels.length === 0) {
    return (
      <View className="flex-1 items-center justify-center flex flex-col gap-y-3">
        <Text className="text-muted_foreground max-w-56 text-center tracking-widest italic">
          No tales have wandered into this corner yet.
        </Text>
        <Telescope color={colors.muted_foreground} size={20} strokeWidth={1} />
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
              imageUri={item.imageUrl}
              containerClassName={index && index % 2 ? "ml-2" : "mr-2"}
              containerStyle={{ maxWidth }}
              href={{
                pathname: "/novel",
                params: { title: item.title, isLocal: "false" },
              }}
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

  const filterOptions: FilterOption[] = [
    ...(isSearchOpen
      ? [
          {
            key: "search" as ExploreSection,
            label: "Search",
            Icon: Search,
          },
        ]
      : []),
    {
      key: "popular",
      label: "Popular",
      Icon: Heart,
    },
    {
      key: "latest-releases",
      label: "Latest",
      Icon: BadgeAlert,
    },
    {
      key: "completed",
      label: "Completed",
      Icon: Check,
    },
  ];

  const [selectedFilter, setSelectedFilter] = React.useState<FilterOption>(
    filterOptions[0]
  );

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
        <Quote
          quote="Type a name, and perhaps a tale will answer."
          Icon={Search}
        />
      ) : (
        <>
          {isLoadingNovels ? (
            <Loading />
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
