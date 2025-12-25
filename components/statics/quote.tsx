import { cn } from '@/lib/cn';
import { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '../defaults';
import { colors } from '@/lib/constants';

export default function Quote({
  quote,
  Icon,
  iconStrokeWidth = 1,
}: {
  quote: string;
  Icon?: LucideIcon;
  iconStrokeWidth?: number;
}) {
  return (
    <View className="flex flex-1 flex-col items-center justify-center gap-y-3">
      <Text className="max-w-56 text-center italic tracking-widest text-muted_foreground">
        {quote}
      </Text>
      {Icon && <Icon color={colors.muted_foreground} size={20} strokeWidth={iconStrokeWidth} />}
    </View>
  );
}
