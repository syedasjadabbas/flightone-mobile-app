import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Button, Card, ListRow, Notice, Pill, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import {
  useConciergeActivityQuery,
  useConciergeKillSwitchMutation,
  useConciergeRulesQuery,
  useCreateConciergeRuleMutation,
  useDisableConciergeRuleMutation,
  useEnableConciergeRuleMutation,
  type ConciergeAction,
  type ConciergeTrigger,
} from "../api/conciergeApi";
import {
  CONCIERGE_ACTION_LABELS,
  CONCIERGE_TRIGGER_LABELS,
  conciergeStatusLabel,
  formatConciergeBudget,
} from "../lib/conciergeDisplay";

const TRIGGERS = Object.keys(CONCIERGE_TRIGGER_LABELS) as ConciergeTrigger[];
const ACTIONS = Object.keys(CONCIERGE_ACTION_LABELS) as ConciergeAction[];
/** Triggers that take an "after N hours" threshold (same as web). */
const TIMED = new Set<ConciergeTrigger>(["DELAY", "DISRUPTION", "REBOOK_OPPORTUNITY"]);

/** Travel Concierge: rules that watch your trips and act on disruptions — never tickets or pays on their own. */
export function ConciergeScreen() {
  const [tab, setTab] = useState<"rules" | "activity">("rules");
  const { data: rules, error } = useConciergeRulesQuery();
  const { data: activity, error: activityError, refetch: refetchActivity } = useConciergeActivityQuery();
  const [kill, killState] = useConciergeKillSwitchMutation();
  const [disable] = useDisableConciergeRuleMutation();
  const [enable] = useEnableConciergeRuleMutation();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const items = rules?.items ?? [];
  const active = items.filter((r) => r.enabled).length;

  const pauseAll = async () => {
    if (!(await confirmAction("Pause all rules?", "Concierge will stop acting on every rule until you turn them back on.", "Pause all"))) return;
    try {
      const r = await kill().unwrap();
      setFlash({ tone: "success", text: `All rules paused (${r.disabledCount} disabled).` });
    } catch (err) {
      setFlash({ tone: "error", text: formatApiError(err) });
    }
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Travel Concierge" }} />
      <Card>
        <Text style={type.body}>
          Rules watch your trips and act when something goes wrong. Concierge never tickets or charges on its own — payment and
          one-time codes still need you, and corporate approval still applies.
        </Text>
        <View style={styles.stats}>
          <Text style={type.label}>{active} active</Text>
          <Text style={type.label}>{items.length - active} paused</Text>
          <Text style={type.label}>{activity?.items.length ?? 0} recent actions</Text>
        </View>
        {active ? <Button label="Pause all rules" variant="ghost" onPress={pauseAll} loading={killState.isLoading} /> : null}
      </Card>

      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}
      {error ? <Notice message={formatApiError(error, "Concierge is unavailable right now.")} /> : null}

      <View style={styles.row}>
        <Pill label="Rules" selected={tab === "rules"} onPress={() => setTab("rules")} />
        <Pill label="Activity" selected={tab === "activity"} onPress={() => setTab("activity")} />
      </View>

      {tab === "rules" ? (
        <>
          <Card>
            <Text style={type.h3}>Your rules</Text>
            {items.length ? (
              items.map((r) => (
                <View key={r.id} style={styles.rule}>
                  <View style={styles.between}>
                    <Text style={[type.label, styles.flex]}>{r.name}</Text>
                    <Tag label={r.enabled ? "Active" : "Paused"} tone={r.enabled ? "success" : "neutral"} />
                  </View>
                  <Text style={type.bodySoft}>
                    {CONCIERGE_TRIGGER_LABELS[r.trigger]}
                    {r.thresholdMinutes ? ` after ${Math.round(r.thresholdMinutes / 60)}h` : ""} → {CONCIERGE_ACTION_LABELS[r.action]}
                  </Text>
                  <Text style={type.bodySoft}>Budget up to {formatConciergeBudget(r.maxAdditionalMinor, r.currency)}</Text>
                  <Button
                    label={r.enabled ? "Pause" : "Turn on"}
                    variant="ghost"
                    onPress={() =>
                      (r.enabled ? disable(r.id) : enable(r.id))
                        .unwrap()
                        .catch((err) => setFlash({ tone: "error", text: formatApiError(err) }))
                    }
                  />
                </View>
              ))
            ) : (
              <Text style={type.bodySoft}>No rules yet. Add one below.</Text>
            )}
          </Card>
          <RuleForm onCreated={(name) => setFlash({ tone: "success", text: `"${name}" is on.` })} />
        </>
      ) : (
        <Card>
          <Text style={type.h3}>Activity</Text>
          {activityError ? (
            <>
              <Notice message={formatApiError(activityError, "Activity unavailable.")} />
              <Button label="Retry" variant="ghost" onPress={() => refetchActivity()} />
            </>
          ) : activity?.items.length ? (
            activity.items.map((e) => (
              <ListRow
                key={e.id}
                title={conciergeStatusLabel(e.status)}
                detail={[new Date(e.createdAt).toLocaleString(), e.reason, e.extraMinor ? `extra ${formatConciergeBudget(e.extraMinor)}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))
          ) : (
            <Text style={type.bodySoft}>No activity yet. Concierge acts only when a watched trip is disrupted.</Text>
          )}
        </Card>
      )}
    </Screen>
  );
}

function RuleForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [create, { isLoading }] = useCreateConciergeRuleMutation();
  const [name, setName] = useState("Rebook if delayed over 2 hours");
  const [trigger, setTrigger] = useState<ConciergeTrigger>("DELAY");
  const [hours, setHours] = useState("2");
  const [action, setAction] = useState<ConciergeAction>("PREPARE_REBOOK");
  const [budget, setBudget] = useState("20000");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const h = Number(hours);
    const b = Number(budget);
    if (name.trim().length < 2) return setError("Give the rule a name.");
    if (TIMED.has(trigger) && (!Number.isFinite(h) || h < 0 || h > 24)) return setError("Hours must be between 0 and 24.");
    if (!Number.isFinite(b) || b < 0) return setError("Enter a budget of 0 or more.");
    try {
      await create({
        name: name.trim(),
        trigger,
        thresholdMinutes: TIMED.has(trigger) ? Math.round(h * 60) : null,
        action,
        maxAdditionalMinor: Math.round(b * 100),
        currency: "PKR",
        enabled: true,
        notifyOnTrigger: true,
      }).unwrap();
      onCreated(name.trim());
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <Card>
      <Text style={type.h3}>Add a rule</Text>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={120} />
      <ChoiceRow label="When" options={TRIGGERS.map((t) => ({ value: t, label: CONCIERGE_TRIGGER_LABELS[t] }))} value={trigger} onChange={setTrigger} />
      {TIMED.has(trigger) ? <TextField label="After how many hours?" value={hours} onChangeText={setHours} keyboardType="decimal-pad" /> : null}
      <ChoiceRow label="Then" options={ACTIONS.map((a) => ({ value: a, label: CONCIERGE_ACTION_LABELS[a] }))} value={action} onChange={setAction} />
      <TextField label="Extra I'm willing to pay (PKR)" value={budget} onChangeText={setBudget} keyboardType="number-pad" />
      {error ? <Notice message={error} /> : null}
      <Button label="Save rule" onPress={submit} loading={isLoading} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  stats: { flexDirection: "row", justifyContent: "space-between" },
  rule: { gap: 4, paddingVertical: space.sm },
  between: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
});
