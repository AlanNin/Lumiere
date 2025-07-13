import { View } from "react-native";
import { Chapter } from "@/types/novel";
import { useRef } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import ReaderStyleConfigDrawer from "./configDrawer";
import { ReaderGeneralConfig, ReaderStyleConfig } from "@/types/appConfig";
import ReaderTopBar from "./topBar";
import ReaderBottomBar from "./bottomBar";
import ProgressSeekBar from "./progressSeekBar";
import { useConfig } from "@/providers/appConfig";

export default function ReaderLayout({
  children,
  layoutVisible,
  postponeHide,
  chapter,
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
}: {
  children: React.ReactNode;
  layoutVisible: boolean;
  postponeHide: () => void;
  chapter: Chapter;
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
}) {
  const bottomDrawerConfigRef = useRef<BottomSheetModal>(null);

  const handleOpenBottomDrawerConfig = () => {
    bottomDrawerConfigRef.current?.present();
  };

  // local config states (styles config state is passed in as a prop)
  const [readerGeneralConfig, setReaderGeneralConfig] = useConfig<
    ReaderGeneralConfig
  >("readerGeneralConfig", {
    showProgressSeekBar: false,
  });

  return (
    <View
      className="flex-1 relative"
      style={{ backgroundColor: styles.body.backgroundColor }}
    >
      {/* children - reader component */}
      {children}

      {/* top bar */}
      <ReaderTopBar
        layoutVisible={layoutVisible}
        postponeHide={postponeHide}
        chapter={chapter}
        insets={insets}
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
        pointerEvents={layoutVisible ? "auto" : "none"}
      />
    </View>
  );
}
