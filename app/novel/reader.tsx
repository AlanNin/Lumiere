import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { novelController } from "@/server/controllers/novel";
import ReaderComponent from "@/components/reader";
import Loading from "@/components/statics/loading";
import Error from "@/components/statics/error";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";

export default function NovelReaderComponentScreen() {
  const router = useRouter();
  const { title, chapterNumber, totalChapters } = useLocalSearchParams();
  const { top, bottom } = useSafeAreaInsets();
  const [staticInsets, setStaticInsets] = useState(() => ({
    top: 0,
    bottom: 0,
  }));
  const topInsetMounted = useRef(false);
  const bottomInsetMounted = useRef(false);

  useEffect(() => {
    if (!topInsetMounted.current && top > 0) {
      setStaticInsets((prev) => ({ ...prev, top }));
      topInsetMounted.current = true;
    }
  }, [top]);

  useEffect(() => {
    if (!bottomInsetMounted.current && bottom > 0) {
      setStaticInsets((prev) => ({ ...prev, bottom }));
      bottomInsetMounted.current = true;
    }
  }, [bottom]);

  const { data: novelChapter, isLoading, isError } = useQuery({
    queryKey: ["novel-chapter", title, chapterNumber],
    queryFn: () =>
      novelController.getNovelChapter({
        title: String(title),
        chapterNumber: Number(chapterNumber),
      }),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <Loading title="All good things come to those who wait..." />;
  }

  if (isError || !novelChapter || !novelChapter.content) {
    return (
      <Error
        title="Here lies an unwritten chapter..."
        pressable={{
          onPress: () => router.back(),
          title: "Go back to " + title,
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ReaderComponent
        chapter={novelChapter}
        totalChapters={Number(totalChapters)}
        insets={staticInsets}
      />
    </View>
  );
}
