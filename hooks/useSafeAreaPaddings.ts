import { useConfig } from "@/providers/appConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useSafeAreaPaddings() {
  const [downloadedOnly] = useConfig<boolean>("downloadedOnly", false);
  const [incognitoMode] = useConfig<boolean>("incognitoMode", false);
  const insets = useSafeAreaInsets();

  const isModeIndicatorVisible = downloadedOnly || incognitoMode;

  function getPaddingTop(modeIndicatorException = false) {
    if (modeIndicatorException && isModeIndicatorVisible) {
      return 0;
    }
    return insets.top;
  }

  return { getPaddingTop };
}
