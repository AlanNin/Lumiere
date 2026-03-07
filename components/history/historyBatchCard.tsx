import { View } from 'react-native';
import { Text } from '../defaults';
import { HistoryBatch } from '@/types/history';
import {
  parse,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns';
import HistoryCard from './historyCard';
import { cn } from '@/lib/cn';

export default function HistoryBatchCard({
  history,
  openRemoveEntryDrawer,
  isLast,
}: {
  history: HistoryBatch;
  openRemoveEntryDrawer: ({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }) => void;
  isLast: boolean;
}) {
  const groupLabel = getGroupLabel(history.readAt);

  return (
    <View className={cn(' flex flex-col gap-y-4', !isLast && 'mb-7')}>
      <Text className="font-medium text-muted_foreground/80">{groupLabel}</Text>
      <View className="flex flex-col gap-y-5">
        {history.chaptersHistory.map((ch) => (
          <HistoryCard
            key={ch.id}
            chapterHistory={ch}
            openRemoveEntryDrawer={openRemoveEntryDrawer}
          />
        ))}
      </View>
    </View>
  );
}

function getGroupLabel(readAt: string): string {
  const date = parse(readAt.slice(0, 10), 'yyyy-MM-dd', new Date());
  const now = new Date();
  const daysDiff = differenceInCalendarDays(now, date);

  if (daysDiff === 0) return 'Today';
  if (daysDiff < 7) return daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`;

  const weeks = Math.floor(daysDiff / 7);
  if (weeks <= 3) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;

  const months = differenceInCalendarMonths(now, date);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

  const years = differenceInCalendarYears(now, date);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
