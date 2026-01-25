import { ToastAndroid, TouchableOpacity, View } from 'react-native';
import { Text } from '../defaults';
import { ChapterHistory } from '@/types/history';
import { Image } from 'expo-image';
import { Trash2, WifiOff } from 'lucide-react-native';
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
    isNovelSaved,
    readAt,
    novelCustomImage,
    novelImage,
    downloaded,
  } = chapterHistory;
  const coverUri = novelCustomImage ?? novelImage;
  const date = format(readAt, 'hh:mm a');

  function handlePress() {
    if (!isOnline && !downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    router.push({
      pathname: '/novel/reader',
      params: {
        novelTitle,
        chapterNumber,
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
        <Text className="text-lg font-medium text-muted_foreground/80" numberOfLines={3}>
          {novelTitle}
        </Text>
        <Text className="tracking-wide text-muted_foreground/75">
          Ch. {chapterNumber} - {date}
        </Text>
      </View>
      <TouchableOpacity
        className="mr-1 p-2"
        onPress={() => openRemoveEntryDrawer({ novelTitle, chapterNumber })}>
        <Trash2 color={colors.muted_foreground} size={20} strokeWidth={1.4} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
