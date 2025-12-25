import { useCallback, useEffect, useMemo, useState } from 'react';
import FilterCategory from '@/components/explore/filterCategory';
import TabHeader from '@/components/tabHeader';
import NovelCard from '@/components/novel/novelCard';
import { Novel } from '@/types/novel';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '@/lib/constants';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ExploreSection, novelController } from '@/server/controllers/novel';
import {
  LucideIcon,
  Telescope,
  Heart,
  BadgeAlert,
  Search,
  Globe,
  History,
  WifiOff,
} from 'lucide-react-native';
import useDebounce from '@/hooks/useDebounce';
import Quote from '@/components/statics/quote';
import Loading from '@/components/statics/loading';
import { useLocalSearchParams } from 'expo-router';
import { useIsOnline } from '@/providers/network';

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
  const isOnline = useIsOnline();

  if (!novels || novels.length === 0) {
    return (
      <View className="flex flex-1 items-center justify-center">
        <Quote quote="Archives empty. Try another search." Icon={Telescope} />
      </View>
    );
  }

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const scrollTop = contentOffset.y;
      const scrollHeight = contentSize.height;
      const clientHeight = layoutMeasurement.height;

      if (hasNextPage && !isFetchingNextPage && scrollHeight - scrollTop <= clientHeight + 200) {
        if (isOnline) {
          fetchNextPage();
        }
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, isOnline]
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
              containerClassName={index && index % 2 ? 'ml-2' : 'mr-2'}
              containerStyle={{ maxWidth }}
              href={{
                pathname: '/novel',
                params: {
                  title: item.title,
                  isSaved: item.isSaved ? 1 : 0,
                },
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
              <View className="flex h-28 w-full flex-col items-center justify-center">
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
  const { searchQuery: paramSearchQuery } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const isOnline = useIsOnline();

  const allFilterOptions: FilterOption[] = useMemo(
    () => [
      {
        key: 'search' as ExploreSection,
        label: 'Search',
        Icon: Search,
      },
      {
        key: 'popular',
        label: 'Popular',
        Icon: Heart,
      },
      {
        key: 'latest-releases',
        label: 'Latest',
        Icon: BadgeAlert,
      },
      {
        key: 'new',
        label: 'New',
        Icon: History,
      },
    ],
    []
  );

  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(allFilterOptions[1]);

  const filterOptions = useMemo(() => {
    if (isSearchOpen) {
      return allFilterOptions;
    } else {
      return allFilterOptions.filter((option) => option.key !== 'search');
    }
  }, [isSearchOpen, allFilterOptions]);

  function handleChangeFilter(filter: FilterOption) {
    setSelectedFilter(filter);
    setSearchQuery('');
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
      'explore-novels',
      isSearchOpen ? `search-${debouncedSearchQuery}` : selectedFilter.key,
    ],
    queryFn: ({ pageParam }) =>
      novelController.exploreNovels({
        section: isSearchOpen ? 'search' : selectedFilter.key,
        pageNumber: pageParam,
        searchQuery: debouncedSearchQuery,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageNumber! < lastPage.totalPages! ? lastPage.pageNumber! + 1 : undefined,
    enabled: isOnline,
  });

  const novels = novelsData?.pages.flatMap((p) => p.items) ?? [];

  function renderOpenInBrowserButton() {
    function handlePress() {
      Linking.openURL(`${String(process.env.EXPO_PUBLIC_SCRAPE_SITE_URL)}/home`);
    }

    return (
      <TouchableOpacity className="p-2" onPress={handlePress}>
        <Globe color={colors.muted_foreground} size={20} strokeWidth={1.6} />
      </TouchableOpacity>
    );
  }

  useEffect(() => {
    if (paramSearchQuery && paramSearchQuery.length > 0) {
      setSearchQuery(String(paramSearchQuery));
      setIsSearchOpen(true);
    }
  }, [paramSearchQuery]);

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Explore"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        showSearch={isOnline ? true : false}
        customRightContent={renderOpenInBrowserButton()}
      />

      <View className="flex flex-col gap-y-2 border-b-[0.5px] border-muted pb-4">
        <FlatList
          data={filterOptions}
          renderItem={({ item }) => (
            <FilterCategory
              label={item.label}
              Icon={item.Icon}
              selected={isSearchOpen ? item.key === 'search' : item.key === selectedFilter.key}
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
        <View className="flex flex-1 items-center justify-center">
          <Quote quote="Type a name, and perhaps a tale will answer." Icon={Search} />
        </View>
      ) : (
        <>
          {isLoadingNovels ? (
            <View className="flex flex-1 items-center justify-center">
              <Loading />
            </View>
          ) : (
            <>
              {novels.length === 0 && !isOnline ? (
                <Quote
                  quote="No internet connection. Try again later."
                  Icon={WifiOff}
                  iconStrokeWidth={1.3}
                />
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
        </>
      )}
    </View>
  );
}
