import * as StatusBar from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useCallback, useEffect, useState, useRef, useMemo, use } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  TextStyle,
  View,
} from "react-native";
import { colors } from "@/lib/constants";
import { Chapter } from "@/types/novel";
import { useConfig } from "@/providers/appConfig";
import { ReaderGeneralConfig, ReaderStyleConfig } from "@/types/appConfig";
import { Style, VoiceIdentifier } from "@/types/reader";
import ReaderLayout from "./layout";
import { useMutation } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { invalidateQueries } from "@/providers/reactQuery";
import ReaderFooter from "./footer";
import * as Speech from "expo-speech";
import { Text } from "../defaults";
import { extractContentFromHTML } from "@/lib/html";

export default function ReaderComponent({
  chapter,
  insets,
}: {
  chapter: Chapter;
  insets: { top: number; bottom: number };
}) {
  const [layoutVisible, setLayoutVisible] = useState(false);
  const touchStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const paragraphPositions = useRef<{
    [key: number]: { y: number; height: number };
  }>({});
  const { styles, setReaderStylesConfig } = getReaderStyles({ insets });
  const [holdHide, setHoldHide] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);
  const isAtTop = scrollY <= 0;
  const isAtBottom = scrollY + viewHeight >= contentHeight - 1;
  const percent = (() => {
    const delta = contentHeight - viewHeight;
    if (delta <= 0) return 0;
    const p = (scrollY / delta) * 100;
    return Number.isNaN(p) ? 0 : Math.round(p);
  })();
  const hasInititalSeekedRef = useRef(false);
  const [incognitoMode] = useConfig<boolean>("incognitoMode", false);
  const [ttsIndex, setTtsIndex] = useState<number | null>(null);
  const [isTTSReading, setIsTTSReading] = useState(false);
  const lastIndexRef = useRef<number>(0);
  const stopRequestedRef = useRef<boolean>(false);
  const parragraphLongPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const content = useMemo(() => extractContentFromHTML(chapter.content ?? ""), [
    chapter.content,
  ]);
  const title = content.title;
  const paragraphs = content.paragraphs;
  const [availableVoices, setAvailableVoices] = useState<VoiceIdentifier[]>([]);
  const [readerGeneralConfig, setReaderGeneralConfig] = useConfig<
    ReaderGeneralConfig
  >("readerGeneralConfig", {
    showProgressSeekBar: false,
    speechSpeed: 0.7,
    voiceIdentifier: availableVoices[0]?.identifier,
  });
  const speechSpeedRef = useRef(readerGeneralConfig.speechSpeed);
  const speechVoiceRef = useRef(readerGeneralConfig.voiceIdentifier);

  const { mutate: updateNovelChapterProgress } = useMutation({
    mutationFn: () =>
      novelController.updateNovelChapterProgress({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
        chapterProgress: percent,
      }),
    onSuccess: () => {
      invalidateQueries(
        ["novel-info", chapter.novelTitle],
        ["novel-chapter", chapter.novelTitle, chapter.number]
      );
    },
  });

  const { mutate: updateNovelChapterReadAt } = useMutation({
    mutationFn: () =>
      novelController.updateNovelChapterReadAt({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
      }),
    onSuccess: () => {
      invalidateQueries("history");
    },
  });

  const scrollToParagraph = useCallback(
    (paragraphIndex: number) => {
      const paragraphPosition = paragraphPositions.current[paragraphIndex];
      if (paragraphPosition && scrollViewRef.current) {
        const targetPosition =
          paragraphPosition.y - viewHeight * 0.5 + paragraphPosition.height / 2;
        const maxScrollY = Math.max(0, contentHeight - viewHeight);
        const scrollToY = Math.max(0, Math.min(targetPosition, maxScrollY));

        scrollViewRef.current.scrollTo({
          y: scrollToY,
          animated: true,
        });
      }
    },
    [viewHeight, contentHeight]
  );

  const renderContent = useMemo(
    () => (
      <View
        style={{
          paddingTop: styles.body.paddingTop,
        }}
      >
        <Text
          selectable
          style={{
            paddingHorizontal: styles.body.paddingHorizontal,
            fontSize: styles.h4.fontSize,
            lineHeight: styles.body.lineHeight,
            color: styles.body.color,
            marginBottom: styles.h4.marginBottom + 6,
            fontWeight: String(styles.h4.fontWeight) as TextStyle["fontWeight"],
          }}
        >
          {title}
        </Text>
        {paragraphs.map((text: string, idx: number) => {
          const shouldHighlight = ttsIndex === idx && isTTSReading;

          return (
            <View
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                paragraphPositions.current[idx] = { y, height };
              }}
              style={{
                paddingHorizontal: styles.body.paddingHorizontal,
                paddingVertical: 6,
                marginTop: -6,
                marginBottom: styles.p.marginBottom - 6,
                backgroundColor:
                  shouldHighlight && ttsIndex === idx
                    ? colors.primary_dark + 35
                    : "transparent",
              }}
              key={idx}
              onTouchStart={() => {
                if (!isTTSReading) return;

                parragraphLongPressTimeoutRef.current = setTimeout(() => {
                  Speech.stop();
                  setTimeout(() => {
                    setIsTTSReading(true);
                    readNextParagraph(idx);
                  }, 100);
                }, 500);
              }}
              onTouchEnd={() => {
                if (parragraphLongPressTimeoutRef.current) {
                  clearTimeout(parragraphLongPressTimeoutRef.current);
                  parragraphLongPressTimeoutRef.current = null;
                }
              }}
              onTouchCancel={() => {
                if (parragraphLongPressTimeoutRef.current) {
                  clearTimeout(parragraphLongPressTimeoutRef.current);
                  parragraphLongPressTimeoutRef.current = null;
                }
              }}
            >
              <Text
                selectable={!isTTSReading}
                style={{
                  fontSize: styles.p.fontSize,
                  lineHeight: styles.body.lineHeight,
                  color: styles.body.color,
                }}
              >
                {text}
              </Text>
            </View>
          );
        })}
      </View>
    ),
    [styles, paragraphs, ttsIndex, isTTSReading]
  );

  const handleTouchStart = () => {
    postponeHide();
    touchStartRef.current = Date.now();
  };

  const handleTouchEndCapture = () => {
    const delta = Date.now() - touchStartRef.current;
    if (delta <= 300) {
      toggleBars();
    }
  };

  const postponeHide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      setLayoutVisible(false);
      timeoutRef.current = null;
    }, 3000);
  }, [holdHide]);

  function toggleHoldHide(isOpen: boolean) {
    if (!isOpen) {
      setLayoutVisible(true);
      postponeHide();
    }

    setHoldHide(!holdHide);
  }

  const toggleBars = useCallback(async () => {
    const next = !layoutVisible;
    setLayoutVisible(next);
    postponeHide();
  }, [layoutVisible, postponeHide]);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  const onContentSizeChange = useCallback((_: number, h: number) => {
    setContentHeight(h);
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setViewHeight(e.nativeEvent.layout.height);
  }, []);

  const seekTo = useCallback(
    (percent: number, smoothScroll = false) => {
      const p = Math.max(0, Math.min(100, percent)) / 100;
      const maxOffset = Math.max(0, contentHeight - viewHeight);
      const targetY = maxOffset * p;
      if (Math.abs(targetY - scrollY) < 1) return;
      scrollViewRef.current?.scrollTo({ y: targetY, animated: smoothScroll });
    },
    [contentHeight, viewHeight, scrollY]
  );

  const readNextParagraph = useCallback(
    (index: number) => {
      if (index >= paragraphs.length) {
        setIsTTSReading(false);
        setTtsIndex(null);
        return;
      }

      setTtsIndex(index);
      lastIndexRef.current = index;

      setTimeout(() => {
        scrollToParagraph(index);
      }, 100);

      Speech.speak(paragraphs[index], {
        language: "en-US",
        rate: speechSpeedRef.current,
        voice: speechVoiceRef.current,
        onDone: () => {
          readNextParagraph(index + 1);
        },
        onStopped: () => {
          if (!stopRequestedRef.current) {
            setIsTTSReading(false);
          }
        },
        onError: () => {
          setIsTTSReading(false);
        },
      });
    },
    [paragraphs, scrollToParagraph, readerGeneralConfig.speechSpeed]
  );

  const handleTTS = () => {
    if (isTTSReading) {
      stopRequestedRef.current = true;
      Speech.stop();
      setIsTTSReading(false);
      return;
    }

    stopRequestedRef.current = false;
    setIsTTSReading(true);
    readNextParagraph(ttsIndex ?? lastIndexRef.current ?? 0);
  };

  useEffect(() => {
    speechSpeedRef.current = readerGeneralConfig.speechSpeed;
    speechVoiceRef.current = readerGeneralConfig.voiceIdentifier;
  }, [readerGeneralConfig.speechSpeed, readerGeneralConfig.voiceIdentifier]);

  useEffect(() => {
    return () => {
      Speech.stop();
      stopRequestedRef.current = true;
      setIsTTSReading(false);
    };
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    StatusBar.setStatusBarHidden(true);
    return () => {
      NavigationBar.setVisibilityAsync("visible");
      StatusBar.setStatusBarHidden(false);
      if (!incognitoMode) {
        if ((chapter.progress ?? 0) < 100) {
          updateNovelChapterProgress();
        }
        updateNovelChapterReadAt();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    async function setBars() {
      if (holdHide) {
        return;
      }

      if (layoutVisible) {
        await NavigationBar.setVisibilityAsync("visible");
        await StatusBar.setStatusBarHidden(false);
      } else {
        await NavigationBar.setVisibilityAsync("hidden");
        await StatusBar.setStatusBarHidden(true);
      }
    }

    setBars();
  }, [layoutVisible]);

  useEffect(() => {
    if (
      !hasInititalSeekedRef.current &&
      !!chapter.progress &&
      chapter.progress > 0 &&
      chapter.progress < 100 &&
      contentHeight > viewHeight
    ) {
      seekTo(chapter.progress, true);
      hasInititalSeekedRef.current = true;
    }
  }, [chapter.progress, contentHeight, viewHeight, seekTo]);

  useEffect(() => {
    if (
      !ttsIndex &&
      paragraphPositions.current &&
      Object.keys(paragraphPositions.current).length > 0 &&
      contentHeight > 0 &&
      viewHeight > 0 &&
      chapter.progress !== undefined
    ) {
      const scrollYTarget =
        (chapter.progress / 100) * (contentHeight - viewHeight);

      let closestIndex = 0;
      let closestDistance = Infinity;

      Object.entries(paragraphPositions.current).forEach(([indexStr, pos]) => {
        const index = parseInt(indexStr, 10);
        const centerY = pos.y + pos.height / 2;
        const distance = Math.abs(centerY - scrollYTarget);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setTtsIndex(closestIndex);
      lastIndexRef.current = closestIndex;
    }
  }, [chapter.progress, contentHeight, viewHeight, paragraphPositions.current]);

  useEffect(() => {
    async function getVoices() {
      const voices = await Speech.getAvailableVoicesAsync();
      const englishVoices = voices.filter((v) => v.language === "en-US");
      setAvailableVoices(englishVoices);
    }
    getVoices();
  }, []);

  return (
    <ReaderLayout
      layoutVisible={layoutVisible || holdHide}
      postponeHide={postponeHide}
      chapter={chapter}
      scrollToTop={scrollToTop}
      scrollToBottom={scrollToBottom}
      insets={insets}
      styles={styles}
      setReaderStylesConfig={setReaderStylesConfig}
      toggleHoldHide={toggleHoldHide}
      percent={percent}
      isAtTop={isAtTop}
      isAtBottom={isAtBottom}
      seekTo={seekTo}
      handleTTS={handleTTS}
      isTTSReading={isTTSReading}
      readerGeneralConfig={readerGeneralConfig}
      setReaderGeneralConfig={setReaderGeneralConfig}
      availableVoices={availableVoices}
    >
      <ScrollView
        ref={scrollViewRef}
        style={{
          flex: 1,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        onScrollBeginDrag={postponeHide}
        onScrollEndDrag={postponeHide}
        contentContainerStyle={{
          paddingBottom: insets.bottom,
          paddingTop: insets.top,
        }}
        onTouchStart={handleTouchStart}
        onTouchEndCapture={handleTouchEndCapture}
      >
        {renderContent}
        <ReaderFooter chapter={chapter} styles={styles} insets={insets} />
      </ScrollView>
    </ReaderLayout>
  );
}

// handles reader styles, including default styles and user-defined styles (these are stored in the app config)
export function getReaderStyles({
  insets,
}: {
  insets: { top: number; bottom: number };
}): {
  styles: Style;
  setReaderStylesConfig: (styles: ReaderStyleConfig) => void;
} {
  const defaultReaderStyle: ReaderStyleConfig = {
    body: {
      backgroundColor: colors.background,
      color: colors.grayscale_foreground,
      textAlign: "left",
      lineHeight: 24,
    },
    h4: {
      fontSize: 20,
    },
    p: { fontSize: 16 },
  };

  const [readerStyleConfig, setReaderStylesConfig] = useConfig<
    ReaderStyleConfig
  >("readerStyleConfig", defaultReaderStyle);

  const styles: Style = useMemo(() => {
    return {
      body: {
        ...defaultReaderStyle.body,
        ...readerStyleConfig.body,
        paddingHorizontal: 20,
        paddingTop: insets.top,
      },
      h4: {
        ...defaultReaderStyle.h4,
        ...readerStyleConfig.h4,
        fontWeight: 700,
        marginBottom: 16,
      },
      p: {
        ...defaultReaderStyle.p,
        ...readerStyleConfig.p,
        marginBottom: 16,
      },
    };
  }, [readerStyleConfig, insets.top, insets.bottom]);

  return { styles, setReaderStylesConfig };
}
