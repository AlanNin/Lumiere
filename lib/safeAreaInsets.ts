import { useConfig } from "@/providers/appConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function getPaddingTop(modeIndicatorException?: boolean) {
  const [downloadedOnly] = useConfig<boolean>("downloadedOnly", false);
  const [incognitoMode] = useConfig<boolean>("incognitoMode", false);

  const isModeIndicatorVisible = downloadedOnly || incognitoMode;

  if (modeIndicatorException && isModeIndicatorVisible) {
    return 0;
  }

  const insets = useSafeAreaInsets();
  return insets.top;
}
