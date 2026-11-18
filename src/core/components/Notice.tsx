import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

/** Inline banner for form errors and info messages. */
export function Notice({ message, tone = "error" }: { message: string; tone?: "error" | "info" | "success" }) {
  const palette =
    tone === "success"
      ? { bg: colors.successSoft, fg: colors.success, icon: "checkmark-circle" as const }
      : tone === "info"
        ? { bg: colors.accentSoft, fg: colors.accent, icon: "information-circle" as const }
        : { bg: colors.dangerSoft, fg: colors.danger, icon: "alert-circle" as const };
  return (
    <View style={[styles.box, { backgroundColor: palette.bg }]} accessibilityLiveRegion="polite">
      <Ionicons name={palette.icon} size={18} color={palette.fg} style={styles.icon} />
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", gap: space.sm, borderRadius: radius.md, padding: space.md },
  icon: { marginTop: 1 },
  text: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
});
