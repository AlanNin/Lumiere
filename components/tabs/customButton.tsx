import { NavigationTabBarTransitionContext } from '@/contexts/navigationTabBar';
import { usePathname } from 'expo-router';
import { TabTriggerSlotProps } from 'expo-router/ui';
import { BookCopy, Compass, Ellipsis, History, LucideIcon } from 'lucide-react-native';
import React, { forwardRef, useCallback, useContext } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../defaults';
import { colors } from '@/lib/constants';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const iconMap = {
  BookCopy,
  Ellipsis,
  Compass,
  History,
} satisfies Record<string, LucideIcon>;

interface CustomTabButtonProps extends React.PropsWithChildren, TabTriggerSlotProps {
  iconName: keyof typeof iconMap;
  label?: string;
  onDoblePress?: () => void;
}

const ANIMATION_DURATION = 250;

export const CustomTabButton = forwardRef<View, CustomTabButtonProps>(
  ({ iconName, label, isFocused, onPress, onDoblePress, ...props }, ref) => {
    const LucideIcon = iconMap[iconName];
    const { begin } = useContext(NavigationTabBarTransitionContext);
    const pathname = usePathname();

    const focusProgress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
      focusProgress.value = withTiming(isFocused ? 1 : 0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }, [isFocused]);

    const handlePress = useCallback(
      (e: any) => {
        if (isFocused && props.href === pathname) {
          onDoblePress?.();
          return;
        }

        if (props.href && props.href !== pathname) {
          begin();
        }
        onPress?.(e);
      },
      [begin, onPress, pathname, props.href]
    );

    const iconContainerStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        ['transparent', colors.primary]
      ),
      borderRadius: 9999,
      paddingHorizontal: 20,
      paddingVertical: 6,
      transform: [
        {
          translateY: interpolate(focusProgress.value, [0, 1], [4, 0]),
        },
      ],
    }));

    const labelStyle = useAnimatedStyle(() => ({
      opacity: withTiming(isFocused ? 1 : 0, {
        duration: 100,
        easing: Easing.out(Easing.cubic),
      }),
      transform: [
        {
          translateY: withTiming(isFocused ? 0 : 10, {
            duration: ANIMATION_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
      position: isFocused ? 'relative' : 'absolute',
    }));

    return (
      <Pressable
        ref={ref}
        {...props}
        onPress={handlePress}
        className="items-center justify-center gap-y-1.5"
        style={{ flexDirection: 'column' }}
        android_ripple={{
          color: colors.muted_foreground,
          borderless: true,
          radius: 9999,
        }}>
        <Animated.View style={iconContainerStyle}>
          <LucideIcon
            size={24}
            color={isFocused ? colors.foreground : colors.muted_foreground}
            strokeWidth={1.8}
          />
        </Animated.View>

        {label && (
          <Animated.View style={labelStyle}>
            <Text className="text-sm font-medium">{label}</Text>
          </Animated.View>
        )}
      </Pressable>
    );
  }
);
