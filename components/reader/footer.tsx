import { TouchableOpacity, View } from 'react-native';
import { Text } from '../defaults';
import { Chapter } from '@/types/novel';
import { Style } from '@/types/reader';

export default function ReaderFooter({
  chapter,
  styles,
  insets,
  handleNextChapter,
}: {
  chapter: Chapter;
  styles: Style;
  insets: { top: number; bottom: number };
  handleNextChapter: ({
    enableTTS,
    startWithTTS,
  }: {
    enableTTS?: boolean;
    startWithTTS?: boolean;
  }) => void;
}) {
  return (
    <View
      className="mt-4 flex flex-col items-center justify-center gap-y-4 px-5"
      style={{ marginBottom: insets.bottom + 12 }}>
      <Text className="text-center opacity-75" style={{ color: styles.body.color }}>
        Finished: Chapter {chapter.number} {chapter.title ? `- ${chapter.title}` : ''}
      </Text>

      {chapter.nextChapter ? (
        <TouchableOpacity
          className="flex w-full items-center justify-center rounded-2xl bg-primary_dark px-6 py-3"
          onPress={() => handleNextChapter({})}>
          <Text className="text-center text-lg">
            Next: Chapter {chapter.nextChapter.number}{' '}
            {chapter.nextChapter.title ? `- ${chapter.nextChapter.title}` : ''}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text
          className="ext-lg text-center italic opacity-75"
          style={{
            color: styles.body.color,
          }}>
          <Text
            className="text-lg font-medium"
            style={{
              color: styles.body.color,
            }}>
            {chapter.novelTitle}
          </Text>{' '}
          has reached its end.
        </Text>
      )}
    </View>
  );
}
