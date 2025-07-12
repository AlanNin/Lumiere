import {
  FlatList,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import BottomDrawer from "../bottomDrawer";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useState } from "react";
import { colors } from "@/lib/constants";
import { SceneMap, TabBar, TabView } from "react-native-tab-view";
import { Text } from "../defaults";
import { cn } from "@/lib/cn";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import Checkbox from "../checkbox";
import {
  NovelChaptersFilter,
  NovelChaptersSortUI,
  NovelInfo,
} from "@/types/novel";
import { useConfig } from "@/providers/appConfig";

const SECTIONS: { key: string; label: string }[] = [
  { key: "filter", label: "Filter" },
  { key: "sort", label: "Sort" },
];

const FILTER_OPTIONS: {
  key: NovelChaptersFilter["key"];
  label: string;
}[] = [
  { key: "downloaded", label: "Downloaded" },
  { key: "unread", label: "Unread" },
  { key: "bookmarked", label: "Bookmarked" },
];

const SORT_OPTIONS: {
  key: NovelChaptersSortUI["key"];
  label: string;
}[] = [{ key: "by_chapter", label: "By Chapter" }];

const renderTabBar = (props: any) => (
  <TabBar
    {...props}
    style={{
      backgroundColor: "transparent",
      shadowColor: "transparent",
      borderBottomColor: colors.muted,
      borderBottomWidth: 0.5,
      marginBottom: 12,
    }}
    tabStyle={{
      flex: 1,
    }}
    indicatorStyle={{
      backgroundColor: colors.primary,
    }}
    activeColor={colors.primary}
    scrollEnabled={false}
  />
);

function renderFilterSection({
  novelTitle,
}: {
  novelTitle: NovelInfo["title"];
}) {
  const [novelChaptersFilter, setNovelChaptersFilter] = useConfig<
    Record<string, NovelChaptersFilter["value"]>
  >(`novelChaptersFilter-${novelTitle}`, {});

  function handleChange(key: string) {
    const current = novelChaptersFilter[key] ?? "unchecked";
    const next: NovelChaptersFilter["value"] =
      current === "unchecked"
        ? "checked"
        : current === "checked"
        ? "indeterminate"
        : "unchecked";

    setNovelChaptersFilter({
      ...novelChaptersFilter,
      [key]: next,
    });
  }

  const renderItem = ({
    item: option,
  }: {
    item: typeof FILTER_OPTIONS[number];
  }) => {
    const status = novelChaptersFilter[option.key] ?? "unchecked";

    return (
      <TouchableOpacity
        onPress={() => handleChange(option.key)}
        className="flex flex-row items-center gap-x-4 py-2"
      >
        <Checkbox status={status} />
        <Text
          className={cn(
            status === "unchecked" && "opacity-75 text-muted_foreground",
            status === "indeterminate" && "opacity-50"
          )}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1">
      <FlatList
        data={FILTER_OPTIONS}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 8 }}
      />
    </View>
  );
}

function renderSortSection({ novelTitle }: { novelTitle: NovelInfo["title"] }) {
  const [novelChaptersSort, setNovelChaptersSort] = useConfig<
    NovelChaptersSortUI
  >(`novelChaptersSort-${novelTitle}`, {
    key: "by_chapter",
    label: "By Chapter",
    order: "asc",
  });

  function handleChange(option: {
    key: NovelChaptersSortUI["key"];
    label: string;
  }) {
    if (option.key === novelChaptersSort.key) {
      const nextOrder = novelChaptersSort.order === "asc" ? "desc" : "asc";
      setNovelChaptersSort({
        ...novelChaptersSort,
        order: nextOrder,
      });
    } else {
      setNovelChaptersSort({
        key: option.key,
        label: option.label,
        order: "asc",
      });
    }
  }

  const renderItem = ({
    item: option,
  }: {
    item: { key: NovelChaptersSortUI["key"]; label: string };
  }) => {
    const isSelected = option.key === novelChaptersSort.key;
    const order = isSelected ? novelChaptersSort.order : "asc";

    return (
      <TouchableOpacity
        onPress={() => handleChange(option)}
        className="flex flex-row items-center gap-x-4 py-2"
      >
        {order === "asc" ? (
          <ArrowUp
            color={isSelected ? colors.primary : "transparent"}
            size={20}
            strokeWidth={1.6}
          />
        ) : (
          <ArrowDown
            color={isSelected ? colors.primary : "transparent"}
            size={20}
            strokeWidth={1.6}
          />
        )}
        <Text className={cn(!isSelected && "opacity-75")}>{option.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1">
      <FlatList
        data={SORT_OPTIONS}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 8 }}
      />
    </View>
  );
}

export default function NovelChaptersFilterDrawer({
  bottomDrawerRef,
  novelTitle,
}: {
  bottomDrawerRef: React.RefObject<BottomSheetModal | null>;
  novelTitle: NovelInfo["title"];
}) {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();

  const routes = SECTIONS.map((section) => ({
    key: section.key,
    title: section.label,
  }));

  const sceneRenderers = SECTIONS.reduce(
    (acc) => ({
      ...acc,
      filter: () => renderFilterSection({ novelTitle }),
      sort: () => renderSortSection({ novelTitle }),
    }),
    {} as Record<string, () => React.ReactNode>
  );

  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex-1 h-60">
        <TabView
          navigationState={{ index, routes }}
          renderScene={SceneMap(sceneRenderers)}
          onIndexChange={setIndex}
          initialLayout={{ width: width }}
          renderTabBar={renderTabBar}
        />
      </View>
    </BottomDrawer>
  );
}
