import QueueCard from "@/components/more/downloadQueue/queueCard";
import Quote from "@/components/statics/quote";
import TabHeader from "@/components/tabHeader";
import {
  QueueDownloadItem,
  useChapterDownloadQueue,
} from "@/hooks/useChapterDownloadQueue";
import { colors } from "@/lib/constants";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import { ArrowDownToLine, Pause, Shredder, Tags } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedFlashList = Animated.createAnimatedComponent<
  FlashListProps<QueueDownloadItem>
>(FlashList);

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const {
    queueDownload,
    toggleAllDownloadsPaused,
    areDownloadsPaused,
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
      <TouchableOpacity className="p-2" onPress={toggleAllDownloadsPaused}>
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

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Download Queue"
        renderBackButton
        scrollY={scrollY}
        customRightContent={HeaderRightButtons()}
      />
      {queueDownload && queueDownload?.length > 0 ? (
        <AnimatedFlashList
          data={queueDownload}
          renderItem={({ item }) => {
            return <QueueCard item={item} />;
          }}
          contentContainerStyle={{
            padding: 16,
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
        <Quote quote="No downloads yet. Add some!" Icon={Tags} />
      )}
    </View>
  );
}
