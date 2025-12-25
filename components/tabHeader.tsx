import { ReactNode, useCallback, useLayoutEffect } from 'react';
import { BackHandler, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Search } from 'lucide-react-native';
import { colors } from '@/lib/constants';
import { useFocusEffect } from '@react-navigation/native';
import { usePathname, useRouter } from 'expo-router';
import { Text } from '@/components/defaults';
import { cn } from '@/lib/cn';
import Animated, {
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaPaddings } from '@/hooks/useSafeAreaPaddings';

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
  customRightContent?: ReactNode;
  renderBackButton?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Optional animated background
  const bgProgress = useDerivedValue(() =>
    withTiming((scrollY?.value ?? 0) > 0 ? 1 : 0, { duration: 300 })
  );
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      ['transparent', colors.layout_background]
    ),
  }));

  useFocusEffect(
    useCallback(() => {
      if (!isSearchOpen || !setIsSearchOpen || !setSearchQuery) {
        return;
      }

      const onBackPress = () => {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery('');
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
      };
    }, [isSearchOpen, setIsSearchOpen, setSearchQuery])
  );

  useLayoutEffect(() => {
    if (setIsSearchOpen && setSearchQuery) {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [pathname]);

  const { getPaddingTop } = useSafeAreaPaddings();
  const paddingTop = getPaddingTop(true);

  return (
    <Animated.View style={[{ paddingTop: paddingTop }, backgroundStyle]}>
      {isSearchOpen && searchQuery != undefined && setSearchQuery != undefined ? (
        <View className={cn('my-3 flex h-12 flex-row items-center px-5', containerClassName)}>
          <TouchableOpacity
            onPress={() => {
              if (setIsSearchOpen) {
                setIsSearchOpen(false);
              }
              setSearchQuery('');
            }}
            className="-ml-2 p-2">
            <ArrowLeft color={colors.muted_foreground} size={24} />
          </TouchableOpacity>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            className="w-full flex-1 py-1 text-[18px] text-muted_foreground"
            placeholderTextColor={colors.muted_foreground}
            autoFocus
          />
        </View>
      ) : (
        <View
          className={cn(
            'my-3 flex h-12 flex-row items-center justify-between px-5',
            containerClassName
          )}>
          <View className={cn('flex flex-row items-center gap-x-3', renderBackButton && '-ml-2')}>
            {renderBackButton && (
              <TouchableOpacity onPress={() => router.back()} className="p-2">
                <ArrowLeft color={colors.muted_foreground} size={20} />
              </TouchableOpacity>
            )}
            <Text className="text-2xl text-muted_foreground">{title}</Text>
          </View>
          <View className="-mr-2 flex flex-row items-center gap-x-3">
            {showSearch && (
              <TouchableOpacity
                onPress={() => {
                  if (setIsSearchOpen) {
                    setIsSearchOpen(true);
                  }
                }}
                className="p-2">
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
