import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { TINT, type TintName } from "@/core/components";
import { colors, fonts, radius, shadow, space } from "@/core/theme/tokens";
import type { EscalationStatus, EscalationTicket } from "../api/escalationsApi";
import { escalationStatusLabel, triggerLabel } from "../lib/caseContent";

type IconName = keyof typeof Ionicons.glyphMap;

export function isClosedCase(status: EscalationStatus) {
  return status === "RESOLVED" || status === "CANCELLED";
}

export function caseRef(id: string) {
  return id.slice(-8).toUpperCase();
}

export function statusTint(status: EscalationStatus): TintName {
  switch (status) {
    case "RESOLVED":
      return "green";
    case "CANCELLED":
      return "slate";
    case "OPEN":
      return "amber";
    default:
      return "blue";
  }
}

/** Topic icon for a case trigger. */
export function triggerIcon(trigger: string): IconName {
  switch (trigger) {
    case "REFUND_DISPUTE":
      return "receipt-outline";
    case "VISA_UNCERTAIN":
      return "document-text-outline";
    case "MEDICAL_ASSISTANCE":
    case "MEDICAL":
      return "medkit-outline";
    case "SPECIAL_SERVICE_REQUEST":
    case "SSR":
      return "accessibility-outline";
    case "COMPLEX_ITINERARY":
      return "git-network-outline";
    case "JOURNEY_DISRUPTION":
      return "warning-outline";
    case "VIP":
    case "VIP_BOOKING":
      return "star-outline";
    case "OTHER":
      return "help-circle-outline";
    default:
      return "airplane-outline";
  }
}

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

/** One compact case line: topic icon, topic, ref · date, status tag. */
export function CaseRow({ c }: { c: EscalationTicket }) {
  const tint = statusTint(c.status);
  const t = TINT[tint];
  const meta = `#${caseRef(c.id)} · opened ${new Date(c.createdAt).toLocaleDateString()}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${triggerLabel(c.trigger)}, ${escalationStatusLabel(c.status)}, ${meta}`}
      onPress={() => router.push({ pathname: "/support/[id]", params: { id: c.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={triggerIcon(c.trigger)} size={18} color={t.fg} />
      </View>
      <View style={styles.body}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {triggerLabel(c.trigger)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.right}>
        <TintTag label={escalationStatusLabel(c.status)} tint={tint} />
        <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
      </View>
    </Pressable>
  );
}

/** Expandable question row with a rotating chevron. */
export function FaqRow({ q, a, expanded, onToggle, last }: { q: string; a: string; expanded: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={q}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        onToggle();
      }}
      style={[styles.faq, !last && styles.faqDivider]}
    >
      <View style={styles.faqHead}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={expanded ? colors.accent : colors.inkFaint} />
      </View>
      {expanded ? <Text style={styles.faqA}>{a}</Text> : null}
    </Pressable>
  );
}

/** Chat bubble: the traveller on the right, Ava / agent on the left. */
export function Bubble({ mine, author, text, time }: { mine: boolean; author: string; text: string; time?: string }) {
  return (
    <View style={[styles.bubbleWrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
      {!mine ? (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={13} color={colors.accent} />
        </View>
      ) : null}
      <View style={styles.bubbleCol}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{text}</Text>
        </View>
        <Text style={[styles.bubbleMeta, mine && styles.metaMine]}>{[author, time].filter(Boolean).join(" · ")}</Text>
      </View>
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
  right: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "48%" },

  faq: { paddingVertical: space.md, gap: space.sm },
  faqDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  faqHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  faqQ: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.ink },
  faqA: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },

  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  wrapMine: { justifyContent: "flex-end" },
  wrapTheirs: { justifyContent: "flex-start" },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  bubbleCol: { maxWidth: "82%", gap: 3 },
  bubble: { borderRadius: 18, paddingHorizontal: space.md, paddingVertical: 10 },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.bg, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  bubbleTextMine: { color: "#fff" },
  bubbleMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginHorizontal: 4 },
  metaMine: { textAlign: "right" },

  tlRow: { flexDirection: "row", gap: space.md },
  tlRail: { width: 14, alignItems: "center" },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 4 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 },
  tlBody: { flex: 1, gap: 1 },
  tlBodyGap: { paddingBottom: space.lg },
  tlTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  tlWhen: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
});
