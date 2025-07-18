import React from "react";
import NovelCard from "@/components/novel/novelCard";
import TabHeader from "@/components/tabHeader";
import { FlatList, View, useWindowDimensions } from "react-native";
import { Novel } from "@/types/novel";
import { TabView, TabBar } from "react-native-tab-view";
import { colors } from "@/lib/constants";
import { Telescope } from "lucide-react-native";
import Quote from "@/components/statics/quote";
import { useQuery } from "@tanstack/react-query";
import { libraryController } from "@/server/controllers/library";

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

const renderNovels = (novels: Novel[], width: number) => {
  if (novels.length === 0) {
    return (
      <Quote
        quote="No tales have wandered into this corner yet."
        Icon={Telescope}
      />
    );
  }

  return (
    <View className="flex-1">
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
      />
    </View>
  );
};

export default function HomeScreen() {
  const [index, setIndex] = React.useState(0);

  const { width } = useWindowDimensions();

  const defaultLibrary = [
    { id: 0, label: "Default", novels: [], sortOrder: 0 },
  ];

  const { data: libraryCategories = defaultLibrary } = useQuery({
    queryKey: ["library"],
    queryFn: () => libraryController.getLibrary(),
  });

  const hasAnyNovels = libraryCategories.some(
    (cat) => Array.isArray(cat.novels) && cat.novels.length > 0
  );

  const sortedCategories = React.useMemo(() => {
    const source = !libraryCategories ? defaultLibrary : libraryCategories;

    return [...source].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [libraryCategories, defaultLibrary]);

  const routes = React.useMemo(
    () =>
      sortedCategories.map((category) => ({
        key: category.id.toString(),
        title: category.label,
      })),
    [sortedCategories]
  );

  const renderScenes = sortedCategories.reduce((scenes, category) => {
    const key = category.id.toString();
    scenes[key] = () => renderNovels(category.novels, width);
    return scenes;
  }, {} as { [key: string]: () => React.ReactNode });

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Library"
        showSearch={hasAnyNovels}
        containerClassName="mb-1"
      />
      <TabView
        navigationState={{ index, routes }}
        renderScene={({ route }) => {
          const scene = renderScenes[route.key];
          return scene ? scene() : null;
        }}
        onIndexChange={setIndex}
        initialLayout={{ width: width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
}
