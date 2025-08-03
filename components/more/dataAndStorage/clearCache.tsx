import { Text } from "@/components/defaults";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { TouchableOpacity } from "react-native";
import { getReactQueryCacheSizeInMB, resetCache } from "@/providers/reactQuery";
import ClearCacheDrawer from "./clearCacheDrawer";
import { useQuery } from "@tanstack/react-query";

export default function ClearCache() {
  const bottomClearCacheDrawerRef = useRef<BottomSheetModal>(null);

  const { data: cacheSize = 0, refetch: refetchCacheSize } = useQuery({
    queryKey: ["cache-size"],
    queryFn: () => getReactQueryCacheSizeInMB(),
  });

  async function handleClearCache() {
    await resetCache();
    setTimeout(() => refetchCacheSize(), 500);
    bottomClearCacheDrawerRef.current?.dismiss();
  }

  return (
    <>
      <TouchableOpacity
        className="flex flex-col gap-y-2 px-5 py-2"
        onPress={() => bottomClearCacheDrawerRef.current?.present()}
      >
        <Text className="font-medium">Clear Cache</Text>
        <Text className="text-grayscale_foreground">
          Used: {cacheSize ?? 0} MB
        </Text>
      </TouchableOpacity>

      <ClearCacheDrawer
        bottomDrawerRef={bottomClearCacheDrawerRef}
        handleClearCache={handleClearCache}
      />
    </>
  );
}
