import OptionButton from "@/components/more/optionButton";
import Separator from "@/components/separator";
import { useConfig } from "@/providers/appConfig";
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
import { ReactNode } from "react";
import { ScrollView, View } from "react-native";

export default function MoreScreen() {
  const router = useRouter();

  const [downloadedOnly, setDownloadedOnly] = useConfig<boolean>(
    "downloadedOnly",
    false
  );
  const [incognitoMode, setIncognitoMode] = useConfig<boolean>(
    "incognitoMode",
    false
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="flex-1">
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
            switchValue={downloadedOnly}
            onPress={() => setDownloadedOnly((prev) => !prev)}
          />
          <OptionButton
            Icon={VenetianMask}
            label="Incognito mode"
            description="Pauses reading history"
            switchValue={incognitoMode}
            onPress={() => setIncognitoMode((prev) => !prev)}
          />
        </OptionsWrapper>
        <Separator />
        <OptionsWrapper>
          <OptionButton
            Icon={ArrowDownToLine}
            label="Download queue"
            onPress={() => router.push("/(more)/downloadQueue")}
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

function OptionsWrapper({ children }: { children: ReactNode }) {
  return (
    <View className="flex flex-col gap-y-8 items-center px-5 py-8">
      {children}
    </View>
  );
}
