import { Text } from "@/components/defaults";
import BackupOptions from "@/components/more/dataAndStorage/backup";
import ClearCache from "@/components/more/dataAndStorage/clearCache";
import ClearDatabase from "@/components/more/dataAndStorage/clearDatabase";
import StorageUsageBar from "@/components/more/dataAndStorage/storageUsageBar";
import TabHeader from "@/components/tabHeader";
import {
  ScrollView,
  ScrollViewProps,
  TouchableOpacity,
  View,
} from "react-native";
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
        <View className="flex flex-col gap-y-5 p-5">
          <Text className="font-medium">Storage Usage</Text>
          <StorageUsageBar />
        </View>
        <View className="flex flex-col gap-y-4 p-4">
          <Text className="font-medium">Backup</Text>
          <BackupOptions />
        </View>
        <TouchableOpacity
          className="flex flex-col gap-y-2 p-4 opacity-50"
          disabled
        >
          <Text className="font-medium">Automatic Backup Frequency</Text>
          <Text className="text-grayscale_foreground">Off</Text>
        </TouchableOpacity>
        <ClearCache />
        <ClearDatabase />
      </AnimatedScrollView>
    </View>
  );
}
