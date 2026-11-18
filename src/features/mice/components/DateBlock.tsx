import { StyleSheet, Text, View } from "react-native";
import { TINT, type TintName } from "@/core/components";
import { fonts } from "@/core/theme/tokens";

/** Calendar-style day block: big day number over a short month ("14 / MAR"). */
export function DateBlock({ iso, tint = "violet", size = 46 }: { iso: string; tint?: TintName; size?: number }) {
  const d = new Date(iso);
  const valid = !Number.isNaN(d.getTime());
  const t = TINT[tint];
  return (
    <View
      style={[styles.box, { width: size, height: size + 4, backgroundColor: t.bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.month, { color: t.fg }]}>{valid ? d.toLocaleDateString([], { month: "short" }) : "—"}</Text>
      <Text style={[styles.day, { color: t.fg, fontSize: size * 0.42 }]}>{valid ? d.getDate() : "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, alignItems: "center", justifyContent: "center" },
  month: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  day: { fontFamily: fonts.display, lineHeight: 24 },
});

/** "10 Mar – 12 Mar 2027", or one date when start and end fall on the same day. */
export function dateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime())) return startIso.slice(0, 10);
  const full: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (Number.isNaN(e.getTime()) || s.toDateString() === e.toDateString()) return s.toLocaleDateString([], full);
  return `${s.toLocaleDateString([], { day: "numeric", month: "short" })} – ${e.toLocaleDateString([], full)}`;
}
