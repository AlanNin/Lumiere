import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { novelController } from '@/server/controllers/novel';
import ReaderComponent, { getReaderStyles } from '@/components/reader';
import Loading from '@/components/statics/loading';
import Error from '@/components/statics/error';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

export default function NovelReaderScreen() {
  const router = useRouter();
  const { novelTitle, chapterNumber, downloaded, isNovelSaved: isSaved } = useLocalSearchParams();
  const isDownloaded = downloaded ? downloaded === '1' : false;
  const isNovelSaved = isSaved ? isSaved === '1' : false;

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

  const { styles: readerStyles } = getReaderStyles({ insets: staticInsets });

  const {
    data: novelChapter,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['novel-chapter', novelTitle, chapterNumber],
    queryFn: () =>
      novelController.getNovelChapter({
        novelTitle: String(novelTitle),
        chapterNumber: Number(chapterNumber),
      }),
    meta: {
      persist: false,
    },
  });

  if (!isDownloaded && isFetching) {
    return (
      <Loading
        title="Fate never repeats itself indefinitely. It always brings us some surprises."
        backgroundStyle={{ backgroundColor: readerStyles.body.backgroundColor }}
        textStyle={{ color: readerStyles.body.color, opacity: 0.8 }}
        loaderColor={readerStyles.body.color}
      />
    );
  }

  if (isError || !novelChapter || !novelChapter.content) {
    if (isDownloaded) {
      return (
        <View
          className="flex-1"
          style={{
            backgroundColor: readerStyles.body.backgroundColor,
          }}
        />
      );
    }

    return (
      <Error
        title="Here lies an unwritten chapter..."
        pressable={{
          onPress: () => router.back(),
          title: 'Go back to ' + novelTitle,
        }}
        backgroundStyle={{ backgroundColor: readerStyles.body.backgroundColor }}
        textStyle={{ color: readerStyles.body.color, opacity: 0.8 }}
        iconColor={readerStyles.body.color}
      />
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: readerStyles.body.backgroundColor,
      }}>
      <ReaderComponent chapter={novelChapter} insets={staticInsets} isNovelSaved={isNovelSaved} />
    </View>
  );
}
