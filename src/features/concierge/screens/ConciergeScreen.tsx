import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Button, Card, EmptyState, Notice, PageHeader, Screen, Segmented, SectionLabel, TINT, type TintName } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import { ToneTag, type Tone } from "@/features/vault/components/ToneTag";
import {
  useConciergeActivityQuery,
  useConciergeKillSwitchMutation,
  useConciergeRulesQuery,
  useDisableConciergeRuleMutation,
  useEnableConciergeRuleMutation,
  type ConciergeExecution,
  type ConciergeRule,
  type ConciergeTrigger,
} from "../api/conciergeApi";
import { RuleForm } from "../components/RuleForm";
import {
  CONCIERGE_ACTION_LABELS,
  CONCIERGE_TRIGGER_LABELS,
  conciergeStatusLabel,
  conciergeStatusTone,
  formatConciergeBudget,
} from "../lib/conciergeDisplay";

type IconName = keyof typeof Ionicons.glyphMap;

const TRIGGER_ICON: Record<ConciergeTrigger, { icon: IconName; tint: TintName }> = {
  DELAY: { icon: "time-outline", tint: "amber" },
  CANCELLED: { icon: "close-circle-outline", tint: "rose" },
  DISRUPTION: { icon: "warning-outline", tint: "violet" },
  REBOOK_OPPORTUNITY: { icon: "swap-horizontal-outline", tint: "teal" },
};

const STATUS_TONE: Record<ReturnType<typeof conciergeStatusTone>, Tone> = { default: "success", warn: "warn", muted: "neutral" };
const STATUS_ICON: Record<ReturnType<typeof conciergeStatusTone>, { icon: IconName; tint: TintName }> = {
  default: { icon: "checkmark-done-outline", tint: "green" },
  warn: { icon: "alert-circle-outline", tint: "amber" },
  muted: { icon: "remove-circle-outline", tint: "slate" },
};

const SAFEGUARDS = ["Never tickets or charges on its own", "Payment and one-time codes still need you", "Corporate approval still applies"];

function RuleRow({ r, last, busy, onToggle }: { r: ConciergeRule; last: boolean; busy: boolean; onToggle: () => void }) {
  const ic = TRIGGER_ICON[r.trigger] ?? { icon: "flash-outline" as const, tint: "violet" as const };
  const t = TINT[ic.tint];
  return (
    <View style={[styles.rule, !last && styles.divider]}>
      <View style={[styles.badge, { backgroundColor: r.enabled ? t.bg : TINT.slate.bg }]}>
        <Ionicons name={ic.icon} size={18} color={r.enabled ? t.fg : TINT.slate.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.title, !r.enabled && styles.muted]}>{r.name}</Text>
        <Text style={styles.detail}>
          {CONCIERGE_TRIGGER_LABELS[r.trigger]}
          {r.thresholdMinutes ? ` after ${Math.round(r.thresholdMinutes / 60)}h` : ""} → {CONCIERGE_ACTION_LABELS[r.action]}
        </Text>
        <View style={styles.tags}>
          <ToneTag label={r.enabled ? "Active" : "Paused"} tone={r.enabled ? "success" : "neutral"} />
          <ToneTag label={`Up to ${formatConciergeBudget(r.maxAdditionalMinor, r.currency)}`} tone="info" icon="wallet-outline" />
        </View>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.accent} style={styles.switch} />
      ) : (
        <Switch
          accessibilityLabel={`${r.enabled ? "Pause" : "Turn on"} ${r.name}`}
          value={r.enabled}
          onValueChange={onToggle}
          trackColor={{ true: "#6a4bd1", false: "#d5dbe3" }}
          thumbColor="#fff"
          style={styles.switch}
        />
      )}
    </View>
  );
}

