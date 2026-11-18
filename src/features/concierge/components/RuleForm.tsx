import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, Notice, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import { useCreateConciergeRuleMutation, type ConciergeAction, type ConciergeTrigger } from "../api/conciergeApi";
import { CONCIERGE_ACTION_LABELS, CONCIERGE_TRIGGER_LABELS } from "../lib/conciergeDisplay";

const TRIGGERS = Object.keys(CONCIERGE_TRIGGER_LABELS) as ConciergeTrigger[];
const ACTIONS = Object.keys(CONCIERGE_ACTION_LABELS) as ConciergeAction[];
/** Triggers that take an "after N hours" threshold (same as web). */
export const TIMED = new Set<ConciergeTrigger>(["DELAY", "DISRUPTION", "REBOOK_OPPORTUNITY"]);

/** New concierge rule: when <trigger> (after N hours) → <action>, with a budget cap. */
export function RuleForm({ onCreated, onCancel }: { onCreated: (name: string) => void; onCancel?: () => void }) {
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

  const close = onCancel ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onCancel} hitSlop={10} style={styles.close}>
      <Ionicons name="close" size={18} color={colors.inkSoft} />
    </Pressable>
  ) : null;

  return (
    <Card title="New rule" subtitle="When something happens, Concierge does this" icon="add-circle-outline" tint="violet" right={close}>
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
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
