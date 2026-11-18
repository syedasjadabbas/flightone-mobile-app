import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import { CASE_STEPS, caseProgress } from "../lib/caseProgress";

/** Submitted → Checking fare rules → Processing → Refunded (same tracker as web). */
export function CaseProgressBar({ status }: { status: string }) {
  const p = caseProgress(status);
  if (p.kind === "none") return null;
  if (p.kind === "halted") return <Text style={[type.label, { color: colors.danger }]}>{p.label}</Text>;
  return (
    <View style={styles.row} accessibilityLabel={`Progress: ${p.currentLabel ?? (p.current != null ? CASE_STEPS[p.current] : "Refunded")}`}>
      {CASE_STEPS.map((label, i) => {
        const done = i < p.done;
        const current = p.current === i;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.bar, done && styles.done, current && styles.current]} />
            <Text style={[styles.label, (done || current) && styles.labelOn]} numberOfLines={2}>
              {current && p.currentLabel ? p.currentLabel : label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs },
  step: { flex: 1, gap: 4 },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.bgGlow },
  done: { backgroundColor: colors.success },
  current: { backgroundColor: colors.accent },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  labelOn: { color: colors.ink, fontFamily: fonts.bodyMedium },
});
