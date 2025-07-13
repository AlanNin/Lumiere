import HistoryBatchCard from "@/components/history/historyBatchCard";
import HistoryRemoveEntriesModal from "@/components/history/historyRemoveEntriesModal";
import Loading from "@/components/statics/loading";
import Quote from "@/components/statics/quote";
import TabHeader from "@/components/tabHeader";
import { cn } from "@/lib/cn";
import { historyController } from "@/server/controllers/history";
import { HistoryBatch } from "@/types/history";

import { useKeyboard } from "@react-native-community/hooks";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
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
  const [removeAllChaptersFromEntry, setRemoveAllChaptersFromEntry] = useState(
    false
  );

  const {
    data: history,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["history"],
    queryFn: () => historyController.getHistory(),
  });

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleResetRemoveEntryStates() {
    setEntryToRemove(null);
    setRemoveAllChaptersFromEntry(false);
  }

  const { mutate: removeChapterFromHistory } = useMutation({
    mutationFn: ({
      novelTitle,
      chapterNumber,
    }: {
      novelTitle: string;
      chapterNumber: number;
    }) =>
      historyController.removeChapterFromHistory({
        novelTitle,
        chapterNumber,
      }),
    onSuccess: () => {
      refetchHistory();
      handleResetRemoveEntryStates();
    },
  });

  const { mutate: removeNovelFromHistory } = useMutation({
    mutationFn: ({ novelTitle }: { novelTitle: string }) =>
      historyController.removeNovelFromHistory({
        novelTitle,
      }),
    onSuccess: () => {
      refetchHistory();
      handleResetRemoveEntryStates();
    },
  });

  function handleRemoveEntry() {
    if (!entryToRemove) return;

    if (removeAllChaptersFromEntry) {
      removeNovelFromHistory({ novelTitle: entryToRemove.novelTitle });
    } else {
      removeChapterFromHistory({
        novelTitle: entryToRemove.novelTitle,
        chapterNumber: entryToRemove.chapterNumber,
      });
    }
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="History"
        showSearch={history !== null}
        scrollY={scrollY}
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
          {history?.length === 0 ? (
            <Quote
              quote="The timeline lies silent, your first chapter awaits."
              Icon={BookOpen}
            />
          ) : (
            <AnimatedFlashList
              data={history}
              renderItem={({ item }) => {
                return (
                  <HistoryBatchCard
                    history={item}
                    openRemoveEntryDrawer={setEntryToRemove}
                  />
                );
              }}
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

      <HistoryRemoveEntriesModal
        entryToRemove={entryToRemove}
        handleClose={handleResetRemoveEntryStates}
        removeAllChaptersFromEntry={removeAllChaptersFromEntry}
        setRemoveAllChaptersFromEntry={setRemoveAllChaptersFromEntry}
        handleRemoveEntry={handleRemoveEntry}
      />
    </View>
  );
}
