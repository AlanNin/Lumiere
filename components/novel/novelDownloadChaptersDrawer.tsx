import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { colors } from "@/lib/constants";
import { useChapterDownloadQueue } from "@/hooks/useChapterDownloadQueue";
import { Chapter } from "@/types/novel";
import { DownloadChapter } from "@/types/download";
import { novelController } from "@/server/controllers/novel";
import { useMutation } from "@tanstack/react-query";

const DEFAULT_DOWNLOAD_MODE_OPTIONS: {
  label: string;
  value: string;
}[] = [
  { label: "Next Chapter", value: "next" },
  { label: "Next 5 Chapter", value: "next-5" },
  { label: "Next 10 Chapter", value: "next-10" },
  { label: "Unread", value: "unread" },
  { label: "All", value: "all" },
  { label: "Custom", value: "custom" },
  { label: "Delete Downloads", value: "delete-downloads" },
];

export default function NovelDownloadChaptersDrawer({
  bottomDrawerRef,
  novelTitle,
  chapters,
  currentChapter,
  maxChapters,
  allChaptersCompleted,
  hasDownloadedChapters,
  refetchNovelInfo,
}: {
  bottomDrawerRef: React.RefObject<BottomSheetModal | null>;
  novelTitle: string;
  chapters: Chapter[];
  currentChapter: number;
  maxChapters: number;
  allChaptersCompleted: boolean;
  hasDownloadedChapters: boolean;
  refetchNovelInfo: () => void;
}) {
  const getNextUndownloadedChapter = () => {
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

    const nextUndownloaded = sortedChapters.find(
      (chapter) => chapter.number >= currentChapter && !chapter.downloaded
    );

    return nextUndownloaded?.number || currentChapter;
  };

  const getLastDownloadedChapter = () => {
    const downloadedChapters = chapters
      .filter((chapter) => chapter.downloaded)
      .sort((a, b) => b.number - a.number);

    return downloadedChapters[0]?.number || 0;
  };

  const DOWNLOAD_MODE_OPTIONS = DEFAULT_DOWNLOAD_MODE_OPTIONS.filter((opt) => {
    if (allChaptersCompleted) {
      if (opt.value === "unread" || opt.value.startsWith("next")) {
        return false;
      }
    }

    if (!hasDownloadedChapters && opt.value === "delete-downloads") {
      return false;
    }

    const allDownloaded = chapters.every((chapter) => chapter.downloaded);
    if (allDownloaded && opt.value !== "delete-downloads") {
      return false;
    }

    if (opt.value.startsWith("next")) {
      const parts = opt.value.split("-");
      const count = parts.length === 1 ? 1 : parseInt(parts[1], 10);

      const nextUndownloadedChapter = getNextUndownloadedChapter();

      const availableUndownloadedChapters = chapters.filter(
        (chapter) =>
          chapter.number >= nextUndownloadedChapter && !chapter.downloaded
      ).length;

      return availableUndownloadedChapters >= count;
    }

    if (opt.value === "unread") {
      return chapters.some((chapter) => !chapter.downloaded);
    }

    if (opt.value === "all") {
      return chapters.some((chapter) => !chapter.downloaded);
    }

    return true;
  });

  const { enqueueDownload } = useChapterDownloadQueue();
  const { mutate: removeAllDownloadedChaptersFromNovels } = useMutation({
    mutationFn: () =>
      novelController.removeAllDownloadedChaptersFromNovels({
        novelTitles: [novelTitle],
      }),
    onSuccess: () => {
      refetchNovelInfo();
    },
  });

  const [selectedDownloadMode, setSelectedDownloadMode] = useState<string>(
    DOWNLOAD_MODE_OPTIONS[0]?.value || "delete-downloads"
  );
  const [customFrom, setCustomFrom] = useState<number | null>(null);
  const [customTo, setCustomTo] = useState<number | null>(null);

  function handleCustomFromChange(value: string) {
    value = value.replace(/[.,]/g, "").replace(/^0+/, "");

    const num = Number(value);
    if (isNaN(num)) {
      setCustomFrom(null);
      return;
    }

    setCustomFrom(num);

    if (customTo === null || customTo < num) {
      if (num === 0) {
        return;
      }

      if (num < maxChapters) {
        setCustomTo(num + 1);
      } else {
        setCustomTo(num);
      }
    }
  }

  function handleCustomToChange(value: string) {
    value = value.replace(/[.,]/g, "").replace(/^0+/, "");

    const num = Number(value);
    if (isNaN(num)) {
      setCustomTo(null);
      return;
    }

    if (num < 1) {
      setCustomTo(null);
    } else if (num > maxChapters) {
      setCustomTo(maxChapters);
    } else {
      setCustomTo(num);
    }

    if (customFrom === null || customFrom > num) {
      if (num === 0) {
        return;
      }

      if (num > 1) {
        setCustomFrom(num - 1);
      } else {
        setCustomFrom(num);
      }
    }
  }

  const isDeleteDownloads = selectedDownloadMode === "delete-downloads";
  const isCustom = selectedDownloadMode === "custom";

  function handleReset() {
    setSelectedDownloadMode(
      DOWNLOAD_MODE_OPTIONS[0]?.value || "delete-downloads"
    );
    setCustomFrom(null);
    setCustomTo(null);
  }

  function handleConfirm() {
    let toQueue: Chapter[] = [];

    if (isDeleteDownloads) {
      removeAllDownloadedChaptersFromNovels();
    } else {
      const nextUndownloadedChapter = getNextUndownloadedChapter();
      const lastDownloadedChapter = getLastDownloadedChapter();

      switch (selectedDownloadMode) {
        case "next":
          if (chapters.find((c) => c.number === currentChapter)?.downloaded) {
            toQueue = chapters.filter(
              (c) => c.number === lastDownloadedChapter + 1
            );
          } else {
            toQueue = chapters.filter(
              (c) => c.number === nextUndownloadedChapter
            );
          }
          break;

        case "next-5":
        case "next-10":
          const count = Number(selectedDownloadMode.split("-")[1]);
          const startFrom = chapters.find((c) => c.number === currentChapter)
            ?.downloaded
            ? lastDownloadedChapter + 1
            : nextUndownloadedChapter;

          toQueue = chapters
            .filter(
              (c) => c.number >= startFrom && c.number < startFrom + count
            )
            .filter((c) => !c.downloaded);
          break;

        case "unread":
          toQueue = chapters.filter((c) => !c.downloaded);
          break;

        case "all":
          toQueue = chapters.filter((c) => !c.downloaded);
          break;

        case "custom":
          if (customFrom != null && customTo != null) {
            toQueue = chapters.filter(
              (c) =>
                c.number >= customFrom && c.number <= customTo && !c.downloaded
            );
          }
          break;
      }
    }

    if (toQueue.length > 0) {
      const downloadChapters: DownloadChapter[] = toQueue.map((c) => ({
        chapterNumber: c.number,
        chapterTitle: c.title,
        novelTitle: c.novelTitle,
      }));

      enqueueDownload(downloadChapters);
      handleReset();
    }

    bottomDrawerRef.current?.dismiss();
  }

  function handleClose() {
    handleReset();
    bottomDrawerRef.current?.dismiss();
  }

  return (
    <BottomDrawer ref={bottomDrawerRef} onClose={handleReset}>
      <View className="flex flex-col gap-y-2 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">
          {!isDeleteDownloads
            ? "Download Chapters"
            : "Delete Download Chapters"}
        </Text>
        <Text className="text-muted_foreground/85 text-center mx-2 mb-4">
          {!isDeleteDownloads
            ? "Select how you'd like to save them for offline reading."
            : "You won't be able to read these chapters without internet connection."}
        </Text>
        <View className="flex flex-col items-center gap-y-6 w-full flex-1">
          <Picker
            selectedValue={selectedDownloadMode}
            onValueChange={(value) => {
              if (customFrom) {
                setCustomFrom(null);
              }
              if (customTo) {
                setCustomTo(null);
              }
              setSelectedDownloadMode(value);
            }}
            style={{
              width: 200,
              backgroundColor: colors.muted_foreground + "15",
            }}
            enabled={DOWNLOAD_MODE_OPTIONS.length > 1}
          >
            {DOWNLOAD_MODE_OPTIONS.map((opt) => (
              <Picker.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
                style={{
                  color: colors.foreground,
                }}
              />
            ))}
          </Picker>
          {isCustom && (
            <View className="flex flex-row items-center gap-x-4">
              <BottomSheetTextInput
                value={customFrom ? String(customFrom) : ""}
                onChangeText={(value) => handleCustomFromChange(value)}
                placeholderTextColor={colors.muted_foreground + "90"}
                placeholder="From (1)"
                className="text-foreground border border-muted_foreground/75 bg-muted_foreground/15 py-4 w-28 text-center rounded-lg"
                maxLength={String(maxChapters).length}
                keyboardType="numeric"
              />
              <Text className="text-muted_foreground/75 text-center">-</Text>
              <BottomSheetTextInput
                value={customTo ? String(customTo) : ""}
                onChangeText={(value) => handleCustomToChange(value)}
                placeholderTextColor={colors.muted_foreground + "90"}
                placeholder={`To (${maxChapters})`}
                className="text-foreground border border-muted_foreground/75 bg-muted_foreground/15 py-4 w-28 text-center rounded-lg"
                maxLength={String(maxChapters).length}
                keyboardType="numeric"
              />
            </View>
          )}

          <View className="flex flex-col items-center gap-y-4 flex-1 w-full px-16">
            <TouchableOpacity
              className={cn(
                "bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
              )}
              onPress={handleConfirm}
            >
              <Text>
                {!isDeleteDownloads ? "Download" : "I Understand, Delete"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
              onPress={handleClose}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomDrawer>
  );
}
