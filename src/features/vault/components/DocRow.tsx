import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActionMenu, TINT, type TintName } from "@/core/components";
import { colors, fonts, space } from "@/core/theme/tokens";
import type { VaultDocType, VaultDocument } from "../api/types";
import { expiryDisplay, vaultDocIconKind, type ExpiryTone } from "../lib/vaultFormat";
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

/** One vault document: type icon, title, a status line, and a ⋯ menu for its actions. */
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
            {detail ? (
              <Text style={[styles.detail, styles.flex]} numberOfLines={1}>
                {detail}
              </Text>
            ) : null}
          </View>
        </View>
        {primary?.busy ? <ActivityIndicator color={colors.accent} /> : null}
      </Pressable>
      <ActionMenu
        title={doc.title}
        actions={[
          ...(primary ? [{ label: primary.label, icon: primary.icon, onPress: primary.onPress }] : []),
          ...actions.map((a) => ({ label: a.label, icon: a.icon, onPress: a.onPress, destructive: a.danger })),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md },
  flex: { flex: 1 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  pressed: { opacity: 0.7 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  tags: { flexDirection: "row", alignItems: "center", gap: space.xs },
  detail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
});
