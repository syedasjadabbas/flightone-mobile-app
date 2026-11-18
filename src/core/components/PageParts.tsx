import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import { TINT, type TintName } from "./tints";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Top of a feature page: icon badge, one-line purpose, and up to three
 * headline numbers (e.g. "3 · Open cases").
 */
export function PageHeader({
  icon,
  tint = "blue",
  title,
  subtitle,
  stats,
}: {
  icon: IconName;
  tint?: TintName;
  title?: string;
  subtitle: string;
  stats?: { value: string | number; label: string }[];
}) {
  const t = TINT[tint];
  return (
    <View style={styles.header}>
      <View style={styles.headRow}>
        <View style={[styles.badge, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={24} color={t.fg} />
        </View>
        <View style={styles.flex}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {stats?.length ? (
        <View style={styles.stats}>
          {stats.slice(0, 3).map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
              <Text style={styles.statValue} numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** iOS-style segmented switch for 2–4 views of one list. Counts are optional. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.count != null ? `${o.label}, ${o.count}` : o.label}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={[styles.segBtn, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
            {o.count != null ? (
              <View style={[styles.count, on && styles.countOn]}>
                <Text style={[styles.countText, on && styles.countTextOn]}>{o.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small uppercase label above a group of cards or rows. */
export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 8,
    padding: space.lg,
    gap: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.06,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  badge: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  stats: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: space.md },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: space.xs },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  statValue: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.inkSoft },

  segment: { flexDirection: "row", backgroundColor: "#e6ebf1", borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 38, borderRadius: radius.pill, paddingHorizontal: 6 },
  segOn: { backgroundColor: colors.card, shadowColor: "#0b1219", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  segTextOn: { color: colors.ink },
  count: { minWidth: 20, paddingHorizontal: 5, height: 18, borderRadius: 9, backgroundColor: "rgba(11,18,25,0.08)", alignItems: "center", justifyContent: "center" },
  countOn: { backgroundColor: colors.accent },
  countText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.inkSoft },
  countTextOn: { color: "#fff" },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: space.xs, marginTop: space.xs },
  section: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint },
});
