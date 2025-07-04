import React from "react";
import NovelCard from "@/components/novel/novelCard";
import TabHeader from "@/components/tabHeader";
import { FlatList, View, useWindowDimensions } from "react-native";
import { Novel } from "@/types/novel";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { colors } from "@/lib/constants";
import { Frown, Telescope } from "lucide-react-native";
import Quote from "@/components/statics/quote";
import { libraryLiveQuery } from "@/server/liveQueries/library";

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
      />
    </View>
  );
};

export default function HomeScreen() {
  const [index, setIndex] = React.useState(0);

  const { width } = useWindowDimensions();

  const libraryCategories = libraryLiveQuery.getLibrary();

  const sortedCategories = React.useMemo(
    () => [...libraryCategories].sort((a, b) => a.sortOrder - b.sortOrder),
    [libraryCategories]
  );

  const routes = React.useMemo(
    () =>
      sortedCategories.map((category) => ({
        key: category.label,
        title: category.label,
      })),
    [sortedCategories]
  );

  const renderScenes = sortedCategories.reduce((scenes, category) => {
    scenes[category.label] = () => renderNovels(category.novels, width);
    return scenes;
  }, {} as { [key: string]: () => React.ReactNode });

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

  if (routes.length === 0) {
    return <Quote quote="No categories found." Icon={Frown} />;
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader title="Library" />
      <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap(renderScenes)}
        onIndexChange={setIndex}
        initialLayout={{ width: width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
}
