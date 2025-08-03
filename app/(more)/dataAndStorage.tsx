import { Text } from "@/components/defaults";
import BackupOptions from "@/components/more/dataAndStorage/backup";
import ClearCache from "@/components/more/dataAndStorage/clearCache";
import ClearDatabase from "@/components/more/dataAndStorage/clearDatabase";
import RemoveDownloadOnRead from "@/components/more/dataAndStorage/removeDownloadOnRead";
import StorageUsageBar from "@/components/more/dataAndStorage/storageUsageBar";
import TabHeader from "@/components/tabHeader";
import { ScrollView, ScrollViewProps, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const AnimatedScrollView = Animated.createAnimatedComponent<ScrollViewProps>(
  ScrollView
);

export default function DataAndStorageScreen() {
  const scrollY = useSharedValue(0);

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View className="flex-1 bg-background">
      <TabHeader title="Data & Storage" renderBackButton scrollY={scrollY} />

      <AnimatedScrollView
        onScroll={scrollYHandler}
        scrollEventThrottle={16}
        className="flex-1"
      >
        <View className="flex-1 flex flex-col gap-y-5">
          <View className="flex flex-col gap-y-5 px-5 py-2">
            <Text className="font-medium">Storage Usage</Text>
            <StorageUsageBar />
          </View>
          <View className="flex flex-col gap-y-4 px-5 py-2">
            <Text className="font-medium">Backup</Text>
            <BackupOptions />
          </View>
          <RemoveDownloadOnRead />
          <ClearCache />
          <ClearDatabase />
        </View>
      </AnimatedScrollView>
    </View>
  );
}
