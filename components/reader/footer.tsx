import { ToastAndroid, TouchableOpacity, View } from 'react-native';
import { Text } from '../defaults';
import { Chapter } from '@/types/novel';
import { Style } from '@/types/reader';
import { useRouter } from 'expo-router';
import { useIsOnline } from '@/providers/network';

export default function ReaderFooter({
  chapter,
  isNovelSaved,
  styles,
  insets,
  handleSetChapterRead,
}: {
  chapter: Chapter;
  isNovelSaved: boolean;
  styles: Style;
  insets: { top: number; bottom: number };
  handleSetChapterRead: () => void;
}) {
  const router = useRouter();
  const isOnline = useIsOnline();

  function handleNextChapter() {
    if (!chapter.nextChapter) return;

    if (!isOnline && !chapter.nextChapter.downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    handleSetChapterRead();

    router.replace({
      pathname: '/novel/reader',
      params: {
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.nextChapter.number,
        downloaded: chapter.nextChapter.downloaded ? 1 : 0,
        isNovelSaved: isNovelSaved ? 1 : 0,
      },
    });
  }

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
          onPress={handleNextChapter}>
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
