import { Text } from "@/components/defaults";
import BooleanSwitch from "@/components/switch";
import { useConfig } from "@/providers/appConfig";
import { TouchableOpacity } from "react-native";

export default function RemoveDownloadOnRead() {
  const [removeDownloadOnRead, setRemoveDownloadOnRead] = useConfig<boolean>(
    "removeDownloadOnRead",
    false
  );

  function toggleRemoveDownloadOnRead() {
    setRemoveDownloadOnRead(!removeDownloadOnRead);
  }

  return (
    <TouchableOpacity
      className="flex flex-row gap-x-4 items-center justify-between px-5 py-2 pr-6"
      onPress={toggleRemoveDownloadOnRead}
    >
      <Text className="font-medium">Remove Download on Read</Text>
      <BooleanSwitch value={removeDownloadOnRead} asChild />
    </TouchableOpacity>
  );
}
