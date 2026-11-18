import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius, shadow, space } from "@/core/theme/tokens";

/** White card with a soft shadow (`.fo-ui-card`). */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
    ...shadow,
  },
});
