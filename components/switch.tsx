import React from "react";
import { Switch } from "react-native-gesture-handler";
import { colors } from "@/lib/constants";

export default function BooleanSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      trackColor={{
        false: colors.grayscale,
        true: colors.foreground,
      }}
      thumbColor={value ? colors.primary : colors.grayscale_foreground}
      onValueChange={(value) => {
        onChange(value);
      }}
      value={value}
    />
  );
}
