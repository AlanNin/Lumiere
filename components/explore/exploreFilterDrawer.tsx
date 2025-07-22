import { RefObject, useCallback, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Picker } from "@react-native-picker/picker";
import { Text } from "../defaults";
import { cn } from "@/lib/cn";
import Checkbox from "../checkbox";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { colors } from "@/lib/constants";

type CheckboxStatus = "unchecked" | "checked";

interface SectionConfig<OptionKey extends string | number> {
  key: string;
  title: string;
  collapsible: boolean;
  options: Array<{ key: OptionKey; label: string }>;
}

const SECTIONS: SectionConfig<string | number>[] = [
  {
    key: "origin",
    title: "Origin",
    collapsible: true,
    options: [
      { key: "chinese", label: "Chinese" },
      { key: "korean", label: "Korean" },
      { key: "japanese", label: "Japanese" },
      { key: "english", label: "English" },
    ],
  },
  {
    key: "genres",
    title: "Genres",
    collapsible: true,
    options: [
      { key: 3, label: "Action" },
      { key: 28, label: "Adult" },
      { key: 4, label: "Adventure" },
      { key: 46, label: "Anime" },
      { key: 47, label: "Arts" },
      { key: 5, label: "Comedy" },
      { key: 24, label: "Drama" },
      { key: 44, label: "Eastern" },
      { key: 26, label: "Ecchi" },
      { key: 48, label: "Fan‑fiction" },
      { key: 6, label: "Fantasy" },
      { key: 19, label: "Game" },
      { key: 25, label: "Gender Bender" },
      { key: 7, label: "Harem" },
      { key: 12, label: "Historical" },
      { key: 37, label: "Horror" },
      { key: 49, label: "Isekai" },
      { key: 2, label: "Josei" },
      { key: 45, label: "Lgbt+" },
      { key: 50, label: "Magic" },
      { key: 51, label: "Magical realism" },
      { key: 52, label: "Manhua" },
      { key: 15, label: "Martial Arts" },
      { key: 8, label: "Mature" },
      { key: 34, label: "Mecha" },
      { key: 53, label: "Military" },
      { key: 54, label: "Modern life" },
      { key: 55, label: "Movies" },
      { key: 16, label: "Mystery" },
      { key: 64, label: "Other" },
      { key: 9, label: "Psychological" },
      { key: 56, label: "Realistic fiction" },
      { key: 43, label: "Reincarnation" },
      { key: 1, label: "Romance" },
      { key: 21, label: "School Life" },
      { key: 20, label: "Sci‑fi" },
      { key: 10, label: "Seinen" },
      { key: 38, label: "Shoujo" },
      { key: 57, label: "Shoujo ai" },
      { key: 17, label: "Shounen" },
      { key: 39, label: "Shounen Ai" },
      { key: 13, label: "Slice of Life" },
      { key: 29, label: "Smut" },
      { key: 42, label: "Sports" },
      { key: 18, label: "Supernatural" },
      { key: 58, label: "System" },
      { key: 32, label: "Tragedy" },
      { key: 63, label: "Urban" },
      { key: 59, label: "Urban life" },
      { key: 60, label: "Video games" },
      { key: 61, label: "War" },
      { key: 31, label: "Wuxia" },
      { key: 23, label: "Xianxia" },
      { key: 22, label: "Xuanhuan" },
      { key: 14, label: "Yaoi" },
      { key: 62, label: "Yuri" },
    ],
  },
  {
    key: "chapters",
    title: "Chapters",
    collapsible: false,
    options: [
      { key: "all", label: "All" },
      { key: "<50", label: "< 50" },
      { key: "50-100", label: "50 - 100" },
      { key: "100-200", label: "100 - 200" },
      { key: "200-500", label: "200 - 500" },
      { key: "500-1000", label: "500 - 1000" },
      { key: ">1000", label: "> 1000" },
    ],
  },
  {
    key: "rating",
    title: "Rating",
    collapsible: false,
    options: [
      { key: "none", label: "None" },
      { key: "1", label: "1 Stars" },
      { key: "2", label: "2 Stars" },
      { key: "3", label: "3 Stars" },
      { key: "4", label: "4 Stars" },
      { key: "5", label: "5 Stars" },
    ],
  },
  {
    key: "status",
    title: "Status",
    collapsible: false,
    options: [
      { key: "all", label: "All" },
      { key: "ongoing", label: "OnGoing" },
      { key: "completed", label: "Completed" },
    ],
  },
];

type SectionKey = typeof SECTIONS[number]["key"];

type HeaderItem = {
  type: "header";
  section: SectionKey;
};

type OptionItem = {
  type: SectionKey;
  key: string | number;
  label: string;
  collapsible: boolean;
};

