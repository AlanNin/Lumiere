import { Globe, Heart } from "lucide-react-native";
import { Linking, TouchableOpacity, View } from "react-native";
import { colors } from "@/lib/constants";
import { Text } from "@/components/defaults";

export default function NovelTopButtons({ novelUrl }: { novelUrl: string }) {
  function openInBrowser() {
    Linking.openURL(novelUrl);
  }

  return (
    <View className="flex flex-row items-center justify-center gap-x-20 px-4">
      <TouchableOpacity className="flex flex-col items-center gap-y-2.5">
        <Heart color={colors.grayscale} size={20} strokeWidth={1.6} />
        <Text className="text-sm text-grayscale">Add To Library</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex flex-col items-center gap-y-2"
        onPress={openInBrowser}
      >
        <Globe color={colors.grayscale} size={20} strokeWidth={1.6} />
        <Text className="text-sm text-grayscale">Open in Browser</Text>
      </TouchableOpacity>
    </View>
  );
}
