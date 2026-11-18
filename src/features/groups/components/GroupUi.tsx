import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TINT, type TintName } from "@/core/components";
import { colors, fonts, radius, space } from "@/core/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

/** Small rounded status tag ("Submitted", "Organizer"). */
export function StatusTag({ label, tint = "blue" }: { label: string; tint?: TintName }) {
  const t = TINT[tint];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.tagText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** First letters of a name (or email) in a round tinted badge. */
export function Initials({ name, tint = "teal", size = 36 }: { name: string; tint?: TintName; size?: number }) {
  const t = TINT[tint];
  const letters =
    name
      .replace(/@.*$/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <View style={[styles.initials, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }]}>
      <Text style={[styles.initialsText, { color: t.fg, fontSize: size * 0.38 }]}>{letters}</Text>
    </View>
  );
}

/** Compact pill in a card header that opens / closes a form ("Add", "Invite"). */
export function HeaderToggle({ open, label, icon = "add", onPress }: { open: boolean; label: string; icon?: IconName; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? `Close ${label.toLowerCase()}` : label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.toggleBtn, open && styles.toggleOpen, pressed && styles.pressed]}
    >
      <Ionicons name={open ? "close" : icon} size={15} color={open ? colors.inkSoft : colors.accent} />
      <Text style={[styles.toggleText, open && styles.toggleTextOpen]}>{open ? "Close" : label}</Text>
    </Pressable>
  );
}

/**
 * List line: leading badge/avatar, title + detail, optional status tag and a
 * small trailing text action. Tappable (with chevron) when `onPress` is set.
 */
export function Row({
  leading,
  title,
  detail,
  tag,
  onPress,
  actionLabel,
  onAction,
  last = false,
}: {
  leading?: ReactNode;
  title: string;
  detail?: string | null;
  tag?: { label: string; tint: TintName } | null;
  onPress?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  last?: boolean;
}) {
  const body = (
    <>
      {leading}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
    </>
  );
  const trailing = (
    <View style={styles.rowEnd}>
      {tag ? <StatusTag label={tag.label} tint={tag.tint} /> : null}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel} ${title}`} onPress={onAction} hitSlop={10}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <View style={[styles.row, !last && styles.divider]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[title, detail, tag?.label].filter(Boolean).join(", ")}
          onPress={onPress}
          style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
        >
          {body}
          {trailing}
          <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
        </Pressable>
      ) : (
        <View style={styles.rowMain}>
          {body}
          {trailing}
        </View>
      )}
    </View>
  );
}

/** Round icon badge used as a row's leading element. */
export function IconBadge({ icon, tint = "teal", size = 36 }: { icon: IconName; tint?: TintName; size?: number }) {
  const t = TINT[tint];
  return (
    <View style={[styles.iconBadge, { width: size, height: size, backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={size * 0.48} color={t.fg} />
    </View>
  );
}

/** Small heading that splits a long form into steps. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.formTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Label + switch, full-row height for easy tapping. */
export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 140 },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 11 },
  initials: { alignItems: "center", justifyContent: "center" },
  initialsText: { fontFamily: fonts.bodyBold },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleOpen: { backgroundColor: colors.bg },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },
  toggleTextOpen: { color: colors.inkSoft },
  row: { minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowMain: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  rowEnd: { alignItems: "flex-end", gap: 6 },
  action: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.danger },
  iconBadge: { borderRadius: 11, alignItems: "center", justifyContent: "center" },
  formSection: { gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  formTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44, gap: space.md },
  switchLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
});

/** Tag for a desk request's status (group quote or event enquiry). */
export function requestTag(status: string): { label: string; tint: TintName } {
  if (status === "IN_REVIEW") return { label: "In review", tint: "amber" };
  if (status === "CANCELLED") return { label: "Cancelled", tint: "slate" };
  if (status === "SUBMITTED") return { label: "Submitted", tint: "blue" };
  const s = status.toLowerCase().replace(/_/g, " ");
  return { label: s.charAt(0).toUpperCase() + s.slice(1), tint: "blue" };
}

/** "2027-01-15…" → "15 Jan 2027" (local day, no time-zone shift). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
