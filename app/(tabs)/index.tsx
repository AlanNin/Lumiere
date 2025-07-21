import { ReactNode, useEffect, useMemo, useState } from "react";
import NovelCard from "@/components/novel/novelCard";
import TabHeader from "@/components/tabHeader";
import {
  FlatList,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Novel } from "@/types/novel";
import { TabView, TabBar, TabBarItem } from "react-native-tab-view";
import { colors } from "@/lib/constants";
import { Telescope } from "lucide-react-native";
import Quote from "@/components/statics/quote";
import { useQuery } from "@tanstack/react-query";
import { libraryController } from "@/server/controllers/library";
import { Text } from "@/components/defaults";
import { useKeyboard } from "@react-native-community/hooks";
import { cn } from "@/lib/cn";
import { useRouter } from "expo-router";
import { useNovelRefreshQueue } from "@/hooks/useNovelRefreshQueue";
import { RefreshControl } from "react-native-gesture-handler";

const renderTabBar = (props: any) => (
  <TabBar
    {...props}
    style={{
      backgroundColor: colors.background,
      borderBottomColor: colors.muted,
      borderBottomWidth: 0.5,
      paddingLeft: 4,
      paddingRight: 4,
    }}
    tabStyle={{ width: "auto" }}
    indicatorStyle={{
      backgroundColor: colors.primary,
      width: 0.6,
    }}
    activeColor={colors.primary}
    scrollEnabled
  />
);

const renderNovels = ({
  novels,
  width,
  searchQuery,
  keyboardShown,
  onSearchInExplorer,
  onRefreshLibrary,
  getIsRefreshing,
}: {
  novels: Novel[];
  width: number;
  searchQuery: string;
  keyboardShown: boolean;
  onSearchInExplorer: () => void;
  onRefreshLibrary: (titles: string[]) => void;
  getIsRefreshing: () => boolean;
}) => {
  const isRefreshing = getIsRefreshing();

  return (
    <View className="flex-1">
      {searchQuery.length > 0 && (
        <TouchableOpacity
          className="my-1 py-2 flex items-center justify-center"
          onPress={onSearchInExplorer}
        >
          <Text className="text-center text-primary" style={{ marginTop: 16 }}>
            Search for "{searchQuery}" in the explorer
          </Text>
        </TouchableOpacity>
      )}
      {novels.length > 0 ? (
        <FlatList
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
              />
            );
          }}
          contentContainerClassName="gap-4 p-4"
          keyExtractor={(item) => item.title}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              onRefresh={() => onRefreshLibrary(novels.map((n) => n.title))}
              refreshing={isRefreshing}
              progressBackgroundColor={colors.primary}
              colors={[colors.primary_foreground]}
            />
          }
        />
      ) : (
        <View
          className={cn(
            "items-center justify-center flex",
            keyboardShown ? "h-[32%]" : "flex-1"
          )}
        >
          <Quote
            quote="No tales have wandered into this corner yet."
            Icon={Telescope}
          />
        </View>
      )}
    </View>
  );
};

export default function HomeScreen() {
  const [index, setIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { width } = useWindowDimensions();
  const { keyboardShown } = useKeyboard();
  const router = useRouter();
  const { enqueueLibraryRefresh, isLibraryRefreshing } = useNovelRefreshQueue();

  function handleSearchInExplorer() {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push({
      pathname: "/explore",
      params: { searchQuery },
    });
  }

  const defaultLibrary = [
    { id: 0, label: "Default", novels: [], sortOrder: 0 },
  ];

  const { data: libraryCategories = defaultLibrary, isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: () => libraryController.getLibrary(),
  });

  const selectedCategories = libraryCategories?.length
    ? libraryCategories
    : defaultLibrary;

  const hasAnyNovels = selectedCategories.some(
    (cat) => Array.isArray(cat.novels) && cat.novels.length > 0
  );

  const sortedCategories = useMemo(() => {
    return [...selectedCategories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedCategories]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedCategories.map((cat) => {
      const filtered = q.length
        ? cat.novels.filter((novel) => {
            const genresArray = novel.genres
              .split(",")
              .map((g) => g.trim().toLowerCase());

            return (
              novel.title.toLowerCase().includes(q) ||
              novel.author.toLowerCase().includes(q) ||
              novel.description.toLowerCase().includes(q) ||
              genresArray.includes(q)
            );
          })
        : cat.novels;

      return {
        ...cat,
        filteredNovels: filtered,
      };
    });
  }, [sortedCategories, searchQuery]);

  const routes = useMemo(
    () =>
      filteredCategories.map((cat) => ({
        key: cat.id.toString(),
        title:
          searchQuery.length > 0
            ? `${cat.label} (${cat.filteredNovels.length})`
            : cat.label,
      })),
    [filteredCategories]
  );

  useEffect(() => {
    if (routes.length > 0 && index >= routes.length) {
      setIndex(0);
    }
  }, [routes.length, index]);

  const renderScenes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sortedCategories.reduce((scenes, category) => {
      const filteredNovels =
        query.length > 0
          ? category.novels.filter((novel) => {
              const q = query;
              const genresArray = novel.genres
                .split(",")
                .map((g) => g.trim().toLowerCase());

              return (
                novel.title.toLowerCase().includes(q) ||
                novel.author.toLowerCase().includes(q) ||
                novel.description.toLowerCase().includes(q) ||
                genresArray.includes(q)
              );
            })
          : category.novels;

      scenes[category.id.toString()] = () =>
        renderNovels({
          novels: filteredNovels,
          width,
          searchQuery,
          keyboardShown,
          onSearchInExplorer: handleSearchInExplorer,
          onRefreshLibrary: (titles) =>
            enqueueLibraryRefresh(category.id, titles),
          getIsRefreshing: () => isLibraryRefreshing(category.id),
        });

      return scenes;
    }, {} as { [key: string]: () => ReactNode });
  }, [sortedCategories, width, searchQuery, keyboardShown]);

  const validIndex = Math.min(
    Math.max(index, 0),
    Math.max(routes.length - 1, 0)
  );

  const renderContent = () => {
    if (isLoading) {
      return;
    }

    if (routes.length === 0) {
      return (
        <View className="flex-1">
          <Quote
            quote="No tales have wandered into this corner yet."
            Icon={Telescope}
          />
        </View>
      );
    }

    return (
      <TabView
        navigationState={{ index: validIndex, routes }}
        renderScene={({ route }) => {
          const scene = renderScenes[route.key];
          return scene ? scene() : null;
        }}
        onIndexChange={setIndex}
        initialLayout={{ width: width }}
        renderTabBar={renderTabBar}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Library"
        showSearch={hasAnyNovels && !isLoading}
        containerClassName="mb-1"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />
      {renderContent()}
    </View>
  );
}
