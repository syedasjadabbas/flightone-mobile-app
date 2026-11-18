import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius } from "@/core/theme/tokens";

export type Tone = "success" | "warn" | "danger" | "info" | "neutral";

const PALETTE: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successSoft },
  warn: { fg: "#b26a00", bg: "#fdf1dc" },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.accent, bg: colors.accentSoft },
  neutral: { fg: colors.inkSoft, bg: "#e9edf2" },
};

/** Small coloured status badge with an optional leading dot or icon. */
export function ToneTag({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const p = PALETTE[tone];
  return (
    <View style={[styles.tag, { backgroundColor: p.bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={p.fg} /> : <View style={[styles.dot, { backgroundColor: p.fg }]} />}
      <Text style={[styles.text, { color: p.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function toneColor(tone: Tone) {
  return PALETTE[tone].fg;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
});
