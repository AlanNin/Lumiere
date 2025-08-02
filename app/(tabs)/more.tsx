import OptionButton from "@/components/more/optionButton";
import Separator from "@/components/separator";
import { useChapterDownloadQueue } from "@/providers/chapterDownloadQueue";
import { useSafeAreaPaddings } from "@/hooks/useSafeAreaPaddings";

import { useConfig } from "@/providers/appConfig";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ArrowDownToLine,
  CalendarSync,
  CloudOff,
  Database,
  Info,
  Tags,
  VenetianMask,
} from "lucide-react-native";
import { ReactNode } from "react";
import { ScrollView, View } from "react-native";

export default function MoreScreen() {
  const router = useRouter();
  const { getPaddingTop } = useSafeAreaPaddings();
  const paddingTop = getPaddingTop();

  const [downloadedOnly, setDownloadedOnly] = useConfig<boolean>(
    "downloadedOnly",
    false
  );
  const [incognitoMode, setIncognitoMode] = useConfig<boolean>(
    "incognitoMode",
    false
  );

  const {
    queueDownload,
    areDownloadsPaused,
    isWaitingForConnection,
  } = useChapterDownloadQueue();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="flex-1" style={{ paddingTop: paddingTop }}>
        <View className="w-full h-52 flex items-center justify-center">
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
            label="Downloaded Only"
            description="Filters all entries in your library"
            switchValue={downloadedOnly}
            onPress={() => setDownloadedOnly((prev) => !prev)}
          />
          <OptionButton
            Icon={VenetianMask}
            label="Incognito Mode"
            description="Pauses reading history"
            switchValue={incognitoMode}
            onPress={() => setIncognitoMode((prev) => !prev)}
          />
        </OptionsWrapper>
        <Separator />
        <OptionsWrapper>
          <OptionButton
            Icon={ArrowDownToLine}
            label="Download Queue"
            description={
              queueDownload.length > 0
                ? `${
                    areDownloadsPaused
                      ? isWaitingForConnection
                        ? "Waiting for connection"
                        : "Paused"
                      : "Donwloading"
                  } • ${queueDownload.length} remaining`
                : undefined
            }
            onPress={() => router.push("/(more)/downloadQueue")}
          />
          <OptionButton
            Icon={Tags}
            label="Categories"
            onPress={() => router.push("/(more)/categories")}
          />
          <OptionButton
            Icon={Database}
            label="Data & Storage"
            onPress={() => router.push("/(more)/dataAndStorage")}
          />
          <OptionButton
            Icon={CalendarSync}
            label="Automatic Updates & Downloads"
            onPress={() => {}}
            disabled={true}
          />
        </OptionsWrapper>
        <Separator />
        <OptionsWrapper>
          <OptionButton
            Icon={Info}
            label="About"
            onPress={() => router.push("/(more)/about")}
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
