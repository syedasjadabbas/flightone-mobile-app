import { Text, type TextProps } from "react-native";
import { type } from "@/core/theme/tokens";

type Variant = keyof typeof type;

/** Text with the Ava type scale (Sora headings, Space Grotesk body). */
export function AppText({ variant = "body", style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[type[variant], style]} />;
}
