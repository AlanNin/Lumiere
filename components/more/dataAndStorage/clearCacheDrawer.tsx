import { TouchableOpacity, View } from 'react-native';
import { RefObject } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomDrawer from '@/components/bottomDrawer';
import { Text } from '@/components/defaults';

export default function ClearCacheDrawer({
  bottomDrawerRef,
  handleClearCache,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  handleClearCache: () => void;
}) {
  return (
    <BottomDrawer ref={bottomDrawerRef}>
      <View className="flex flex-1 flex-col items-center justify-center gap-y-2 pb-4 text-center">
        <Text className="text-center text-lg font-medium">Clear Cache</Text>
        <Text className="mx-2 mb-4 text-center text-muted_foreground/85">
          This action will clear cached data used to improve performance and user experience.
        </Text>
        <View className="flex w-full flex-1 flex-col items-center gap-y-4 px-16">
          <TouchableOpacity
            className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-primary_foreground"
            onPress={handleClearCache}>
            <Text>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex w-full items-center justify-center rounded-lg px-4 py-1"
            onPress={() => bottomDrawerRef.current?.dismiss()}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomDrawer>
  );
}
