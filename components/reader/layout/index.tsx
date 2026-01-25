import { View } from 'react-native';
import { Chapter } from '@/types/novel';
import { ReactNode, useRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ReaderStyleConfigDrawer from './configDrawer';
import { ReaderGeneralConfig, ReaderStyleConfig } from '@/types/appConfig';
import ReaderTopBar from './topBar';
import ReaderBottomBar from './bottomBar';
import ProgressSeekBar from './progressSeekBar';
import { VoiceIdentifier } from '@/types/reader';

export default function ReaderLayout({
  children,
  layoutVisible,
  postponeHide,
  chapter,
  isNovelSaved,
  scrollToTop,
  scrollToBottom,
  insets,
  styles,
  setReaderStylesConfig,
  toggleHoldHide,
  percent,
  isAtTop,
  isAtBottom,
  seekTo,
  handleTTS,
  isTTSReading,
  readerGeneralConfig,
  setReaderGeneralConfig,
  availableVoices,
}: {
  children: ReactNode;
  layoutVisible: boolean;
  postponeHide: () => void;
  chapter: Chapter;
  isNovelSaved: boolean;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  insets: { top: number; bottom: number };
  styles: ReaderStyleConfig;
  setReaderStylesConfig: (styles: ReaderStyleConfig) => void;
  toggleHoldHide: (isClosing: boolean) => void;
  percent: number;
  isAtTop: boolean;
  isAtBottom: boolean;
  seekTo: (percent: number) => void;
  handleTTS: () => void;
  isTTSReading: boolean;
  readerGeneralConfig: ReaderGeneralConfig;
  setReaderGeneralConfig: (config: ReaderGeneralConfig) => void;
  availableVoices: VoiceIdentifier[];
}) {
  const bottomDrawerConfigRef = useRef<BottomSheetModal>(null);

  const handleOpenBottomDrawerConfig = () => {
    bottomDrawerConfigRef.current?.present();
  };

  return (
    <View className="relative flex-1" style={{ backgroundColor: styles.body.backgroundColor }}>
      {/* children - reader component */}
      {children}

      {/* top bar */}
      <ReaderTopBar
        layoutVisible={layoutVisible}
        postponeHide={postponeHide}
        chapter={chapter}
        insets={insets}
        handleTTS={handleTTS}
        isTTSReading={isTTSReading}
      />

      {/* optional- progress seek bar */}
      {readerGeneralConfig.showProgressSeekBar && (
        <ProgressSeekBar
          layoutVisible={layoutVisible}
          postponeHide={postponeHide}
          percent={percent}
          seekTo={seekTo}
          insets={insets}
        />
      )}

      {/* bottom bar */}
      <ReaderBottomBar
        layoutVisible={layoutVisible}
        postponeHide={postponeHide}
        chapter={chapter}
        isNovelSaved={isNovelSaved}
        insets={insets}
        isAtBottom={isAtBottom}
        isAtTop={isAtTop}
        scrollToBottom={scrollToBottom}
        scrollToTop={scrollToTop}
        handleOpenBottomDrawerConfig={handleOpenBottomDrawerConfig}
      />

      {/* bottom drawer - reader config */}
      <ReaderStyleConfigDrawer
        drawerRef={bottomDrawerConfigRef}
        insets={insets}
        toggleHoldHide={toggleHoldHide}
        styles={styles}
        setReaderStylesConfig={setReaderStylesConfig}
        readerGeneralConfig={readerGeneralConfig}
        setReaderGeneralConfig={setReaderGeneralConfig}
        pointerEvents={layoutVisible ? 'auto' : 'none'}
        availableVoices={availableVoices}
      />
    </View>
  );
}
