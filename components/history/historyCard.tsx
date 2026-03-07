import { ToastAndroid, TouchableOpacity, View } from 'react-native';
import { Text } from '../defaults';
import { ChapterHistory } from '@/types/history';
import { Image } from 'expo-image';
import { ChevronRight, Trash2, WifiOff } from 'lucide-react-native';
import { colors } from '@/lib/constants';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useIsOnline } from '@/providers/network';

export default function HistoryCard({
  chapterHistory,
  openRemoveEntryDrawer,
}: {
  chapterHistory: ChapterHistory;
  openRemoveEntryDrawer: ({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }) => void;
}) {
  const router = useRouter();
  const isOnline = useIsOnline();
  const {
    novelTitle,
    chapterNumber,
    chapterProgress,
    nextChapterNumber,
    isNovelSaved,
    readAt,
    novelCustomImage,
    novelImage,
    downloaded,
    isNovelRead,
  } = chapterHistory;
  const coverUri = novelCustomImage ?? novelImage;
  const date = format(readAt, 'hh:mm a');

  const isRead = chapterProgress === 100;

  const isReading = chapterProgress > 0 && !isRead && !isNovelRead;

  function handlePress() {
    if (!isOnline && !downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    router.push({
      pathname: '/novel/reader',
      params: {
        novelTitle,
        chapterNumber: isRead && nextChapterNumber ? nextChapterNumber : chapterNumber,
        downloaded: downloaded ? 1 : 0,
        isNovelSaved: isNovelSaved ? 1 : 0,
      },
    });
  }

  return (
    <TouchableOpacity className="flex flex-row items-center gap-6" onPress={handlePress}>
      <View className="relative overflow-hidden rounded-md">
        <Image
          cachePolicy="memory-disk"
          alt={`Cover of ${novelTitle}`}
          source={coverUri}
          style={{ aspectRatio: 1 / 1.5, height: 120 }}
          contentFit="cover"
        />

        {!isOnline && !downloaded && (
          <View className="absolute inset-0 flex items-center justify-center bg-black/60">
            <WifiOff color={colors.grayscale_foreground} size={24} strokeWidth={1.3} />
          </View>
        )}
      </View>

      <View className="flex flex-1 flex-col justify-center gap-2">
        {isNovelRead && <Text className="tracking-wide text-muted_foreground/75">Completed</Text>}
        <Text className="text-lg font-medium text-muted_foreground/80" numberOfLines={3}>
          {novelTitle}
        </Text>
        <View className="flex flex-row items-center gap-2 ">
          <Text className="tracking-wide text-muted_foreground/75">Ch. {chapterNumber}</Text>

          {isReading && (
            <View className="flex flex-row items-center gap-2">
              <Text className="tracking-wide text-muted_foreground/75">•</Text>
              <Text className="text-muted_foreground/75">{chapterProgress}%</Text>
            </View>
          )}

          {isRead && nextChapterNumber && !isNovelRead && (
            <View className="flex flex-row items-center gap-2">
              <ChevronRight color={colors.muted_foreground} size={13} strokeWidth={1.4} />
              <Text className=" text-muted_foreground/75">Ch. {nextChapterNumber}</Text>
            </View>
          )}
          <Text className="tracking-wide text-muted_foreground/75">•</Text>
          <Text className="tracking-wide text-muted_foreground/75">{date}</Text>
        </View>
      </View>
      <TouchableOpacity
        className="-mr-2 p-2"
        onPress={() => openRemoveEntryDrawer({ novelTitle, chapterNumber })}>
        <Trash2 color={colors.muted_foreground} size={20} strokeWidth={1.4} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
