import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, space } from "@/core/theme/tokens";
import { TINT, type TintName } from "./tints";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Title + detail row with an optional icon badge, trailing text (`meta`),
 * and either a trailing action ("Remove") or — when the row opens something —
 * a chevron, with the whole row tappable.
 */
export function ListRow({
  title,
  detail,
  actionLabel,
  onAction,
  onPress,
  tone = "danger",
  icon,
  tint = "blue",
  meta,
  last = false,
}: {
  title: string;
  detail?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
  tone?: "danger" | "accent";
  icon?: IconName;
  tint?: TintName;
  /** Short trailing text, e.g. a price or status. */
  meta?: string | null;
  /** Hide the bottom divider on the last row of a list. */
  last?: boolean;
}) {
  const t = TINT[tint];
  const content = (
    <>
      {icon ? (
        <View style={[styles.badge, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={17} color={t.fg} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </>
  );

  return (
    <View style={[styles.row, !last && styles.divider]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[title, detail, meta].filter(Boolean).join(", ")}
          onPress={onPress}
          style={({ pressed }) => [styles.press, pressed && styles.pressed]}
        >
          {content}
          {!actionLabel ? <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} /> : null}
        </Pressable>
      ) : (
        <View style={styles.press}>{content}</View>
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
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  press: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2 },
  pressed: { opacity: 0.7 },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  meta: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  action: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.danger },
  accent: { color: colors.accent },
});
