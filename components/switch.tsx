import { Switch } from "react-native-gesture-handler";
import { colors } from "@/lib/constants";

export default function BooleanSwitch({
  value = false,
  onChange,
}: {
  value?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <Switch
      trackColor={{
        false: colors.grayscale,
        true: colors.foreground,
      }}
      thumbColor={value ? colors.primary : colors.grayscale_foreground}
      onValueChange={(value) => {
        if (onChange) {
          onChange(value);
        }
      }}
      value={value}
    />
  );
}
