import { Text } from '@/components/defaults';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { getReactQueryCacheSizeInMB, resetCache } from '@/providers/reactQuery';
import ClearCacheDrawer from './clearCacheDrawer';
import { useQuery } from '@tanstack/react-query';
import { clearVolatileImageCache, getImageCacheSizeInMB } from '@/lib/image-cache';

export default function ClearCache() {
  const bottomClearCacheDrawerRef = useRef<BottomSheetModal>(null);

  const { data: reactQueryCacheSize = 0, refetch: refetchReactQueryCacheSize } = useQuery({
    queryKey: ['cache-size'],
    queryFn: () => getReactQueryCacheSizeInMB(),
  });

  const { data: imageCacheSize = 0, refetch: refetchImageCacheSize } = useQuery({
    queryKey: ['image-cache-size'],
    queryFn: () => getImageCacheSizeInMB(),
  });

  const totalCacheSize = reactQueryCacheSize + imageCacheSize;

  async function handleClearCache() {
    await resetCache();
    await clearVolatileImageCache();
    setTimeout(() => {
      refetchReactQueryCacheSize();
      refetchImageCacheSize();
    }, 500);
    bottomClearCacheDrawerRef.current?.dismiss();
  }

  return (
    <>
      <TouchableOpacity
        className="flex flex-col gap-y-2 px-5 py-2"
        onPress={() => bottomClearCacheDrawerRef.current?.present()}>
        <Text className="font-medium">Clear Cache</Text>
        <Text className="text-grayscale_foreground">Used: {totalCacheSize.toFixed(2) ?? 0} MB</Text>
      </TouchableOpacity>

      <ClearCacheDrawer
        bottomDrawerRef={bottomClearCacheDrawerRef}
        handleClearCache={handleClearCache}
      />
    </>
  );
}
