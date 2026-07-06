import { cn } from '@/lib/cn';
import { StyleProp, ToastAndroid, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Text } from '@/components/defaults';
import { Image } from 'expo-image';
import { useState } from 'react';
import { BookMarked } from 'lucide-react-native';
import { colors } from '@/lib/constants';
import { useIsOnline } from '@/providers/network';
import { novelController } from '@/server/controllers/novel';
import { useCachedImage } from '@/hooks/useCachedImage';

export default function NovelCard({
  title,
  imageUri,
  href,
  containerClassName,
  containerStyle,
  showSavedBadge,
  isStored = false,
  unreadChapters,
  downloadedChapters,
}: {
  title: string;
  imageUri: string;
  href?: {
    pathname: string;
    params?: { [key: string]: string | number };
  };
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  showSavedBadge?: boolean;
  isStored?: boolean | undefined;
  unreadChapters?: number;
  downloadedChapters?: number;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const isOnline = useIsOnline();
  const hasUnreadChapters = unreadChapters !== undefined && unreadChapters > 0;
  const hasDownloadedChapters = downloadedChapters !== undefined && downloadedChapters > 0;
  const hasUnreadOrDownloadedChapters = hasUnreadChapters || hasDownloadedChapters;
  const { localUri, status } = useCachedImage(imageUri, isStored);
  const showPlaceholder = imageError || status === 'error';

  async function handlePress() {
    if (!isOnline && !isStored) {
      const isStoredCheck = await novelController.checkIfIsStored({
        novelTitle: title,
      });

      if (!isStoredCheck) {
        ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
        return;
      }
    }

    if (href) {
      router.push({
        pathname: href.pathname,
        params: href.params,
      });
    }
  }
  function getGradientColors() {
    if (showSavedBadge) {
      return ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.6)'];
    }

    return [
      'rgba(0, 0, 0, 0)',
      'rgba(0, 0, 0, 0.2)',
      'rgba(0, 0, 0, 0.4)',
      'rgba(0, 0, 0, 0.7)',
      'rgba(0, 0, 0, 0.9)',
    ];
  }

  return (
    <TouchableOpacity
      className={cn('relative flex-1 overflow-hidden rounded-lg', containerClassName)}
      style={[
        {
          aspectRatio: 1 / 1.5,
        },
        containerStyle,
      ]}
      onPress={handlePress}>
      <Image
        cachePolicy="none"
        alt={`Cover of ${title}`}
        source={
          showPlaceholder
            ? require('@/assets/placeholders/novel.png')
            : { uri: localUri ?? undefined }
        }
        style={{ flex: 1 }}
        contentFit={showPlaceholder ? 'contain' : 'cover'}
        onError={() => setImageError(true)}
      />

      <LinearGradient
        colors={getGradientColors()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {hasUnreadOrDownloadedChapters && (
        <View className="absolute left-3 top-3 flex flex-row overflow-hidden rounded-md">
          {hasDownloadedChapters && (
            <View className="bg-secondary px-1.5 py-1">
              <Text className="text-sm leading-4">{downloadedChapters}</Text>
            </View>
          )}
          {hasUnreadChapters && (
            <View className="bg-primary px-1.5 py-1">
              <Text className="text-sm leading-4">{unreadChapters}</Text>
            </View>
          )}
        </View>
      )}

      {showSavedBadge && (
        <View className="absolute left-3 top-3 rounded-md bg-primary p-1">
          <BookMarked color={colors.primary_foreground} size={14} strokeWidth={1.6} />
        </View>
      )}

      <Text className="absolute bottom-3 left-3 right-3 text-sm tracking-wide text-muted_foreground">
        {title}
      </Text>
    </TouchableOpacity>
  );
}
