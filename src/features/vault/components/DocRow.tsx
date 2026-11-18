import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TINT, type TintName } from "@/core/components";
import { colors, fonts, space } from "@/core/theme/tokens";
import type { VaultDocType, VaultDocument } from "../api/types";
import { expiryDisplay, formatByteSize, vaultDocIconKind, type ExpiryTone } from "../lib/vaultFormat";
import { ToneTag, type Tone } from "./ToneTag";

type IconName = keyof typeof Ionicons.glyphMap;

const KIND_ICON: Record<ReturnType<typeof vaultDocIconKind>, { icon: IconName; tint: TintName }> = {
  passport: { icon: "id-card-outline", tint: "blue" },
  visa: { icon: "earth-outline", tint: "green" },
  ticket: { icon: "ticket-outline", tint: "teal" },
  loyalty: { icon: "star-outline", tint: "amber" },
  lock: { icon: "lock-closed-outline", tint: "slate" },
  file: { icon: "document-outline", tint: "slate" },
};

export function docTypeIcon(type: VaultDocType | string) {
  return KIND_ICON[vaultDocIconKind(type)];
}

const EXPIRY_TONE: Record<ExpiryTone, Tone> = { ok: "success", warn: "warn", danger: "danger", muted: "neutral" };

function expiryTag(expiresAt: string | null) {
  const exp = expiryDisplay(expiresAt);
  // "Expiring in 12d · 4 Jan 2026" → tag "12d left", date goes in the detail line.
  const [head, date] = exp.label.split(" · ");
  const short =
    exp.tone === "warn" ? (head ?? "").replace("Expiring in ", "") + " left" : exp.tone === "danger" ? "Expired" : exp.tone === "ok" ? "Valid" : "No expiry";
  return { tone: EXPIRY_TONE[exp.tone], short, date: date?.replace(/^Exp /, "") ?? null };
}

type Action = { label: string; icon: IconName; onPress: () => void; danger?: boolean; busy?: boolean };

/** One vault document: type icon, title, status tag, one detail line and compact actions. */
export function DocRow({
  doc,
  primary,
  actions,
  last,
}: {
  doc: VaultDocument;
  /** Tapping the row (open file / view ticket), when available. */
  primary?: Action;
  actions: Action[];
  last?: boolean;
}) {
  const { icon, tint } = docTypeIcon(doc.type);
  const t = TINT[tint];
  const exp = expiryTag(doc.expiresAt);
  const detail = [
    exp.date ? `${exp.tone === "danger" ? "Expired" : "Expires"} ${exp.date}` : null,
    doc.visaMeta?.destinationCode ? `For ${doc.visaMeta.destinationCode}` : null,
    formatByteSize(doc.byteSize),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Pressable
        accessibilityRole={primary ? "button" : undefined}
        accessibilityLabel={[doc.title, exp.short, detail, primary?.label].filter(Boolean).join(", ")}
        disabled={!primary || primary.busy}
        onPress={primary?.onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={[styles.badge, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={19} color={t.fg} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {doc.title}
          </Text>
          <View style={styles.tags}>
            <ToneTag label={exp.short} tone={exp.tone} />
            {doc.isPlatformIssued ? <ToneTag label="FlightOne" tone="info" icon="shield-checkmark" /> : null}
          </View>
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        {primary ? (
          primary.busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
          )
        ) : null}
      </Pressable>
      {actions.length ? (
        <View style={styles.actions}>
          {primary ? (
            <ActionChip label={primary.label} icon={primary.icon} onPress={primary.onPress} busy={primary.busy} />
          ) : null}
          {actions.map((a) => (
            <ActionChip key={a.label} {...a} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActionChip({ label, icon, onPress, danger, busy }: Action) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.chip, danger && styles.chipDanger, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: space.md, gap: space.sm },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  main: { flexDirection: "row", alignItems: "center", gap: space.md },
  pressed: { opacity: 0.7 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  tags: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" },
  detail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  actions: { flexDirection: "row", gap: space.sm, marginLeft: 40 + space.md, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: space.md,
    borderRadius: 999,
    backgroundColor: colors.bg,
  },
  chipDanger: { backgroundColor: colors.dangerSoft },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
