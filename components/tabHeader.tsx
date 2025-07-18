import React from "react";
import { BackHandler, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Search } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { useFocusEffect } from "@react-navigation/native";
import { usePathname, useRouter } from "expo-router";
import { Text } from "@/components/defaults";
import { cn } from "@/lib/cn";
import Animated, {
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabHeader({
  title,
  showSearch,
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  containerClassName,
  scrollY,
  customRightContent,
  renderBackButton,
}: {
  title: string;
  showSearch?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  isSearchOpen?: boolean;
  setIsSearchOpen?: (isOpen: boolean) => void;
  containerClassName?: string;
  scrollY?: SharedValue<number>;
  customRightContent?: React.ReactNode;
  renderBackButton?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Optional animated background
  const bgProgress = useDerivedValue(() =>
    withTiming((scrollY?.value ?? 0) > 0 ? 1 : 0, { duration: 300 })
  );
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      ["transparent", colors.layout_background]
    ),
  }));
  //...

  useFocusEffect(
    React.useCallback(() => {
      if (!isSearchOpen || !setIsSearchOpen || !setSearchQuery) {
        return;
      }

      const onBackPress = () => {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery("");
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => {
        subscription.remove();
      };
    }, [isSearchOpen, setIsSearchOpen, setSearchQuery])
  );

  React.useLayoutEffect(() => {
    if (setIsSearchOpen && setSearchQuery) {
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [pathname]);

  return (
    <Animated.View style={[{ paddingTop: insets.top }, backgroundStyle]}>
      {isSearchOpen &&
      searchQuery != undefined &&
      setSearchQuery != undefined ? (
        <View
          className={cn(
            "h-12 px-5 my-3 flex flex-row items-center",
            containerClassName
          )}
        >
          <TouchableOpacity
            onPress={() => {
              if (setIsSearchOpen) {
                setIsSearchOpen(false);
              }
              setSearchQuery("");
            }}
            className="p-2 -ml-2"
          >
            <ArrowLeft color={colors.muted_foreground} size={24} />
          </TouchableOpacity>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            className="w-full flex-1 text-[18px] py-1 text-muted_foreground"
            placeholderTextColor={colors.muted_foreground}
            autoFocus
          />
        </View>
      ) : (
        <View
          className={cn(
            "h-12 px-5 my-3 flex flex-row items-center justify-between",
            containerClassName
          )}
        >
          <View
            className={cn(
              "flex flex-row items-center gap-x-3",
              renderBackButton && "-ml-2"
            )}
          >
            {renderBackButton && (
              <TouchableOpacity onPress={() => router.back()} className="p-2">
                <ArrowLeft color={colors.muted_foreground} size={20} />
              </TouchableOpacity>
            )}
            <Text className="text-2xl text-muted_foreground">{title}</Text>
          </View>
          <View className="flex flex-row items-center gap-x-3 -mr-2">
            {showSearch && (
              <TouchableOpacity
                onPress={() => {
                  if (setIsSearchOpen) {
                    setIsSearchOpen(true);
                  }
                }}
                className="p-2"
              >
                <Search color={colors.muted_foreground} size={20} />
              </TouchableOpacity>
            )}
            {customRightContent}
          </View>
        </View>
      )}
    </Animated.View>
  );
}
