import * as StatusBar from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TextStyle,
  ToastAndroid,
  View,
} from 'react-native';
import { colors } from '@/lib/constants';
import { Chapter } from '@/types/novel';
import { useConfig } from '@/providers/appConfig';
import { ReaderGeneralConfig, ReaderStyleConfig } from '@/types/appConfig';
import { Style, VoiceIdentifier } from '@/types/reader';
import ReaderLayout from './layout';
import { useMutation } from '@tanstack/react-query';
import { novelController } from '@/server/controllers/novel';
import { invalidateQueries } from '@/providers/reactQuery';
import ReaderFooter from './footer';
import { Text } from '../defaults';
import { extractContentFromHTML } from '@/lib/html';
import { useDebouncedCallback } from '@/lib/debounce';
import { useRouter } from 'expo-router';
import { useIsOnline } from '@/providers/network';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import TTSSynthesizer, { TTSVoice } from './tts-synthesizer';

// ─── Cache ────────────────────────────────────────────────────────────────────
const synthCache = new Map<string, string>();

function cacheKey(text: string, voice: string | undefined, rate: number): string {
  return `${voice ?? 'default'}|${rate}|${text.length}|${text.slice(0, 60)}`;
}

async function synth(text: string, voice: string | undefined, rate: number): Promise<string> {
  if (!text.trim()) return '';
  const key = cacheKey(text, voice, rate);
  if (synthCache.has(key)) return synthCache.get(key)!;
  const uri = await TTSSynthesizer.synthesize(text, { language: 'en-US', voice, rate });
  synthCache.set(key, uri);
  return uri;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReaderComponent({
  chapter,
  insets,
  isNovelSaved,
  isStartWithTTS,
}: {
  chapter: Chapter;
  insets: { top: number; bottom: number };
  isNovelSaved: boolean;
  isStartWithTTS: boolean;
}) {
  const ttsPlayer = useAudioPlayer(null);
  const ttsStatus = useAudioPlayerStatus(ttsPlayer);

  const isPlayerLoadedRef = useRef(false);
  const isAdvancingRef = useRef(false);
  const announcementCbRef = useRef<(() => void) | null>(null);
  const isTTSHandlingRef = useRef(false);

  const isMountedRef = useRef(true);

  const playerPlay = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      ttsPlayer.play();
    } catch {}
  }, [ttsPlayer]);

  const playerPause = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      ttsPlayer.pause();
    } catch {
      /* released */
    }
  }, [ttsPlayer]);

  const playerReplace = useCallback(
    (uri: string) => {
      if (!isMountedRef.current) return;
      try {
        ttsPlayer.replace({ uri });
      } catch {
        /* released */
      }
    },
    [ttsPlayer]
  );

  // ── Layout / scroll state ──────────────────────────────────────────────────
  const [layoutVisible, setLayoutVisible] = useState(false);
  const touchStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const paragraphPositions = useRef<{ [k: number]: { y: number; height: number } }>({});
  const { styles, setReaderStylesConfig } = getReaderStyles({ insets });
  const [holdHide, setHoldHide] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);
  const isAtTop = scrollY <= 0;
  const isAtBottom = scrollY + viewHeight >= contentHeight - 1;
  const percentRef = useRef(0);
  const percent = (() => {
    const delta = contentHeight - viewHeight;
    if (delta <= 0) return 0;
    const p = (scrollY / delta) * 100;
    return Number.isNaN(p) ? 0 : Math.round(p);
  })();
  const hasInititalSeekedRef = useRef(false);

  const [incognitoMode] = useConfig<boolean>('incognitoMode', false);
  const [ttsIndex, setTtsIndex] = useState<number | null>(null);
  const [isTTSReading, setIsTTSReading] = useState(false);
  const lastIndexRef = useRef<number>(0);
  const stopRequestedRef = useRef<boolean>(false);
  const parragraphLongPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const content = useMemo(() => extractContentFromHTML(chapter.content ?? ''), [chapter.content]);
  const title = content.title;
  const paragraphs = content.paragraphs;

  const [availableVoices, setAvailableVoices] = useState<VoiceIdentifier[]>([]);
  const [removeDownloadOnRead] = useConfig<boolean>('removeDownloadOnRead', false);

  const [readerGeneralConfig, setReaderGeneralConfig] = useConfig<ReaderGeneralConfig>(
    'readerGeneralConfig',
    {
      showProgressSeekBar: false,
      speechSpeed: 1.0,
      voiceIdentifier: undefined,
      isTTSAutoNext: false,
      isKeepAwakeOnTTS: false,
    }
  );

  const speechSpeedRef = useRef(readerGeneralConfig.speechSpeed);
  const speechVoiceRef = useRef<string | undefined>(readerGeneralConfig.voiceIdentifier);
  const userScrolledRef = useRef(false);
  const router = useRouter();
  const isOnline = useIsOnline();

  const { mutate: updateNovelChapterProgress } = useMutation({
    mutationFn: (progress: number) =>
      novelController.updateNovelChapterProgress({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
        chapterProgress: progress,
        removeDownloadOnRead,
      }),
    onSuccess: () => {
      invalidateQueries(
        ['novel-info', chapter.novelTitle],
        ['novel-chapter', chapter.novelTitle, chapter.number],
        ['lastRead'],
        ['history']
      );
      if (isNovelSaved) invalidateQueries(['library']);
    },
  });

  const { mutate: updateNovelChapterReadAt } = useMutation({
    mutationFn: () =>
      novelController.updateNovelChapterReadAt({
        novelTitle: chapter.novelTitle,
        chapterNumber: chapter.number,
      }),
    onSuccess: () => invalidateQueries('history'),
  });

  const scrollToParagraph = useCallback(
    (paragraphIndex: number) => {
      const pos = paragraphPositions.current[paragraphIndex];
      if (pos && scrollViewRef.current) {
        const target = pos.y - viewHeight * 0.5 + pos.height / 2;
        const maxScrollY = Math.max(0, contentHeight - viewHeight);
        scrollViewRef.current.scrollTo({
          y: Math.max(0, Math.min(target, maxScrollY)),
          animated: true,
        });
      }
    },
    [viewHeight, contentHeight]
  );

  // ── Rendered content ───────────────────────────────────────────────────────
  const renderContent = useMemo(
    () => (
      <View style={{ paddingTop: styles.body.paddingTop }}>
        <Text
          selectable
          style={{
            paddingHorizontal: styles.body.paddingHorizontal,
            fontSize: styles.h4.fontSize,
            lineHeight: styles.body.lineHeight,
            color: styles.body.color,
            marginBottom: styles.h4.marginBottom + 6,
            textAlign: styles.body.textAlign,
            fontWeight: String(styles.h4.fontWeight) as TextStyle['fontWeight'],
          }}>
          {title}
        </Text>
        {paragraphs.map((text: string, idx: number) => {
          const shouldHighlight = ttsIndex === idx && isTTSReading;
          return (
            <View
              key={idx}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                paragraphPositions.current[idx] = { y, height };
              }}
              style={{
                paddingHorizontal: styles.body.paddingHorizontal,
                paddingVertical: 6,
                marginTop: -6,
                marginBottom: styles.p.marginBottom - 6,
                backgroundColor: shouldHighlight ? colors.primary_dark + 35 : 'transparent',
              }}
              onTouchStart={() => {
                if (!isTTSReading) return;
                parragraphLongPressTimeoutRef.current = setTimeout(() => {
                  stopRequestedRef.current = true;
                  isPlayerLoadedRef.current = false;
                  playerPause();
                  setTimeout(() => {
                    stopRequestedRef.current = false;
                    isAdvancingRef.current = false;
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
              }}>
              <Text
                selectable={!isTTSReading}
                style={{
                  fontSize: styles.p.fontSize,
                  lineHeight: styles.body.lineHeight,
                  color: styles.body.color,
                  textAlign: styles.body.textAlign,
                }}>
                {text}
              </Text>
            </View>
          );
        })}
      </View>
    ),
    [styles, paragraphs, ttsIndex, isTTSReading]
  );

  // ── UI bar helpers ─────────────────────────────────────────────────────────
  const handleTouchStart = () => {
    postponeHide();
    touchStartRef.current = Date.now();
  };
  const handleTouchEndCapture = () => {
    if (Date.now() - touchStartRef.current <= 300) toggleBars();
  };

  const postponeHide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLayoutVisible(false);
      timeoutRef.current = null;
    }, 3000);
  }, [holdHide]);

  function toggleHoldHide(isOpen: boolean) {
    if (!isOpen) {
      setLayoutVisible(true);
      postponeHide();
    }
    setHoldHide((h) => !h);
  }

  const toggleBars = useCallback(() => {
    setLayoutVisible((v) => !v);
    postponeHide();
  }, [layoutVisible, postponeHide]);

  const scrollToTop = useCallback(
    () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  const scrollToBottom = useCallback(
    () => scrollViewRef.current?.scrollToEnd({ animated: true }),
    []
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!userScrolledRef.current) userScrolledRef.current = true;
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  const onContentSizeChange = useCallback((_: number, h: number) => setContentHeight(h), []);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setViewHeight(e.nativeEvent.layout.height),
    []
  );

  const seekTo = useCallback(
    (p: number, smoothScroll = false) => {
      const clamped = Math.max(0, Math.min(100, p)) / 100;
      const targetY = Math.max(0, contentHeight - viewHeight) * clamped;
      if (Math.abs(targetY - scrollY) < 1) return;
      scrollViewRef.current?.scrollTo({ y: targetY, animated: smoothScroll });
    },
    [contentHeight, viewHeight, scrollY]
  );

  // ── Next chapter ───────────────────────────────────────────────────────────
  function handleNextChapter({
    enableTTS,
    startWithTTS,
  }: {
    enableTTS?: boolean;
    startWithTTS?: boolean;
  }) {
    if (!chapter.nextChapter) return;
    if (!isOnline && !chapter.nextChapter.downloaded) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }
    updateNovelChapterProgress(100);
    updateNovelChapterReadAt();

    const goToNext = () =>
      router.replace({
        pathname: '/novel/reader',
        params: {
          novelTitle: chapter.novelTitle,
          chapterNumber: chapter.nextChapter?.number,
          downloaded: chapter.nextChapter?.downloaded ? 1 : 0,
          isNovelSaved: isNovelSaved ? 1 : 0,
          startWithTTS: startWithTTS ? 1 : 0,
        },
      });

    if (enableTTS) {
      const n = chapter.nextChapter?.number;
      const t = chapter.nextChapter?.title;
      const msg = t
        ? `Continuing to chapter number ${n}: ${t}`
        : `Continuing to chapter number ${n}`;
      announcementCbRef.current = goToNext;
      synth(msg, speechVoiceRef.current, speechSpeedRef.current)
        .then((uri) => {
          isPlayerLoadedRef.current = true;
          playerReplace(uri);
          playerPlay();
        })
        .catch(goToNext);
      return;
    }
    goToNext();
  }

  // ── Core TTS loop ──────────────────────────────────────────────────────────
  const readNextParagraph = useCallback(
    async (index: number) => {
      if (index >= paragraphs.length) {
        if (!isMountedRef.current) return;
        setIsTTSReading(false);
        setTtsIndex(null);
        const msg = chapter.title
          ? `End of chapter number ${chapter.number}: ${chapter.title}`
          : `End of chapter number ${chapter.number}`;
        announcementCbRef.current = readerGeneralConfig.isTTSAutoNext
          ? () => handleNextChapter({ enableTTS: true, startWithTTS: true })
          : null;
        try {
          const uri = await synth(msg, speechVoiceRef.current, speechSpeedRef.current);
          if (!isMountedRef.current) return;
          isPlayerLoadedRef.current = true;
          playerReplace(uri);
          playerPlay();
        } catch {
          announcementCbRef.current?.();
          announcementCbRef.current = null;
        }
        return;
      }

      if (!isMountedRef.current) return;
      setTtsIndex(index);
      lastIndexRef.current = index;
      setTimeout(() => scrollToParagraph(index), 80);

      try {
        const uri = await synth(paragraphs[index], speechVoiceRef.current, speechSpeedRef.current);

        if (stopRequestedRef.current || !isMountedRef.current) return;

        isPlayerLoadedRef.current = false;
        playerReplace(uri);
        isPlayerLoadedRef.current = true;
        playerPlay();

        // Pre-warm next paragraph
        if (index + 1 < paragraphs.length) {
          synth(paragraphs[index + 1], speechVoiceRef.current, speechSpeedRef.current).catch(
            () => {}
          );
        }
      } catch (e) {
        console.error('[TTS] synth error:', e);
        if (isMountedRef.current) setIsTTSReading(false);
      }
    },
    [
      paragraphs,
      scrollToParagraph,
      playerReplace,
      playerPlay,
      chapter,
      readerGeneralConfig.isTTSAutoNext,
    ]
  );

  // ── Audio session prime ────────────────────────────────────────────────────
  const primeAudioFocus = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    primeAudioFocus();
  }, []);

  // ── didJustFinish: only advance when a real clip was loaded ───────────────
  useEffect(() => {
    if (!ttsStatus.didJustFinish) return;
    if (!isPlayerLoadedRef.current) return;

    if (announcementCbRef.current) {
      isPlayerLoadedRef.current = false;
      const cb = announcementCbRef.current;
      announcementCbRef.current = null;
      cb();
      return;
    }

    if (!isTTSReading || isAdvancingRef.current || stopRequestedRef.current) return;

    isPlayerLoadedRef.current = false;
    isAdvancingRef.current = true;
    readNextParagraph(lastIndexRef.current + 1).finally(() => {
      isAdvancingRef.current = false;
    });
  }, [ttsStatus.didJustFinish]);

  // ── Start / stop TTS ──────────────────────────────────────────────────────
  const handleTTS = async () => {
    if (isTTSHandlingRef.current) return;
    isTTSHandlingRef.current = true;
    try {
      if (isTTSReading) {
        stopRequestedRef.current = true;
        isPlayerLoadedRef.current = false;
        playerPause();
        setIsTTSReading(false);
        TTSSynthesizer.stopForegroundService().catch(() => {});
        return;
      }
      stopRequestedRef.current = false;
      isAdvancingRef.current = false;
      await TTSSynthesizer.startForegroundService().catch(() => {});
      setIsTTSReading(true);
      readNextParagraph(ttsIndex ?? lastIndexRef.current ?? 0);
    } finally {
      isTTSHandlingRef.current = false;
    }
  };

  // ── Sync speed & voice refs ────────────────────────────────────────────────
  useEffect(() => {
    speechSpeedRef.current = readerGeneralConfig.speechSpeed;
    speechVoiceRef.current = readerGeneralConfig.voiceIdentifier;
  }, [readerGeneralConfig.speechSpeed, readerGeneralConfig.voiceIdentifier]);

  useEffect(() => {
    if (isStartWithTTS) handleTTS();
  }, [isStartWithTTS]);

  // ── Keep-awake ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readerGeneralConfig.isKeepAwakeOnTTS) {
      deactivateKeepAwake();
      return;
    }
    if (isTTSReading) activateKeepAwakeAsync();
    else deactivateKeepAwake();
    return () => {
      deactivateKeepAwake();
    };
  }, [isTTSReading, readerGeneralConfig.isKeepAwakeOnTTS]);

  // ── Progress saving ────────────────────────────────────────────────────────
  const saveProgressNow = useCallback(() => {
    if (incognitoMode) return;
    if ((chapter.progress ?? 0) < 100) updateNovelChapterProgress(percentRef.current);
    updateNovelChapterReadAt();
  }, [incognitoMode, chapter.progress]);

  const debouncedSaveProgressNow = useDebouncedCallback(saveProgressNow, 300);
  useEffect(() => {
    percentRef.current = percent;
  }, [percent]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopRequestedRef.current = true;
      isPlayerLoadedRef.current = false;
      try {
        ttsPlayer.pause();
      } catch {
        /* released */
      }
      TTSSynthesizer.stopForegroundService().catch(() => {});
      setIsTTSReading(false);
    };
  }, []);

  // ── Status bars ────────────────────────────────────────────────────────────
  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    StatusBar.setStatusBarHidden(true);
    return () => {
      NavigationBar.setVisibilityAsync('visible');
      StatusBar.setStatusBarHidden(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (holdHide) return;
    if (layoutVisible) {
      NavigationBar.setVisibilityAsync('visible');
      StatusBar.setStatusBarHidden(false);
    } else {
      NavigationBar.setVisibilityAsync('hidden');
      StatusBar.setStatusBarHidden(true);
    }
  }, [layoutVisible]);

  // ── Initial seek ───────────────────────────────────────────────────────────
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

  // ── Sync TTS index from progress (initial load) ────────────────────────────
  useEffect(() => {
    if (
      ttsIndex === null &&
      Object.keys(paragraphPositions.current).length > 0 &&
      contentHeight > 0 &&
      viewHeight > 0 &&
      chapter.progress !== undefined &&
      chapter.progress < 100
    ) {
      const scrollYTarget = (chapter.progress / 100) * (contentHeight - viewHeight);
      let closest = 0;
      let minDist = Infinity;
      Object.entries(paragraphPositions.current).forEach(([i, pos]) => {
        const d = Math.abs(pos.y + pos.height / 2 - scrollYTarget);
        if (d < minDist) {
          minDist = d;
          closest = parseInt(i, 10);
        }
      });
      setTtsIndex(closest);
      lastIndexRef.current = closest;
    }
  }, [chapter.progress, contentHeight, viewHeight, ttsIndex]);

  // ── Track paragraph under viewport center while scrolling ─────────────────
  useEffect(() => {
    if (!userScrolledRef.current || isTTSReading) return;
    if (Object.keys(paragraphPositions.current).length === 0) return;
    if (contentHeight === 0 || viewHeight === 0) return;
    const center = scrollY + viewHeight / 2;
    let closest = lastIndexRef.current ?? 0;
    let minDist = Infinity;
    Object.entries(paragraphPositions.current).forEach(([i, pos]) => {
      const d = Math.abs(pos.y + pos.height / 2 - center);
      if (d < minDist) {
        minDist = d;
        closest = parseInt(i, 10);
      }
    });
    if (isAtTop) closest = 0;
    if (closest !== lastIndexRef.current) {
      setTtsIndex(closest);
      lastIndexRef.current = closest;
    }
  }, [scrollY, contentHeight, viewHeight, isAtTop, isTTSReading]);

  // ── Load voices ────────────────────────────────────────────────────────────
  useEffect(() => {
    TTSSynthesizer.getAvailableVoices('en-US')
      .then((voices: TTSVoice[]) =>
        setAvailableVoices(voices.map((v) => ({ ...v, quality: 'Default' })))
      )
      .catch(() => {});
  }, []);

  // ── Pre-warm: silently synthesise the first N paragraphs on mount ──────────
  useEffect(() => {
    if (!paragraphs.length) return;
    const PREWARM_COUNT = 3;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < Math.min(PREWARM_COUNT, paragraphs.length); i++) {
        if (cancelled || !isMountedRef.current) break;
        await synth(paragraphs[i], speechVoiceRef.current, speechSpeedRef.current).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.novelTitle, chapter.number]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ReaderLayout
      layoutVisible={layoutVisible || holdHide}
      postponeHide={postponeHide}
      chapter={chapter}
      isNovelSaved={isNovelSaved}
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
      availableVoices={availableVoices}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        onScrollBeginDrag={postponeHide}
        onScrollEndDrag={() => {
          postponeHide();
          debouncedSaveProgressNow();
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
        onTouchStart={handleTouchStart}
        onTouchEndCapture={handleTouchEndCapture}>
        {renderContent}
        <ReaderFooter
          chapter={chapter}
          styles={styles}
          insets={insets}
          handleNextChapter={handleNextChapter}
        />
      </ScrollView>
    </ReaderLayout>
  );
}

// ─── Reader styles ────────────────────────────────────────────────────────────
export function getReaderStyles({ insets }: { insets: { top: number; bottom: number } }): {
  styles: Style;
  setReaderStylesConfig: (styles: ReaderStyleConfig) => void;
} {
  const defaultReaderStyle: ReaderStyleConfig = {
    body: {
      backgroundColor: colors.background,
      color: colors.grayscale_foreground,
      textAlign: 'left',
      lineHeight: 24,
    },
    h4: { fontSize: 20 },
    p: { fontSize: 16 },
  };

  const [readerStyleConfig, setReaderStylesConfig] = useConfig<ReaderStyleConfig>(
    'readerStyleConfig',
    defaultReaderStyle
  );

  const styles: Style = useMemo(
    () => ({
      body: {
        ...defaultReaderStyle.body,
        ...readerStyleConfig.body,
        paddingHorizontal: 20,
        paddingTop: insets.top,
      },
      h4: { ...defaultReaderStyle.h4, ...readerStyleConfig.h4, fontWeight: 700, marginBottom: 16 },
      p: { ...defaultReaderStyle.p, ...readerStyleConfig.p, marginBottom: 16 },
    }),
    [readerStyleConfig, insets.top, insets.bottom]
  );

  return { styles, setReaderStylesConfig };
}