function ActivityRow({ e, last }: { e: ConciergeExecution; last: boolean }) {
  const tone = conciergeStatusTone(e.status);
  const ic = STATUS_ICON[tone];
  const t = TINT[ic.tint];
  return (
    <View style={[styles.rule, !last && styles.divider]}>
      <View style={[styles.badge, { backgroundColor: t.bg }]}>
        <Ionicons name={ic.icon} size={18} color={t.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>{conciergeStatusLabel(e.status)}</Text>
        {e.reason ? <Text style={styles.detail}>{e.reason}</Text> : null}
        <View style={styles.tags}>
          <Text style={styles.time}>{new Date(e.createdAt).toLocaleString()}</Text>
          {e.extraMinor ? <ToneTag label={`Extra ${formatConciergeBudget(e.extraMinor)}`} tone={STATUS_TONE[tone]} /> : null}
        </View>
      </View>
    </View>
  );
}

/** Travel Concierge: rules that watch your trips and act on disruptions — never tickets or pays on their own. */
export function ConciergeScreen() {
  const [tab, setTab] = useState<"rules" | "activity">("rules");
  const { data: rules, error } = useConciergeRulesQuery();
  const { data: activity, error: activityError, refetch: refetchActivity } = useConciergeActivityQuery();
  const [kill, killState] = useConciergeKillSwitchMutation();
  const [disable] = useDisableConciergeRuleMutation();
  const [enable] = useEnableConciergeRuleMutation();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const items = rules?.items ?? [];
  const active = items.filter((r) => r.enabled).length;
  const events = activity?.items ?? [];

  const pauseAll = async () => {
    if (!(await confirmAction("Pause all rules?", "Concierge will stop acting on every rule until you turn them back on.", "Pause all"))) return;
    try {
      const r = await kill().unwrap();
      setFlash({ tone: "success", text: `All rules paused (${r.disabledCount} disabled).` });
    } catch (err) {
      setFlash({ tone: "error", text: formatApiError(err) });
    }
  };

  const toggle = (r: ConciergeRule) => {
    void Haptics.selectionAsync().catch(() => {});
    setToggling(r.id);
    (r.enabled ? disable(r.id) : enable(r.id))
      .unwrap()
      .catch((err: unknown) => setFlash({ tone: "error", text: formatApiError(err) }))
      .finally(() => setToggling(null));
  };

  const openForm = () => {
    setFlash(null);
    setShowForm(true);
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Travel Concierge" }} />
      <PageHeader
        icon="sparkles"
        tint="violet"
        subtitle="Rules that watch your trips and step in when a flight is delayed or cancelled."
        stats={[
          { value: active, label: "Active" },
          { value: items.length - active, label: "Paused" },
          { value: events.length, label: "Recent actions" },
        ]}
      />

      <View style={styles.safe}>
        {SAFEGUARDS.map((s) => (
          <View key={s} style={styles.safeRow}>
            <Ionicons name="shield-checkmark" size={15} color="#6a4bd1" />
            <Text style={styles.safeText}>{s}</Text>
          </View>
        ))}
      </View>

      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}
      {error ? <Notice message={formatApiError(error, "Concierge is unavailable right now.")} /> : null}

      <Segmented
        options={[
          { value: "rules", label: "Rules", count: items.length },
          { value: "activity", label: "Activity", count: events.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "rules" ? (
        <>
          {showForm ? (
            <RuleForm
              onCancel={() => setShowForm(false)}
              onCreated={(name) => {
                setShowForm(false);
                setFlash({ tone: "success", text: `"${name}" is on.` });
              }}
            />
          ) : items.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a rule"
              onPress={openForm}
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={20} color={colors.onBtn} />
              <Text style={styles.addText}>Add a rule</Text>
            </Pressable>
          ) : null}

          {items.length ? (
            <View style={styles.group}>
              <SectionLabel
                right={
                  active ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Pause all rules" onPress={pauseAll} disabled={killState.isLoading} hitSlop={10} style={styles.pauseAll}>
                      {killState.isLoading ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons name="pause-circle-outline" size={16} color={colors.danger} />
                      )}
                      <Text style={styles.pauseText}>Pause all</Text>
                    </Pressable>
                  ) : undefined
                }
              >
                Your rules
              </SectionLabel>
              <Card style={styles.list}>
                {items.map((r, i) => (
                  <RuleRow key={r.id} r={r} last={i === items.length - 1} busy={toggling === r.id} onToggle={() => toggle(r)} />
                ))}
              </Card>
            </View>
          ) : !showForm && (rules || error) ? (
            <EmptyState
              icon="sparkles-outline"
              tint="violet"
              title="No rules yet"
              body="Add a rule like “rebook if my flight is delayed over 2 hours” and Concierge will watch your trips."
              actionLabel="Add a rule"
              onAction={openForm}
            />
          ) : null}
        </>
      ) : activityError ? (
        <>
          <Notice message={formatApiError(activityError, "Activity unavailable.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetchActivity()} />
        </>
      ) : events.length ? (
        <View style={styles.group}>
          <SectionLabel>Recent activity</SectionLabel>
          <Card style={styles.list}>
            {events.map((e, i) => (
              <ActivityRow key={e.id} e={e} last={i === events.length - 1} />
            ))}
          </Card>
        </View>
      ) : !activity ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <EmptyState
          icon="pulse-outline"
          tint="violet"
          title="No activity yet"
          body="Concierge acts only when a watched trip is disrupted."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  pressed: { opacity: 0.85 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  safe: { backgroundColor: "#efeafd", borderRadius: radius.md, padding: space.md, gap: 6 },
  safeRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  safeText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: "#4a3596" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.btn,
  },
  addText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
  group: { gap: space.sm },
  pauseAll: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: space.xs },
  pauseText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.danger },
  list: { paddingVertical: space.xs, gap: 0 },
  rule: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingVertical: space.md },
  badge: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  muted: { color: colors.inkSoft },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.xs, marginTop: 2 },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginRight: space.xs },
  switch: { marginTop: 4 },
});
