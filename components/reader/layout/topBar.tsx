import { Text } from "@/components/defaults";
import { colors } from "@/lib/constants";
import { novelController } from "@/server/controllers/novel";
import { Chapter } from "@/types/novel";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Volume1 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

export default function ReaderTopBar({
  layoutVisible,
  postponeHide,
  chapter,
  insets,
}: {
  layoutVisible: boolean;
  postponeHide: () => void;
  chapter: Chapter;
  insets: { top: number; bottom: number };
}) {
  const router = useRouter();

  function handleBack() {
    router.back();
  }

  const topBarAnimValue = useDerivedValue(
    () => withTiming(layoutVisible ? 1 : 0, { duration: 200 }),
    [layoutVisible]
  );

  const animatedTopBarStyle = useAnimatedStyle(() => ({
    opacity: topBarAnimValue.value,
  }));

  // book mark logic
  const [bookMarked, setBookMarked] = useState(chapter.bookMarked);

  useEffect(() => {
    setBookMarked(chapter.bookMarked);
  }, [chapter.bookMarked]);

  const { mutate: toggleBookMarked } = useMutation({
    mutationFn: () =>
      novelController.toggleBookmarkChapter({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
      }),
    onSuccess: () => {
      setBookMarked(!bookMarked);
    },
  });

  function handleToggleBookMarked() {
    postponeHide();
    toggleBookMarked();
  }

  return (
    <Animated.View
      style={animatedTopBarStyle}
      className="absolute top-0 inset-x-0 bg-layout_background"
      pointerEvents={layoutVisible ? "auto" : "none"}
    >
      <Pressable
        onPress={postponeHide}
        className="flex flex-row items-center gap-x-6"
        style={{
          padding: 20,
          paddingTop: insets.top + 20,
        }}
      >
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft color={colors.foreground} size={24} strokeWidth={1.6} />
        </TouchableOpacity>

        <View className="flex flex-row items-center gap-x-10 flex-1">
          <View className="flex flex-col gap-y-1 flex-1">
            <Text
              className="tracking-wide text-muted_foreground"
              numberOfLines={1}
            >
              {chapter.novelTitle}
            </Text>
            <Text className="text-xl tracking-wide" numberOfLines={1}>
              Chapter {chapter.number}{" "}
              {chapter.title ? `- ${chapter.title}` : ""}
            </Text>
          </View>
          <View className="flex flex-row items-center gap-x-5">
            <TouchableOpacity>
              <Volume1 color={colors.foreground} size={24} strokeWidth={1.6} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleBookMarked}>
              <Bookmark
                color={bookMarked ? colors.secondary : colors.foreground}
                fill={bookMarked ? colors.secondary : "transparent"}
                size={24}
                strokeWidth={1.6}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
