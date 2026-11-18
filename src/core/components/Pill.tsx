import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";

/** Filter pill (`.fo-ui-pill`). */
export function Pill({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={[styles.pill, selected && styles.pillOn]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Small uppercase tag (`.fo-ui-tag`). */
export function Tag({ label, tone = "accent" }: { label: string; tone?: "accent" | "success" | "neutral" }) {
  const palette =
    tone === "success"
      ? { bg: colors.successSoft, fg: colors.success }
      : tone === "neutral"
        ? { bg: colors.bgGlow, fg: colors.inkSoft }
        : { bg: colors.accentSoft, fg: colors.accent };
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      <Text style={[type.tag, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 36,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    justifyContent: "center",
  },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  pillTextOn: { color: colors.onBtn },
  tag: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
});
