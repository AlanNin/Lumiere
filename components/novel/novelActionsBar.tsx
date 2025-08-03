import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BookmarkMinus,
  BookmarkPlus,
  CheckCheck,
  EyeClosed,
  Trash2,
} from "lucide-react-native";
import { colors } from "@/lib/constants";
import { novelController } from "@/server/controllers/novel";
import { DownloadChapter } from "@/types/download";
import { Chapter } from "@/types/novel";
import { useFocusEffect } from "expo-router";
import { useConfig } from "@/providers/appConfig";
import { invalidateQueries } from "@/providers/reactQuery";

const ANIM_DURATION = 150;

type Props = {
  novelTitle: string;
  selectedChapters: Chapter[];
  setSelectedChapters: (chapters: Chapter[]) => void;
  refetchNovelInfo: () => void;
  enqueueDownload: (chapters: DownloadChapter[]) => Promise<void>;
  onOpenDeleteChaptersDrawer: (chapters: DownloadChapter[]) => void;
  isSortAsc: boolean;
};

export default function NovelActionsBar({
  novelTitle,
  selectedChapters,
  setSelectedChapters,
  refetchNovelInfo,
  enqueueDownload,
  onOpenDeleteChaptersDrawer,
  isSortAsc,
}: Props) {
  // ─── Hooks & Refs ─────────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();
  const visible = selectedChapters.length > 0;
  const [removeDownloadOnRead] = useConfig<boolean>(
    "removeDownloadOnRead",
    false
  );

  // Animation values
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Mount state
  const [mounted, setMounted] = useState(visible);

  // Common reset + refetch
  function onSuccess() {
    setSelectedChapters([]);
    refetchNovelInfo();
  }

  // Derive button states
  const shouldMarkAsBookmarked = selectedChapters.some((c) => !c.bookMarked);
  const shouldMarkAsRead = selectedChapters.some((c) => c.progress! < 100);
  const shouldUnMarkAsRead = selectedChapters.some((c) => c.progress! === 100);
  const shouldDownload = selectedChapters.some((c) => !c.downloaded);
  const singularSelectedChapterNumber =
    selectedChapters.length > 0 ? selectedChapters[0].number : null;

  // Mutations (all hooks)
  const { mutate: markBook } = useMutation({
    mutationKey: [
      "bookmark",
      novelTitle,
      selectedChapters.map((c) => c.number),
    ],
    mutationFn: () =>
      novelController.markChaptersAsBookmarked({
        novelTitle,
        chapterNumbers: selectedChapters.map((c) => c.number),
      }),
    onSuccess,
  });

  const { mutate: unmarkBook } = useMutation({
    mutationKey: [
      "unbookmark",
      novelTitle,
      selectedChapters.map((c) => c.number),
    ],
    mutationFn: () =>
      novelController.unMarkChaptersAsBookmarked({
        novelTitle,
        chapterNumbers: selectedChapters.map((c) => c.number),
      }),
    onSuccess,
  });

  const { mutate: markRead } = useMutation({
    mutationKey: [
      "markRead",
      novelTitle,
      selectedChapters.map((c) => c.number),
    ],
    mutationFn: () =>
      novelController.markChaptersAsRead({
        novelTitle,
        chapterNumbers: selectedChapters.map((c) => c.number),
        removeDownloadOnRead,
      }),
    onSuccess: () => {
      onSuccess();
      invalidateQueries("library");
    },
  });

  const { mutate: unmarkRead } = useMutation({
    mutationKey: [
      "unmarkRead",
      novelTitle,
      selectedChapters.map((c) => c.number),
    ],
    mutationFn: () =>
      novelController.unMarkChaptersAsRead({
        novelTitle,
        chapterNumbers: selectedChapters.map((c) => c.number),
      }),
    onSuccess: () => {
      onSuccess();
      invalidateQueries("library");
    },
  });

  const { mutate: queueDownload } = useMutation({
    mutationKey: ["queueDownload", selectedChapters.map((c) => c.number)],
    mutationFn: (chapters: DownloadChapter[]) => {
      enqueueDownload(chapters);
      return Promise.resolve();
    },
    onSuccess,
  });

  const { mutate: removeDownload } = useMutation({
    mutationKey: ["removeDownload", selectedChapters.map((c) => c.number)],
    mutationFn: (chapters: DownloadChapter[]) => {
      onOpenDeleteChaptersDrawer(chapters);
      return Promise.resolve(chapters);
    },
    onSuccess,
  });

  const { mutate: markBeforeRead } = useMutation({
    mutationKey: ["markBeforeRead", novelTitle, singularSelectedChapterNumber],
    mutationFn: () => {
      if (singularSelectedChapterNumber === null) {
        return Promise.resolve(false);
      }
      return novelController.markChaptersBeforeAsRead({
        novelTitle,
        uptoChapter: singularSelectedChapterNumber,
      });
    },
    onSuccess,
  });

  // Effect: Handle back with actions bar showing
  useFocusEffect(
    useCallback(() => {
      const hasSelectedChapters = selectedChapters.length > 0;

      if (!hasSelectedChapters) {
        return;
      }

      const onBackPress = () => {
        if (hasSelectedChapters) {
          setSelectedChapters([]);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => {
        subscription.remove();
      };
    }, [selectedChapters.length])
  );

  // Effect: run our show/hide animation whenever `visible` changes
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, translateY, opacity]);

  // Handlers (non-hooks)
  const handleBookmark = () =>
    shouldMarkAsBookmarked ? markBook() : unmarkBook();
  const handleDownload = () => {
    const chapters: DownloadChapter[] = selectedChapters.map((c) => ({
      novelTitle: c.novelTitle,
      chapterNumber: c.number,
      chapterTitle: c.title,
      readingProgress: c.progress ?? 0,
    }));
    shouldDownload ? queueDownload(chapters) : removeDownload(chapters);
  };

  // ─── Early return after all hooks ─────────────────────────────────────────
  if (!mounted) return null;

  // Animated styles
  const animatedStyle: StyleProp<ViewStyle> = {
    transform: [{ translateY }],
    opacity,
    paddingBottom: insets.bottom + 24,
  };

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute inset-x-0 bottom-0 flex flex-row gap-x-4 items-center justify-between px-8 py-6 bg-layout_background"
    >
      {/* Bookmark button */}
      <TouchableOpacity className="p-2" onPress={handleBookmark}>
        {shouldMarkAsBookmarked ? (
          <BookmarkPlus size={24} color={colors.foreground} strokeWidth={1} />
        ) : (
          <BookmarkMinus size={24} color={colors.foreground} strokeWidth={1} />
        )}
      </TouchableOpacity>

      {/* Read/unread button */}
      {shouldMarkAsRead && (
        <TouchableOpacity className="p-2" onPress={() => markRead()}>
          <CheckCheck size={24} color={colors.foreground} strokeWidth={1} />
        </TouchableOpacity>
      )}

      {shouldUnMarkAsRead && (
        <TouchableOpacity className="p-2" onPress={() => unmarkRead()}>
          <EyeClosed size={24} color={colors.foreground} strokeWidth={1} />
        </TouchableOpacity>
      )}

      {/* Single-chapter extra action */}
      {selectedChapters.length === 1 && (
        <TouchableOpacity
          className="relative p-2"
          onPress={() => markBeforeRead()}
        >
          <CheckCheck size={24} color={colors.foreground} strokeWidth={1} />
          {isSortAsc ? (
            <ArrowUp
              size={12}
              color={colors.foreground}
              strokeWidth={1}
              style={{ position: "absolute", bottom: 2, right: 0 }}
            />
          ) : (
            <ArrowDown
              size={12}
              color={colors.foreground}
              strokeWidth={1}
              style={{ position: "absolute", bottom: 2, right: 0 }}
            />
          )}
        </TouchableOpacity>
      )}

      {/* Download/remove download button */}
      <TouchableOpacity className="relative p-2" onPress={handleDownload}>
        {shouldDownload ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderWidth: 1,
              borderColor: colors.foreground,
            }}
            className="flex items-center justify-center border rounded-full"
          >
            <ArrowDown size={12} color={colors.foreground} strokeWidth={2} />
          </View>
        ) : (
          <Trash2 size={24} color={colors.foreground} strokeWidth={1} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
