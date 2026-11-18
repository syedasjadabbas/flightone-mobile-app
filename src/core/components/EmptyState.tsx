import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { Button } from "./Button";
import { TINT, type TintName } from "./tints";

type IconName = keyof typeof Ionicons.glyphMap;

/** Friendly "nothing here yet" block: icon, title, a line of help and an optional action. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  icon = "sparkles-outline",
  tint = "blue",
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  tint?: TintName;
}) {
  const t = TINT[tint];
  return (
    <View style={styles.box}>
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={26} color={t.fg} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
  },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  title: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.ink, textAlign: "center" },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: "center", maxWidth: 300 },
  action: { alignSelf: "stretch", marginTop: space.sm },
});
