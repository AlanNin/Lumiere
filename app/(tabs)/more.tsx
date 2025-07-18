import OptionButton from "@/components/more/optionButton";
import Separator from "@/components/separator";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ArrowDownToLine,
  CircleQuestionMark,
  CloudOff,
  Database,
  Info,
  Settings,
  Tags,
  VenetianMask,
} from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function OptionsWrapper({ children }: { children: React.ReactNode }) {
    return (
      <View className="flex flex-col gap-y-8 items-center px-5 py-8">
        {children}
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View className="w-full h-56 flex items-center justify-center">
          <Image
            source={require("@/assets/icon-transparent.png")}
            contentFit="contain"
            style={{ width: 64, height: 64 }}
          />
        </View>
        <Separator />
        <OptionsWrapper>
          <OptionButton
            Icon={CloudOff}
            label="Downloaded only"
            description="Filters all entries in your library"
            onPress={() => {}}
            switchValue={false}
          />
          <OptionButton
            Icon={VenetianMask}
            label="Incognito mode"
            description="Pauses reading history"
            onPress={() => {}}
            switchValue={false}
          />
        </OptionsWrapper>
        <Separator />
        <OptionsWrapper>
          <OptionButton
            Icon={ArrowDownToLine}
            label="Download queue"
            onPress={() => {}}
          />
          <OptionButton
            Icon={Tags}
            label="Categories"
            onPress={() => router.push("/(more)/categories")}
          />
          <OptionButton
            Icon={Database}
            label="Data and storage"
            onPress={() => {}}
          />
        </OptionsWrapper>
        <Separator />
        <OptionsWrapper>
          <OptionButton Icon={Settings} label="Settings" onPress={() => {}} />
          <OptionButton Icon={Info} label="About" onPress={() => {}} />
          <OptionButton
            Icon={CircleQuestionMark}
            label="Help"
            onPress={() => {}}
          />
        </OptionsWrapper>
      </View>
    </ScrollView>
  );
}
