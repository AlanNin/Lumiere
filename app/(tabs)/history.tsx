import HistoryBatchCard from "@/components/history/historyBatchCard";
import HistoryRemoveAllDrawer from "@/components/history/historyRemoveAllDrawer";
import HistoryRemoveEntriesDrawer from "@/components/history/historyRemoveEntriesDrawer";
import Loading from "@/components/statics/loading";
import Quote from "@/components/statics/quote";
import TabHeader from "@/components/tabHeader";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/constants";
import { historyController } from "@/server/controllers/history";
import type { HistoryBatch } from "@/types/history";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useKeyboard } from "@react-native-community/hooks";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Shredder, Search } from "lucide-react-native";
import { useState, useMemo, useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<HistoryBatch>
>(FlashList);

export default function HistoryScreen() {
  const { keyboardShown } = useKeyboard();
  const scrollY = useSharedValue(0);

  const [entryToRemove, setEntryToRemove] = useState<{
    novelTitle: string;
    chapterNumber: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const removeHistoryEntriesDrawerRef = useRef<BottomSheetModal>(null);

  const removeAllHistoryDrawerRef = useRef<BottomSheetModal>(null);

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["history"],
    queryFn: () => historyController.getHistory(),
  });

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (!searchQuery) return history;

    return history
      .map((batch) => {
        const filteredChapters = batch.chaptersHistory.filter((h) =>
          h.novelTitle.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filteredChapters.length > 0
          ? { ...batch, chaptersHistory: filteredChapters }
          : null;
      })
      .filter((b): b is HistoryBatch => b !== null);
  }, [history, searchQuery]);

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function renderRemoveAllEntriesButton() {
    const list = searchQuery ? filteredHistory : history;
    if (!list || list.length === 0) return null;

    return (
      <TouchableOpacity
        className="p-2"
        onPress={() => removeAllHistoryDrawerRef.current?.present()}
      >
        <Shredder color={colors.muted_foreground} size={20} strokeWidth={1.6} />
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="History"
        showSearch={Boolean(history && history.length > 0)}
        scrollY={scrollY}
        customRightContent={renderRemoveAllEntriesButton()}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      {isLoadingHistory ? (
        <View
          className={cn(
            "items-center justify-center flex",
            keyboardShown ? "h-[36%]" : "flex-1"
          )}
        >
          <Loading />
        </View>
      ) : (
        <>
          {(searchQuery ? filteredHistory : history)?.length === 0 ? (
            <View
              className={cn(
                "items-center justify-center flex",
                keyboardShown ? "h-[36%]" : "flex-1"
              )}
            >
              <Quote
                quote="The timeline lies silent, your first chapter awaits."
                Icon={BookOpen}
              />
            </View>
          ) : (
            <AnimatedFlashList
              data={searchQuery ? filteredHistory : history!}
              renderItem={({ item }) => (
                <HistoryBatchCard
                  history={item}
                  openRemoveEntryDrawer={(entry) => {
                    setEntryToRemove(entry);
                    removeHistoryEntriesDrawerRef.current?.present();
                  }}
                />
              )}
              contentContainerStyle={{
                padding: 16,
              }}
              keyExtractor={(item) =>
                `${item.readAt}-${item.chaptersHistory[0].readAt}`
              }
              removeClippedSubviews={false}
              onScroll={scrollYHandler}
              estimatedItemSize={153}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      <HistoryRemoveEntriesDrawer
        bottomDrawerRef={removeHistoryEntriesDrawerRef}
        entryToRemove={entryToRemove}
        setEntryToRemove={setEntryToRemove}
      />

      <HistoryRemoveAllDrawer bottomDrawerRef={removeAllHistoryDrawerRef} />
    </View>
  );
}
