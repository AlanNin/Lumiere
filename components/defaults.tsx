import { cn } from "@/lib/cn";
import { Text as DefaultText, TextProps } from "react-native";

export function Text(props: TextProps) {
  const { className, ...otherProps } = props;
  return (
    <DefaultText className={cn("text-foreground", className)} {...otherProps} />
  );
}
