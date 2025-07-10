import { colors } from "@/lib/constants";
import {
  BookmarkMinus,
  BookmarkPlus,
  Eye,
  EyeClosed,
  LucideIcon,
} from "lucide-react-native";
import React from "react";
import { Animated, View } from "react-native";
// Ignore deprecation warning, reanimated swipeable is laggy as fuck
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

const ITEM_WIDTH = 120;
const THRESHOLD = 80;
const THRESHOLD_FRACTION = THRESHOLD / ITEM_WIDTH;

interface NovelSwipeableProps {
  children: React.ReactNode;
  onLeftSwipe?: () => void;
  onRightSwipe?: () => void;
  isBookmarked?: boolean;
  isRead?: boolean;
}

// Memoize the actions component to prevent unnecessary re-renders
const RenderActionsBase = React.memo(
  ({
    translateX,
    backgroundColor,
    Icon,
  }: {
    translateX: Animated.AnimatedInterpolation<number>;
    backgroundColor: Animated.AnimatedInterpolation<number>;
    Icon: LucideIcon;
  }) => {
    return (
      <View style={{ flex: 1, width: ITEM_WIDTH, overflow: "hidden" }}>
        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor,
              transform: [{ translateX }],
            },
          ]}
          className="flex justify-center items-center"
        >
          <Icon size={24} color={colors.primary_foreground} strokeWidth={1.8} />
        </Animated.View>
      </View>
    );
  }
);

RenderActionsBase.displayName = "RenderActionsBase";

const NovelSwipeable = React.memo<NovelSwipeableProps>(
  ({
    children,
    onLeftSwipe,
    onRightSwipe,
    isBookmarked = false,
    isRead = false,
  }) => {
    const swipeRef = React.useRef<Swipeable>(null);

    // Memoize the render functions to prevent recreation on every render
    const renderLeftActions = React.useCallback(
      (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
      ) => {
        const translateX = dragX.interpolate({
          inputRange: [0, ITEM_WIDTH],
          outputRange: [-ITEM_WIDTH, 0],
          extrapolate: "clamp",
        });

        const backgroundColor = progress.interpolate({
          inputRange: [0, THRESHOLD_FRACTION, 1],
          outputRange: [colors.grayscale, colors.grayscale, colors.secondary],
          extrapolate: "clamp",
        });

        return (
          <RenderActionsBase
            translateX={translateX}
            backgroundColor={backgroundColor}
            Icon={isBookmarked ? BookmarkMinus : BookmarkPlus}
          />
        );
      },
      [isBookmarked]
    );

    const renderRightActions = React.useCallback(
      (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
      ) => {
        const translateX = dragX.interpolate({
          inputRange: [-ITEM_WIDTH, 0],
          outputRange: [0, ITEM_WIDTH],
          extrapolate: "clamp",
        });

        const backgroundColor = progress.interpolate({
          inputRange: [0, THRESHOLD_FRACTION, 1],
          outputRange: [colors.grayscale, colors.grayscale, colors.primary],
          extrapolate: "clamp",
        });

        return (
          <RenderActionsBase
            translateX={translateX}
            backgroundColor={backgroundColor}
            Icon={isRead ? EyeClosed : Eye}
          />
        );
      },
      [isRead]
    );

    // Memoize the callback functions to prevent unnecessary re-renders
    const handleLeftSwipe = React.useCallback(() => {
      onLeftSwipe?.();
      swipeRef.current?.close();
    }, [onLeftSwipe]);

    const handleRightSwipe = React.useCallback(() => {
      onRightSwipe?.();
      swipeRef.current?.close();
    }, [onRightSwipe]);

    const childrenContainerStyle = React.useMemo(
      () => ({
        backgroundColor: colors.background,
        zIndex: 1,
      }),
      []
    );

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Swipeable
          ref={swipeRef}
          friction={2}
          overshootRight={false}
          overshootLeft={false}
          containerStyle={{ overflow: "hidden" }}
          childrenContainerStyle={childrenContainerStyle}
          renderRightActions={renderRightActions}
          renderLeftActions={renderLeftActions}
          rightThreshold={THRESHOLD}
          leftThreshold={THRESHOLD}
          onSwipeableLeftOpen={handleLeftSwipe}
          onSwipeableRightOpen={handleRightSwipe}
        >
          {children}
        </Swipeable>
      </GestureHandlerRootView>
    );
  }
);

NovelSwipeable.displayName = "NovelSwipeable";

export default NovelSwipeable;
