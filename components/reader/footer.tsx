import { TouchableOpacity, View } from "react-native";
import { Text } from "../defaults";
import { Chapter } from "@/types/novel";
import { Style } from "@/types/reader";
import { useRouter } from "expo-router";

export default function ReaderFooter({
  chapter,
  styles,
}: {
  chapter: Chapter;
  styles: Style;
}) {
  const router = useRouter();

  function handleNextChapter() {
    if (!chapter.nextChapter) return;
    router.replace({
      pathname: "/novel/reader",
      params: {
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.nextChapter.number,
      },
    });
  }

  return (
    <View className="px-5 gap-y-4 flex flex-col items-center justify-center -mt-1">
      <Text
        className="text-center opacity-75 italic"
        style={{ color: styles.body.color, fontSize: styles.p.fontSize }}
      >
        Finished: Chapter {chapter.number}{" "}
        {chapter.title ? `- ${chapter.title}` : ""}
      </Text>

      {chapter.nextChapter ? (
        <TouchableOpacity
          className="bg-primary_dark p-3 w-full rounded-xl flex items-center justify-center"
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
