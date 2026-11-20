import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { ActionMenu, Card, SectionLabel, TINT, type MenuAction, type TintName } from "@/core/components";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

/** Light tap feedback; never throws (web / unsupported devices). */
export function hapticTap() {
  void Haptics.selectionAsync().catch(() => {});
}
export function hapticSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** "Sara Khan" → "SK". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** "2015-03-09…" → "9 Mar 2015" (falls back to the raw date). */
export function formatDay(iso: string | null | undefined) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Small coloured uppercase tag using the shared tint pairs. */
export function ToneTag({ label, tint = "blue", icon }: { label: string; tint?: TintName; icon?: IconName }) {
  const t = TINT[tint];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={10} color={t.fg} /> : null}
      <Text style={[type.tag, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A card that holds a list of rows (no inner gap; rows draw their own dividers). */
export function ListCard({ children }: { children: ReactNode }) {
  return <Card style={styles.listCard}>{children}</Card>;
}

/** Uppercase label + a list card, kept tight together. */
export function ListGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <SectionLabel>{label}</SectionLabel>
      <ListCard>{children}</ListCard>
    </View>
  );
}

/**
 * Saved-item row: initials or icon avatar, title (+ tags), one detail line,
 * and row actions behind a "⋯" menu.
 */
export function ItemRow({
  title,
  detail,
  avatar,
  tint = "blue",
  tags,
  actions,
  menuTitle,
  right,
  last = false,
}: {
  title: string;
  detail?: string | null;
  avatar: { initials: string } | { icon: IconName };
  tint?: TintName;
  tags?: ReactNode;
  actions?: MenuAction[];
  menuTitle?: string;
  right?: ReactNode;
  last?: boolean;
}) {
  const t = TINT[tint];
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={[styles.avatar, { backgroundColor: t.bg }]}>
        {"icon" in avatar ? (
          <Ionicons name={avatar.icon} size={18} color={t.fg} />
        ) : (
          <Text style={[styles.initials, { color: t.fg }]}>{avatar.initials}</Text>
        )}
      </View>
      <View style={styles.text}>
        <View style={styles.titleLine}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {tags}
        </View>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {right}
      {actions?.length ? <ActionMenu title={menuTitle ?? title} actions={actions} /> : null}
    </View>
  );
}

/** Dashed "+ Add …" card that opens the add form in place. */
export function AddButton({ label, detail, onPress, icon = "add" }: { label: string; detail?: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [styles.add, pressed && styles.pressed]}
    >
      <View style={styles.addIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={styles.addLabel}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
    </Pressable>
  );
}

/** The opened add form: a titled card with a close (×) button that collapses it. */
export function FormCard({
  title,
  subtitle,
  icon,
  tint,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  tint?: TintName;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      icon={icon}
      tint={tint}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Close form" hitSlop={10} onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={18} color={colors.inkSoft} />
        </Pressable>
      }
    >
      {children}
    </Card>
  );
}

/** Two fields side by side; `narrow` fixes the first one's width (codes, short values). */
export function FieldPair({ first, second, narrow }: { first: ReactNode; second: ReactNode; narrow?: number }) {
  return (
    <View style={styles.pair}>
      <View style={narrow ? { width: narrow } : styles.flex}>{first}</View>
      <View style={styles.flex}>{second}</View>
    </View>
  );
}

/** Small stat tile (value + uppercase label). */
export function StatTile({ value, label, icon, tint = "blue" }: { value: string | number; label: string; icon: IconName; tint?: TintName }) {
  const t = TINT[tint];
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={15} color={t.fg} />
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "center",
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  listCard: { gap: 0, paddingVertical: space.xs },
  group: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingVertical: space.sm + 2 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  avatar: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.4 },
  text: { flex: 1, gap: 2 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md + 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(10, 134, 192, 0.35)",
    backgroundColor: colors.card,
  },
  addIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  addLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accent },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  pair: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  tile: {
    flex: 1,
    gap: 2,
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    shadowColor: "#0b1219",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  tileIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  tileValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint },
});