type ListItem = HeaderItem | OptionItem;

function isHeader(item: ListItem): item is HeaderItem {
  return item.type === "header";
}

interface ExploreFilterDrawerProps {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
}

export default function ExploreFilterDrawer({
  bottomDrawerRef,
}: ExploreFilterDrawerProps) {
  // Track which sections are expanded
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, false]))
  );

  // Unified state for all filter values
  const [filters, setFilters] = useState<{
    origin: Record<string, CheckboxStatus>;
    genres: Record<string, CheckboxStatus>;
    chapters: string;
    rating: string;
    status: string;
  }>({
    origin: {},
    genres: {},
    chapters: "all",
    rating: "none",
    status: "all",
  });

  // Build flat list data
  const data: ListItem[] = useMemo(() => {
    return SECTIONS.flatMap((section) => {
      const header: HeaderItem = { type: "header", section: section.key };
      if (section.collapsible && !expanded[section.key]) {
        return [header];
      }
      const options: OptionItem[] = section.options.map((opt) => ({
        type: section.key,
        key: opt.key,
        label: opt.label,
        collapsible: section.collapsible,
      }));
      return [header, ...options];
    });
  }, [expanded]);

  // Toggle expandable sections
  const onToggleSection = useCallback((key: SectionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Toggle checkbox options (origin & genres)
  const onToggleCheckbox = useCallback(
    (section: "origin" | "genres", key: string | number) => {
      setFilters((prev) => {
        const curr = prev[section][key] ?? "unchecked";
        const next: CheckboxStatus =
          curr === "unchecked" ? "checked" : "unchecked";
        return {
          ...prev,
          [section]: { ...prev[section], [key]: next },
        };
      });
    },
    []
  );

  // Change picker value
  const onChangePicker = useCallback(
    (section: "chapters" | "rating" | "status", value: string) => {
      setFilters((prev) => ({ ...prev, [section]: value }));
    },
    []
  );

  // Count selected for header display
  const countSelected = useCallback(
    (section: "origin" | "genres") =>
      Object.values(filters[section]).filter((v) => v === "checked").length,
    [filters]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (isHeader(item)) {
        const cfg = SECTIONS.find((s) => s.key === item.section)!;
        const isColl = cfg.collapsible;
        const isExp = expanded[item.section];
        const badgeCount =
          item.section === "origin" || item.section === "genres"
            ? countSelected(item.section)
            : 0;
        const isPicker =
          item.section === "chapters" ||
          item.section === "rating" ||
          item.section === "status";

        // Picker row
        if (isPicker) {
          const value =
            filters[item.section as "chapters" | "rating" | "status"];
          return (
            <View className="py-3">
              <Text className="text-lg font-medium">{cfg.title}</Text>
              <Picker
                selectedValue={value}
                onValueChange={(v) =>
                  onChangePicker(item.section as any, v as string)
                }
                style={{
                  width: "100%",
                  backgroundColor: colors.muted_foreground + "25",
                  marginTop: 8,
                }}
              >
                {cfg.options.map((opt) => (
                  <Picker.Item
                    key={opt.key}
                    label={opt.label}
                    value={opt.key}
                    style={{ color: colors.foreground }}
                  />
                ))}
              </Picker>
            </View>
          );
        }

        // Header row
        return (
          <TouchableOpacity
            onPress={() =>
              isColl && onToggleSection(item.section as SectionKey)
            }
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center gap-x-2">
              {isColl &&
                (isExp ? (
                  <ChevronDown size={20} color={colors.foreground} />
                ) : (
                  <ChevronRight size={20} color={colors.foreground} />
                ))}
              <Text className="text-lg font-medium">
                {cfg.title}
                {badgeCount > 0 && ` (${badgeCount})`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }

      // Option row
      if (!item.collapsible) {
        return null;
      }
      const section = item.type as "origin" | "genres";
      const status = filters[section][item.key] ?? "unchecked";
      return (
        <TouchableOpacity
          onPress={() => onToggleCheckbox(section, item.key)}
          className="flex-row items-center gap-x-4 py-2"
        >
          <Checkbox status={status} />
          <Text
            className={cn(
              status === "unchecked" && "opacity-75 text-muted_foreground"
            )}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [
      expanded,
      filters,
      onChangePicker,
      onToggleCheckbox,
      onToggleSection,
      countSelected,
    ]
  );

  return (
    <BottomDrawer
      ref={bottomDrawerRef}
      renderList={({ style }) => (
        <BottomSheetFlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, idx) =>
            isHeader(item)
              ? `header-${item.section}`
              : `${item.type}-${item.key}`
          }
          showsVerticalScrollIndicator={false}
          style={style}
          contentContainerStyle={{ paddingBottom: 44 }}
        />
      )}
    />
  );
}
