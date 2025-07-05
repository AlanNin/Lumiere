import React from "react";
import { BackHandler, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Search } from "lucide-react-native";
import { colors } from "@/lib/constants";
import { useFocusEffect } from "@react-navigation/native";
import { usePathname } from "expo-router";
import { Text } from "@/components/defaults";
import { cn } from "@/lib/cn";

export default function TabHeader({
  title,
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  containerClassName,
}: {
  title: string;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  isSearchOpen?: boolean;
  setIsSearchOpen?: (isOpen: boolean) => void;
  containerClassName?: string;
}) {
  const pathname = usePathname();

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
    <>
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
          <Text className="text-2xl text-muted_foreground">{title}</Text>
          <TouchableOpacity
            onPress={() => {
              if (setIsSearchOpen) {
                setIsSearchOpen(true);
              }
            }}
            className="p-2 -mr-2"
          >
            <Search color={colors.muted_foreground} size={20} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
