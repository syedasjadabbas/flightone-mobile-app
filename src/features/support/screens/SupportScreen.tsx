import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button, Card, Notice, Pill, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import {
  useCreateConversationMutation,
  useMyEscalationsQuery,
  useRequestEscalationMutation,
  type EscalationTrigger,
} from "../api/escalationsApi";
import { TRIGGER_OPTIONS, escalationStatusLabel, triggerLabel } from "../lib/caseContent";
import { SUPPORT_TOPICS } from "../lib/helpTopics";

type Tab = "help" | "case" | "mine";

/** Support: answers (static, same as web), open a case with a consultant, your cases. */
export function SupportScreen() {
  const [tab, setTab] = useState<Tab>("help");
  const { data: cases } = useMyEscalationsQuery();
  const count = cases?.items.length ?? 0;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Support" }} />
      <View style={styles.row}>
        <Pill label="Answers" selected={tab === "help"} onPress={() => setTab("help")} />
        <Pill label="Open a case" selected={tab === "case"} onPress={() => setTab("case")} />
        <Pill label={`My cases${count ? ` (${count})` : ""}`} selected={tab === "mine"} onPress={() => setTab("mine")} />
      </View>
      {tab === "help" ? <HelpTab onOpenCase={() => setTab("case")} /> : null}
      {tab === "case" ? <CaseForm onOpened={() => setTab("mine")} /> : null}
      {tab === "mine" ? <MyCases onOpen={() => setTab("case")} /> : null}
    </Screen>
  );
}

function HelpTab({ onOpenCase }: { onOpenCase: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  return (
    <>
      <TextField label="Search answers" value={query} onChangeText={setQuery} placeholder="Refund, baggage, visa…" />
      {SUPPORT_TOPICS.map((topic) => {
        const faqs = topic.faqs.filter((f) => !q || `${f.q} ${f.a}`.toLowerCase().includes(q));
        if (!faqs.length) return null;
        return (
          <Card key={topic.title}>
            <Text style={type.h3}>{topic.title}</Text>
            {faqs.map((f) => {
              const id = `${topic.title}:${f.q}`;
              const expanded = open === id || Boolean(q);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(open === id ? null : id)}
                  style={styles.faq}
                >
                  <Text style={type.label}>{f.q}</Text>
                  {expanded ? <Text style={type.bodySoft}>{f.a}</Text> : null}
                </Pressable>
              );
            })}
          </Card>
        );
      })}
      <Card>
        <Text style={type.bodySoft}>Didn't find it? Ava can answer trip questions right away, or a consultant can review your case.</Text>
        <View style={styles.row}>
          <Button label="Chat with Ava" variant="ghost" style={styles.flex} onPress={() => router.navigate("/ava")} />
          <Button label="Open a case" style={styles.flex} onPress={onOpenCase} />
        </View>
      </Card>
    </>
  );
}

/** Same flow as web: create a conversation, then request an escalation on it. */
function CaseForm({ onOpened }: { onOpened: () => void }) {
  const [createConversation] = useCreateConversationMutation();
  const [request] = useRequestEscalationMutation();
  const [trigger, setTrigger] = useState<EscalationTrigger>("CUSTOMER_REQUEST");
  const [bookingId, setBookingId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const submit = async () => {
    setMessage(null);
    if (!note.trim()) return setMessage({ tone: "error", text: "Tell us what you need help with." });
    setBusy(true);
    try {
      const label = TRIGGER_OPTIONS.find((o) => o.value === trigger)?.label ?? "Support";
      const convo = await createConversation({ title: `Support · ${label}` }).unwrap();
      const ticket = await request({
        conversationId: convo.id,
        trigger,
        note: note.trim(),
        ...(bookingId.trim() ? { bookingId: bookingId.trim() } : {}),
      }).unwrap();
      setNote("");
      setBookingId("");
      setMessage({ tone: "success", text: `Case ${ticket.id.slice(-8).toUpperCase()} opened. A consultant will pick it up.` });
      onOpened();
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={type.h3}>Talk to a consultant</Text>
      <ChoiceRow label="Topic" options={TRIGGER_OPTIONS} value={trigger} onChange={setTrigger} />
      <TextField label="Booking reference (optional)" value={bookingId} onChangeText={setBookingId} autoCapitalize="none" />
      <TextField label="What do you need?" value={note} onChangeText={setNote} multiline maxLength={1000} style={styles.textarea} />
      {message ? <Notice tone={message.tone} message={message.text} /> : null}
      <Button label="Open case" onPress={submit} loading={busy} />
      <Text style={type.bodySoft}>Your Ava conversation history is shared with the consultant so you don't have to repeat yourself.</Text>
    </Card>
  );
}

function MyCases({ onOpen }: { onOpen: () => void }) {
  const { data, error, refetch } = useMyEscalationsQuery();
  if (error) {
    return (
      <>
        <Notice message={formatApiError(error)} />
        <Button label="Retry" variant="ghost" onPress={() => refetch()} />
      </>
    );
  }
  if (!data?.items.length) {
    return (
      <Card>
        <Text style={type.h3}>No cases yet</Text>
        <Button label="Open a case" onPress={onOpen} />
      </Card>
    );
  }
  return (
    <Card>
      {data.items.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`${triggerLabel(c.trigger)}, ${escalationStatusLabel(c.status)}`}
          onPress={() => router.push({ pathname: "/support/[id]", params: { id: c.id } })}
          style={styles.case}
        >
          <View style={styles.between}>
            <Text style={type.label}>{triggerLabel(c.trigger)}</Text>
            <Tag label={escalationStatusLabel(c.status)} tone={c.status === "RESOLVED" ? "success" : "accent"} />
          </View>
          <Text style={type.bodySoft}>
            #{c.id.slice(-8).toUpperCase()} · opened {new Date(c.createdAt).toLocaleDateString()}
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  flex: { flex: 1 },
  faq: { gap: 4, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  textarea: { minHeight: 110, textAlignVertical: "top", paddingTop: space.md },
  case: { gap: 4, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
});
