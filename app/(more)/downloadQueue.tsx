import QueueItemOptionsDrawer from "@/components/more/downloadQueue/QueueItemOptionsDrawer";
import ClearQueueDrawer from "@/components/more/downloadQueue/clearQueueDrawer";
import QueueCard from "@/components/more/downloadQueue/queueCard";
import Quote from "@/components/statics/quote";
import TabHeader from "@/components/tabHeader";
import {
  QueueDownloadItem,
  useChapterDownloadQueue,
} from "@/hooks/useChapterDownloadQueue";
import { colors } from "@/lib/constants";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import {
  ArrowBigDownDash,
  ArrowDownToLine,
  Pause,
  Shredder,
} from "lucide-react-native";
import { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<QueueDownloadItem>
>(FlashList);

export default function DownloadQueueScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [selectedQueueItem, setSelectedQueueItem] = useState<
    QueueDownloadItem | undefined
  >();
  const queueItemOptionsDrawerRef = useRef<BottomSheetModal>(null);
  const clearQueueDrawerRef = useRef<BottomSheetModal>(null);

  const {
    queueDownload,
    toggleAllDownloadsPaused,
    areDownloadsPaused,
    moveUp,
    moveDown,
    moveToTop,
    moveToBottom,
    moveNovelToTop,
    moveNovelToBottom,
    cancelDownload,
    cancelNovelDownloads,
    cancelAllDownloads,
  } = useChapterDownloadQueue();

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function ToggleQueuePauseButton() {
    return (
      <TouchableOpacity className="p-2" onPress={toggleAllDownloadsPaused}>
        {areDownloadsPaused ? (
          <ArrowDownToLine
            color={colors.muted_foreground}
            size={20}
            strokeWidth={1.6}
          />
        ) : (
          <Pause color={colors.muted_foreground} size={20} strokeWidth={1.6} />
        )}
      </TouchableOpacity>
    );
  }

  function ToggleRemoveAllButton() {
    return (
      <TouchableOpacity
        className="p-2"
        onPress={() => clearQueueDrawerRef.current?.present()}
      >
        <Shredder color={colors.muted_foreground} size={20} strokeWidth={1.6} />
      </TouchableOpacity>
    );
  }

  function HeaderRightButtons() {
    if (!queueDownload || queueDownload.length === 0) return null;

    return (
      <View className="flex flex-row items-center gap-x-3">
        <ToggleQueuePauseButton />
        <ToggleRemoveAllButton />
      </View>
    );
  }

  function openItemOptionsDrawer(item: QueueDownloadItem) {
    setSelectedQueueItem(item);
    queueItemOptionsDrawerRef.current?.present();
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title={
          queueDownload.length > 0
            ? `Download Queue (${queueDownload.length})`
            : "Download Queue"
        }
        renderBackButton
        scrollY={scrollY}
        customRightContent={HeaderRightButtons()}
      />
      {queueDownload && queueDownload?.length > 0 ? (
        <AnimatedFlashList
          data={queueDownload}
          renderItem={({ item }) => {
            return (
              <QueueCard
                item={item}
                openItemOptionsDrawer={openItemOptionsDrawer}
              />
            );
          }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom,
          }}
          keyExtractor={(item) =>
            `${item.id?.toString()}-${item.novelTitle.toString()}-${item.chapterNumber.toString()}`
          }
          showsVerticalScrollIndicator={false}
          estimatedItemSize={80}
          onScroll={scrollYHandler}
          scrollEventThrottle={16}
        />
      ) : (
        <Quote quote="No downloads yet. Add some!" Icon={ArrowBigDownDash} />
      )}

      <QueueItemOptionsDrawer
        bottomDrawerRef={queueItemOptionsDrawerRef}
        selectedQueueItem={selectedQueueItem}
        setSelectedQueueItem={setSelectedQueueItem}
        moveUp={moveUp}
        moveDown={moveDown}
        moveToTop={moveToTop}
        moveToBottom={moveToBottom}
        moveNovelToTop={moveNovelToTop}
        moveNovelToBottom={moveNovelToBottom}
        cancelDownload={cancelDownload}
        cancelNovelDownloads={cancelNovelDownloads}
      />

      <ClearQueueDrawer
        bottomDrawerRef={clearQueueDrawerRef}
        handleRemoveAll={cancelAllDownloads}
      />
    </View>
  );
}
