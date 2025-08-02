import { Text } from "@/components/defaults";
import Separator from "@/components/separator";
import TabHeader from "@/components/tabHeader";
import { Image } from "expo-image";
import {
  Linking,
  ScrollView,
  ScrollViewProps,
  Touchable,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import * as Application from "expo-application";
import {
  BriefcaseBusiness,
  Coffee,
  Github,
  Linkedin,
} from "lucide-react-native";
import { colors } from "@/lib/constants";

const AnimatedScrollView = Animated.createAnimatedComponent<ScrollViewProps>(
  ScrollView
);

const LAST_UPDATED = "02/08/25 1:27 PM";

export default function AboutScreen() {
  const scrollY = useSharedValue(0);

  const scrollYHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleBuyMeACoffee() {
    if (!process.env.EXPO_PUBLIC_PAYPAL_ME_URL) return;
    Linking.openURL(process.env.EXPO_PUBLIC_PAYPAL_ME_URL);
  }

  function handlePortfolio() {
    if (!process.env.EXPO_PUBLIC_PORTFOLIO_URL) return;
    Linking.openURL(process.env.EXPO_PUBLIC_PORTFOLIO_URL);
  }

  function handleGithub() {
    if (!process.env.EXPO_PUBLIC_GITHUB_URL) return;
    Linking.openURL(process.env.EXPO_PUBLIC_GITHUB_URL);
  }

  function handleLinkedin() {
    if (!process.env.EXPO_PUBLIC_LINKEDIN_URL) return;
    Linking.openURL(process.env.EXPO_PUBLIC_LINKEDIN_URL);
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader title="About" renderBackButton scrollY={scrollY} />

      <AnimatedScrollView
        onScroll={scrollYHandler}
        scrollEventThrottle={16}
        className="flex-1"
      >
        <View className="w-full h-56 flex items-center justify-center">
          <Image
            source={require("@/assets/icon-transparent.png")}
            contentFit="contain"
            style={{ width: 64, height: 64 }}
          />
        </View>
        <Separator />
        <View className="flex flex-col gap-y-6 px-5 py-8">
          <View className="flex flex-col gap-y-1">
            <Text className="font-medium">Version</Text>
            <Text className="text-grayscale_foreground text-sm">
              v{Application.nativeApplicationVersion} ({LAST_UPDATED})
            </Text>
          </View>
          <TouchableOpacity
            className="flex flex-row gap-x-4 items-center"
            onPress={handleBuyMeACoffee}
          >
            <Coffee color={colors.foreground} size={24} strokeWidth={1.4} />
            <View className="flex flex-col gap-y-1 py-2">
              <Text className="font-medium">Buy Me A Coffee</Text>
              <Text className="text-grayscale_foreground text-sm">
                You can support me through PayPal
              </Text>
            </View>
          </TouchableOpacity>
          <View className="mt-6 flex flex-row gap-x-6 items-center justify-center">
            <TouchableOpacity className="p-2" onPress={handlePortfolio}>
              <BriefcaseBusiness
                color={colors.primary}
                size={24}
                strokeWidth={1.4}
              />
            </TouchableOpacity>
            <TouchableOpacity className="p-2" onPress={handleGithub}>
              <Github color={colors.primary} size={24} strokeWidth={1.4} />
            </TouchableOpacity>
            <TouchableOpacity className="p-2" onPress={handleLinkedin}>
              <Linkedin color={colors.primary} size={24} strokeWidth={1.4} />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedScrollView>
    </View>
  );
}
