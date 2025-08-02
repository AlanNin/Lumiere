import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConfig } from "@/providers/appConfig";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./defaults";
import { colors } from "@/lib/constants";
import { useMemo } from "react";
import { usePathname } from "expo-router";

type ModeKey = "incognito" | "downloaded";

type Mode = { key: ModeKey; label: string; bgColor: string };

const MODES: Mode[] = [
  {
    key: "downloaded",
    label: "Downloaded Only",
    bgColor: colors.primary_dark,
  },
  {
    key: "incognito",
    label: "Incognito Mode",
    bgColor: colors.secondary_dark,
  },
];

const BADGE_DEFAULT_HEIGHT = 36;

function Badge({
  mode,
  isOpen,
  extraHeight,
  centerText,
}: {
  mode: Mode;
  isOpen: boolean;
  extraHeight?: boolean;
  centerText?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const BADGE_HEIGHT = {
    OPEN: extraHeight
      ? BADGE_DEFAULT_HEIGHT + insets.top
      : BADGE_DEFAULT_HEIGHT,
    CLOSED: 0,
  };

  const badgeHeight = useDerivedValue(() =>
    withTiming(isOpen ? BADGE_HEIGHT.OPEN : BADGE_HEIGHT.CLOSED, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    })
  );

  const badgeStyle = useAnimatedStyle(() => ({
    height: badgeHeight.value,
  }));

  return (
    <Animated.View
      style={[
        badgeStyle,
        {
          backgroundColor: mode.bgColor,
        },
      ]}
      className="flex items-center justify-end"
    >
      <View style={{ padding: 9 }}>
        <Text>{mode.label}</Text>
      </View>
    </Animated.View>
  );
}

export default function ModeIndicator() {
  const [downloadedOnly] = useConfig<boolean>("downloadedOnly", false);
  const [incognitoMode] = useConfig<boolean>("incognitoMode", false);
  const onlyOneModeActive = downloadedOnly !== incognitoMode;

  const extraHeightMap: Record<ModeKey, boolean> = useMemo(
    () => ({
      downloaded: true,
      incognito: !downloadedOnly && incognitoMode,
    }),
    [downloadedOnly, incognitoMode]
  );

  const modeEntries = useMemo<{ mode: Mode; isOpen: boolean }[]>(
    () => [
      { mode: MODES[0], isOpen: downloadedOnly },
      { mode: MODES[1], isOpen: incognitoMode },
    ],
    [downloadedOnly, incognitoMode]
  );

  return (
    <View>
      {modeEntries.map(({ mode, isOpen }) => {
        const hasExtraHeight = extraHeightMap[mode.key];
        const centerText = hasExtraHeight && onlyOneModeActive;
        return (
          <Badge
            key={mode.key}
            mode={mode}
            isOpen={isOpen}
            extraHeight={hasExtraHeight}
            centerText={centerText}
          />
        );
      })}
    </View>
  );
}
