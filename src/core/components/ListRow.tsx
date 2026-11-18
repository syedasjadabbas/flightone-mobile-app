import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, space, type } from "@/core/theme/tokens";

/** Title + detail row with an optional trailing action (e.g. "Remove"). */
export function ListRow({
  title,
  detail,
  actionLabel,
  onAction,
  onPress,
  tone = "danger",
}: {
  title: string;
  detail?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
  tone?: "danger" | "accent";
}) {
  const body = (
    <View style={styles.text}>
      <Text style={type.label}>{title}</Text>
      {detail ? <Text style={type.bodySoft}>{detail}</Text> : null}
    </View>
  );
  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.text}>
          {body}
        </Pressable>
      ) : (
        body
      )}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel} ${title}`} onPress={onAction} hitSlop={10}>
          <Text style={[styles.action, tone === "accent" && styles.accent]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  text: { flex: 1, gap: 2 },
  action: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.danger },
  accent: { color: colors.accent },
});
