import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

/** Inline banner for form errors and info messages. */
export function Notice({ message, tone = "error" }: { message: string; tone?: "error" | "info" | "success" }) {
  const palette =
    tone === "success"
      ? { bg: colors.successSoft, fg: colors.success }
      : tone === "info"
        ? { bg: colors.accentSoft, fg: colors.accent }
        : { bg: colors.dangerSoft, fg: colors.danger };
  return (
    <View style={[styles.box, { backgroundColor: palette.bg }]} accessibilityLiveRegion="polite">
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.sm, padding: space.md },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
});
