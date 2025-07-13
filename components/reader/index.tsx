import * as StatusBar from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import {
  defaultSystemFonts,
  MixedStyleDeclaration,
  RenderHTML,
} from "react-native-render-html";
import { colors } from "@/lib/constants";
import { Chapter } from "@/types/novel";
import { useConfig } from "@/providers/appConfig";
import { ReaderStyleConfig } from "@/types/appConfig";
import { Style } from "@/types/reader";
import ReaderLayout from "./layout";
import { useMutation } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { invalidateQueries } from "@/providers/reactQuery";
import ReaderFooter from "./footer";

export default function ReaderComponent({
  chapter,
  insets,
}: {
  chapter: Chapter;
  insets: { top: number; bottom: number };
}) {
  const { width } = useWindowDimensions();
  const [layoutVisible, setLayoutVisible] = useState(false);
  const touchStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const htmlSource = useMemo(() => ({ html: chapter.content ?? "" }), [
    chapter.content,
  ]);
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

  const renderContent = useMemo(
    () => (
      <RenderHTML
        contentWidth={width - 32}
        source={htmlSource}
        tagsStyles={styles as Record<string, MixedStyleDeclaration>}
        enableExperimentalMarginCollapsing
        systemFonts={[...defaultSystemFonts]}
        defaultTextProps={{ selectable: true }}
      />
    ),
    [width, htmlSource, styles]
  );

  const handleTouchStart = (e: GestureResponderEvent) => {
    postponeHide();
    touchStartRef.current = Date.now();
  };

  const handleTouchEndCapture = (e: GestureResponderEvent) => {
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

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    StatusBar.setStatusBarHidden(true);
    return () => {
      NavigationBar.setVisibilityAsync("visible");
      StatusBar.setStatusBarHidden(false);
      if ((chapter.progress ?? 0) < 100) {
        updateNovelChapterProgress();
      }
      updateNovelChapterReadAt();
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
function getReaderStyles({
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
