import { FlatList, View } from 'react-native';
import { Text } from '@/components/defaults';

export default function NovelGenres({ genres }: { genres: string[] }) {
  return (
    <View>
      <FlatList
        data={genres}
        renderItem={({ item: genre }) => (
          <View className="rounded-lg border border-muted_foreground/50 px-3 py-1">
            <Text className="text-muted_foreground/75">{genre}</Text>
          </View>
        )}
        horizontal
        contentContainerClassName="flex-row gap-x-3 px-5"
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
