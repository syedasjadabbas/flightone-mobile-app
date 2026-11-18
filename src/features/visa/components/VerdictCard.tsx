import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Notice, SectionLabel, TINT, type TintName } from "@/core/components";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { ToneTag } from "@/features/vault/components/ToneTag";
import type { VisaAssessment, VisaCategory } from "../api/visaApi";

type IconName = keyof typeof Ionicons.glyphMap;

export const CATEGORY_LABEL: Record<VisaCategory, string> = {
  VISA_FREE: "Visa-free",
  VOA: "Visa on arrival",
  E_VISA: "e-Visa",
  EMBASSY: "Embassy visa",
  UNKNOWN: "Unknown",
};

const VERDICT: Record<VisaCategory, { headline: string; icon: IconName; tint: TintName }> = {
  VISA_FREE: { headline: "No visa needed", icon: "checkmark-circle", tint: "green" },
  VOA: { headline: "Visa on arrival", icon: "airplane", tint: "teal" },
  E_VISA: { headline: "e-Visa required", icon: "laptop-outline", tint: "blue" },
  EMBASSY: { headline: "Visa required", icon: "business", tint: "rose" },
  UNKNOWN: { headline: "We couldn't confirm", icon: "help-circle", tint: "slate" },
};

/** The answer to "Do I need a visa?" as a clear verdict, then the detail underneath. */
export function VerdictCard({ a, destination, nationality, actions }: { a: VisaAssessment; destination: string; nationality: string; actions?: ReactNode }) {
  const req = a.requirement;
  const v = VERDICT[req?.category ?? "UNKNOWN"] ?? VERDICT.UNKNOWN;
  const t = TINT[v.tint];
  const items = a.checklist?.items ?? [];
  const found = items.filter((i) => i.presentHint).length;
  const nat = a.traveller.nationality || nationality;
  const days =
    req?.processingDaysMin != null
      ? `${req.processingDaysMin}${req.processingDaysMax && req.processingDaysMax !== req.processingDaysMin ? `–${req.processingDaysMax}` : ""} days`
      : null;

  return (
    <View style={styles.card}>
      <View style={[styles.band, { backgroundColor: t.bg }]}>
        <View style={[styles.icon, { backgroundColor: colors.card }]}>
          <Ionicons name={v.icon} size={26} color={t.fg} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.route, { color: t.fg }]}>
            {nat} passport → {req?.destinationCode ?? destination}
          </Text>
          <Text style={styles.headline}>{v.headline}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tags}>
          <ToneTag label={a.isFact ? "Verified rule" : "Guidance"} tone={a.isFact ? "success" : "neutral"} icon={a.isFact ? "shield-checkmark" : "information-circle"} />
          {days ? <ToneTag label={`Processing ${days}`} tone="info" icon="time-outline" /> : null}
        </View>
        <Text style={type.body}>{a.avaSummary}</Text>

        {a.heldVisa?.hasMatchingVisaOnFile ? (
          <Notice tone="success" message={`You have a matching visa on file${a.heldVisa.expiresAt ? `, valid until ${a.heldVisa.expiresAt.slice(0, 10)}` : ""}.`} />
        ) : null}
        {a.missingInputs.length ? <Notice tone="info" message={`Ava still needs: ${a.missingInputs.join(", ")}`} /> : null}

        {items.length ? (
          <View style={styles.block}>
            <SectionLabel right={<Text style={styles.count}>{found}/{items.length} on file</Text>}>Documents</SectionLabel>
            <View style={styles.bar}>
              <View style={[styles.fill, { width: `${Math.round((found / items.length) * 100)}%` }]} />
            </View>
            {items.map((i) => (
              <View key={i.item} style={styles.check}>
                <Ionicons
                  name={i.presentHint ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={i.presentHint ? colors.success : colors.inkFaint}
                />
                <Text style={[styles.checkText, i.presentHint && styles.checkDone]}>{i.item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {req?.transit?.length ? (
          <View style={styles.block}>
            <SectionLabel>Transit</SectionLabel>
            {req.transit.map((tr) => (
              <View key={tr.destinationCode} style={styles.check}>
                <Ionicons name="swap-horizontal" size={18} color={colors.inkSoft} />
                <Text style={styles.checkText}>
                  <Text style={styles.bold}>{tr.destinationCode}</Text> · {CATEGORY_LABEL[tr.category] ?? tr.category}
                  {tr.transitNotes ? ` — ${tr.transitNotes}` : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {actions}

        {req?.confidenceNote || req?.source ? (
          <Text style={styles.foot}>
            {[req?.confidenceNote, req?.source ? `Source: ${req.source}` : null].filter(Boolean).join("  ·  ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow,
    shadowOpacity: 0.06,
  },
  band: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  icon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
  route: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  headline: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  body: { padding: space.lg, gap: space.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  block: { gap: space.sm },
  count: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: colors.bg, overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.success },
  check: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  checkDone: { color: colors.inkSoft },
  bold: { fontFamily: fonts.bodySemi },
  foot: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.inkFaint },
});
