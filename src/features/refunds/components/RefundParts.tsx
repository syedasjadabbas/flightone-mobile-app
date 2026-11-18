import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TINT, type TintName } from "@/core/components";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { RefundCase, RefundCaseStatus } from "../api/refundsApi";
import { statusHeadline, statusIconTone } from "../lib/caseStatus";
import { kindLabel } from "../lib/refundFormat";

type IconName = keyof typeof Ionicons.glyphMap;

/** Statuses after which nothing more will happen to a case. */
export const CLOSED_STATUSES: readonly RefundCaseStatus[] = ["COMPLETED", "FAILED", "REJECTED", "NOT_ELIGIBLE"];

export function isClosed(status: RefundCaseStatus) {
  return CLOSED_STATUSES.includes(status);
}

export function caseRef(id: string) {
  return id.slice(-8).toUpperCase();
}

/** Tint + icon for a case status, so the same colour means the same thing everywhere. */
export function statusLook(status: RefundCaseStatus): { tint: TintName; icon: IconName } {
  switch (statusIconTone(status)) {
    case "ok":
      return { tint: "green", icon: "checkmark-circle" };
    case "warn":
      return status === "REQUIRES_HUMAN" ? { tint: "amber", icon: "person-circle" } : { tint: "rose", icon: "close-circle" };
    case "wait":
      return { tint: "blue", icon: "time" };
    default:
      return { tint: "slate", icon: "document-text" };
  }
}

/** Small rounded status tag coloured by tint. */
export function TintTag({ label, tint }: { label: string; tint: TintName }) {
  const t = TINT[tint];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.tagText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatusTag({ status }: { status: RefundCaseStatus }) {
  return <TintTag label={statusHeadline(status)} tint={statusLook(status).tint} />;
}

/** One compact case line: status icon, kind · ref, date, status tag. Tap to open. */
export function CaseRow({ c }: { c: RefundCase }) {
  const look = statusLook(c.status);
  const t = TINT[look.tint];
  const kind = kindLabel(c.kind);
  const title = `${kind.charAt(0)}${kind.slice(1).toLowerCase()} · #${caseRef(c.id)}`;
  const date = `Submitted ${new Date(c.createdAt).toLocaleDateString()}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kind} case ${caseRef(c.id)}, ${statusHeadline(c.status)}, ${date}`}
      onPress={() => router.push({ pathname: "/refunds/[id]", params: { id: c.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name="receipt-outline" size={18} color={t.fg} />
      </View>
      <View style={styles.body}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {date}
        </Text>
      </View>
      <View style={styles.right}>
        <StatusTag status={c.status} />
        <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
      </View>
    </Pressable>
  );
}

/** Numbered step heading for the start-a-request flow. */
export function StepHead({ n, title, done, right }: { n: number; title: string; done?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.stepHead}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.stepNum}>{n}</Text>}
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      {right}
    </View>
  );
}

/** Label on the left, value on the right; `strong` for totals. */
export function AmountRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "minus" }) {
  return (
    <View style={[styles.amountRow, strong && styles.amountTotal]}>
      <Text style={[styles.amountLabel, strong && styles.amountLabelStrong]}>{label}</Text>
      <Text style={[styles.amountValue, strong && styles.amountValueStrong, tone === "minus" && styles.minus]}>{value}</Text>
    </View>
  );
}

/** Vertical timeline: dot + connecting line, oldest first. */
export function Timeline({ items }: { items: { key: string; title: string; when: string; tint?: TintName }[] }) {
  return (
    <View>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const t = TINT[it.tint ?? "slate"];
        return (
          <View key={it.key} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: t.fg, borderColor: t.bg }]} />
              {!last ? <View style={styles.tlLine} /> : null}
            </View>
            <View style={[styles.tlBody, !last && styles.tlBodyGap]}>
              <Text style={styles.tlTitle}>{it.title}</Text>
              <Text style={styles.tlWhen}>{it.when}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 11 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.05,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
  rowMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  right: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "45%" },

  stepHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.btn, alignItems: "center", justifyContent: "center" },
  stepDotDone: { backgroundColor: colors.success },
  stepNum: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  stepTitle: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 16, color: colors.ink },

  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.md, paddingVertical: 6 },
  amountTotal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, marginTop: 4, paddingTop: space.md },
  amountLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  amountLabelStrong: { fontFamily: fonts.bodySemi, color: colors.ink },
  amountValue: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  amountValueStrong: { fontFamily: fonts.display, fontSize: 17 },
  minus: { color: colors.danger },

  tlRow: { flexDirection: "row", gap: space.md },
  tlRail: { width: 14, alignItems: "center" },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 4 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 },
  tlBody: { flex: 1, gap: 1 },
  tlBodyGap: { paddingBottom: space.lg },
  tlTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  tlWhen: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
});
