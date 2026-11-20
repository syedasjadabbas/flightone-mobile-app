import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { TINT, type TintName } from "./tints";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Top of a feature page, kept compact so content starts high on the screen:
 * a small icon badge with a short purpose line (or a title), and headline
 * numbers as one line of text ("13 documents · 3 expiring · 0 expired").
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
  const shown = (stats ?? []).slice(0, 3);
  return (
    <View style={styles.header} accessibilityRole="header">
      <View style={[styles.badge, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <View style={styles.flex}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        {shown.length ? (
          <Text style={styles.statsLine} numberOfLines={2} accessibilityLabel={shown.map((s) => `${s.value} ${s.label}`).join(", ")}>
            {shown.map((s, i) => (
              <Text key={s.label}>
                {i > 0 ? <Text style={styles.statSep}>{"  ·  "}</Text> : null}
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}> {s.label.toLowerCase()}</Text>
              </Text>
            ))}
          </Text>
        ) : null}
      </View>
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
  header: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xs, paddingVertical: space.xs },
  badge: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  statsLine: { marginTop: 3 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  statSep: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },

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
