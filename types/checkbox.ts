import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";

export type CheckboxProps = {
  /**
   * Status of checkbox.
   */
  status: "checked" | "unchecked" | "indeterminate";
  /**
   * Whether checkbox is disabled.
   */
  disabled?: boolean;
  /**
   * Function to execute on press.
   */
  onPress?: (e: GestureResponderEvent) => void;
  /**
   * testID to be used on tests.
   */
  testID?: string;
  /**
   * Style for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Size of the checkbox.
   * @default 24
   */
  size?: number;
};
