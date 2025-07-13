import { View } from "react-native";
import { Text } from "../defaults";
import { HistoryBatch } from "@/types/history";
import { parse, differenceInCalendarDays } from "date-fns";
import HistoryCard from "./historyCard";

export default function HistoryBatchCard({
  history,
  openRemoveEntryDrawer,
}: {
  history: HistoryBatch;
  openRemoveEntryDrawer: ({
    novelTitle,
    chapterNumber,
  }: {
    novelTitle: string;
    chapterNumber: number;
  }) => void;
}) {
  const groupLabel = getGroupLabel(history.readAt);

  return (
    <View className="flex flex-col gap-y-4 mb-4">
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

function getGroupLabel(date: string) {
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());

  const daysDiff = differenceInCalendarDays(new Date(), parsedDate);

  if (daysDiff === 0) {
    return "Today";
  } else if (daysDiff === 1) {
    return "Yesterday";
  } else {
    return `${daysDiff} days ago`;
  }
}
