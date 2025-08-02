import {
  GestureResponderEvent,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../defaults";
import { Chapter } from "@/types/novel";
import { Style } from "@/types/reader";
import { useRouter } from "expo-router";
import { useIsOnline } from "@/providers/network";

export default function ReaderFooter({
  chapter,
  styles,
  insets,
}: {
  chapter: Chapter;
  styles: Style;
  insets: { top: number; bottom: number };
}) {
  const router = useRouter();
  const isOnline = useIsOnline();

  function handleNextChapter() {
    if (!chapter.nextChapter) return;

    if (!isOnline && !chapter.nextChapter.downloaded) {
      ToastAndroid.show("No internet connection", ToastAndroid.SHORT);
      return;
    }

    router.replace({
      pathname: "/novel/reader",
      params: {
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.nextChapter.number,
        downloaded: chapter.nextChapter.downloaded ? 1 : 0,
      },
    });
  }

  return (
    <View
      className="px-5 gap-y-4 flex flex-col items-center justify-center mt-4"
      style={{ marginBottom: insets.bottom + 12 }}
    >
      <Text
        className="text-center opacity-75"
        style={{ color: styles.body.color, fontSize: styles.p.fontSize - 2 }}
      >
        Finished: Chapter {chapter.number}{" "}
        {chapter.title ? `- ${chapter.title}` : ""}
      </Text>

      {chapter.nextChapter ? (
        <TouchableOpacity
          className="bg-primary_dark py-3 px-6 w-full rounded-xl flex items-center justify-center"
          onPress={handleNextChapter}
        >
          <Text className="text-center" style={{ fontSize: styles.p.fontSize }}>
            Next: Chapter {chapter.nextChapter.number}{" "}
            {chapter.nextChapter.title ? `- ${chapter.nextChapter.title}` : ""}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text
          className="text-center opacity-75 italic"
          style={{
            color: styles.body.color,
            fontSize: styles.p.fontSize,
          }}
        >
          <Text
            className="font-medium"
            style={{
              color: styles.body.color,
              fontSize: styles.p.fontSize,
            }}
          >
            {chapter.novelTitle}
          </Text>{" "}
          has reached its end.
        </Text>
      )}
    </View>
  );
}
