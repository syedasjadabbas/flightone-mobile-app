import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import { TINT, type TintName } from "./tints";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * White card with a soft shadow (`.fo-ui-card`). Optional header: icon badge,
 * title, subtitle and a trailing element (a link or tag).
 */
export function Card({
  children,
  style,
  title,
  subtitle,
  icon,
  tint = "blue",
  right,
}: {
  children?: ReactNode;
  style?: ViewStyle;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  tint?: TintName;
  right?: ReactNode;
}) {
  const t = TINT[tint];
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.head}>
          {icon ? (
            <View style={[styles.badge, { backgroundColor: t.bg }]}>
              <Ionicons name={icon} size={18} color={t.fg} />
            </View>
          ) : null}
          <View style={styles.headText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
    ...shadow,
    shadowOpacity: 0.06,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  badge: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1, gap: 1 },
  title: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
});
