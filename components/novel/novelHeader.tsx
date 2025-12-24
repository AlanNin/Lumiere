import { colors } from '@/lib/constants';
import {
  ArrowLeft,
  Download,
  EllipsisVertical,
  FileSearch,
  SquaresIntersect,
  SquaresSubtract,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { Text } from '../defaults';
import { useConfig } from '@/providers/appConfig';

export default function NovelHeader({
  novelTitle,
  scrollY,
  selectedChapters,
  handleClearSelectedChapters,
  handleSelectAllChapters,
  handleSelectRemainingChapters,
  handleOpenSearchChapterDrawer,
  handleOpenDownloadChaptersDrawer,
  handleOpenMoreChapterDrawer,
}: {
  novelTitle: string;
  scrollY: SharedValue<number>;
  selectedChapters: number;
  handleClearSelectedChapters: () => void;
  handleSelectAllChapters: () => void;
  handleSelectRemainingChapters: () => void;
  handleOpenSearchChapterDrawer: () => void;
  handleOpenDownloadChaptersDrawer: () => void;
  handleOpenMoreChapterDrawer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [downloadedOnly] = useConfig<boolean>('downloadedOnly', false);
  const [incognitoMode] = useConfig<boolean>('incognitoMode', false);
  const removeInsetPadding = downloadedOnly || incognitoMode;

  // Animate from fully transparent to layout background when scrolled
  const bgProgress = useDerivedValue(() =>
    withTiming(selectedChapters || scrollY.value > 0 ? 1 : 0, { duration: 300 })
  );
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      ['transparent', colors.layout_background]
    ),
  }));

  // Fade and slide the title to the right when scrolled
  const textOpacity = useDerivedValue(() =>
    withTiming(scrollY.value > 0 ? 1 : 0, { duration: 300 })
  );
  const textTranslateY = useDerivedValue(() =>
    withTiming(scrollY.value > 0 ? 0 : -10, {
      duration: 300,
    })
  );
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: textTranslateY.value }],
  }));

  return (
    <View className="absolute top-0 z-10 w-full">
      <Animated.View
        style={[{ paddingTop: removeInsetPadding ? 16 : insets.top + 16 }, backgroundStyle]}
        className="flex flex-row items-center justify-between gap-x-6 p-4 px-4">
        {selectedChapters > 0 ? (
          <>
            <View className="flex flex-shrink flex-row items-center gap-x-2">
              <TouchableOpacity onPress={handleClearSelectedChapters} className="p-2">
                <X color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
              <Text className="-mt-0.5 flex-shrink text-xl text-muted_foreground" numberOfLines={1}>
                {selectedChapters}
              </Text>
            </View>
            <View className="flex flex-row items-center gap-x-2">
              <TouchableOpacity onPress={handleSelectAllChapters} className="p-2">
                <SquaresSubtract color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSelectRemainingChapters} className="p-2">
                <SquaresIntersect color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View className="flex flex-shrink flex-row items-center gap-x-2">
              <TouchableOpacity onPress={() => router.back()} className="p-2">
                <ArrowLeft color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
              <Animated.Text
                style={textStyle}
                className="-mt-0.5 flex-shrink text-xl text-muted_foreground"
                numberOfLines={1}>
                {novelTitle}
              </Animated.Text>
            </View>
            <View className="flex flex-row items-center gap-x-2">
              <TouchableOpacity className="p-2" onPress={handleOpenSearchChapterDrawer}>
                <FileSearch color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
              <TouchableOpacity className="p-2" onPress={handleOpenDownloadChaptersDrawer}>
                <Download color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
              <TouchableOpacity className="p-2" onPress={handleOpenMoreChapterDrawer}>
                <EllipsisVertical color={colors.muted_foreground} size={20} strokeWidth={1.6} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}
