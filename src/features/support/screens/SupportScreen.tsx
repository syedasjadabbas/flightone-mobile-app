import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Button, Card, EmptyState, Notice, PageHeader, Screen, Segmented, SectionLabel, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import {
  useCreateConversationMutation,
  useMyEscalationsQuery,
  useRequestEscalationMutation,
  type EscalationTrigger,
} from "../api/escalationsApi";
import { CaseRow, FaqRow, isClosedCase } from "../components/SupportParts";
import { TRIGGER_OPTIONS } from "../lib/caseContent";
import { SUPPORT_TOPICS } from "../lib/helpTopics";

type Tab = "help" | "case" | "mine";
type IconName = keyof typeof Ionicons.glyphMap;

const TOPIC_ICON: Record<string, IconName> = {
  booking: "airplane-outline",
  payment: "card-outline",
  refunds: "receipt-outline",
  visa: "document-text-outline",
  corporate: "briefcase-outline",
  special: "accessibility-outline",
};
const FAQ_COUNT = SUPPORT_TOPICS.reduce((n, t) => n + t.faqs.length, 0);

/** Support: answers (static, same as web), open a case with a consultant, your cases. */
export function SupportScreen() {
  const [tab, setTab] = useState<Tab>("help");
  const [flash, setFlash] = useState<string | null>(null);
  const { data: cases } = useMyEscalationsQuery();
  const items = cases?.items ?? [];
  const count = items.length;
  const open = items.filter((c) => !isClosedCase(c.status)).length;
  const resolved = items.filter((c) => c.status === "RESOLVED").length;

  const go = (t: Tab) => {
    if (t !== "mine") setFlash(null);
    setTab(t);
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Support" }} />
      <PageHeader
        icon="chatbubbles-outline"
        tint="blue"
        subtitle="Find a quick answer, or hand your question to a FlightOne consultant."
        stats={[
          { value: open, label: "Open cases" },
          { value: resolved, label: "Resolved" },
          { value: FAQ_COUNT, label: "Answers" },
        ]}
      />
      <Segmented<Tab>
        options={[
          { value: "help", label: "Answers" },
          { value: "case", label: "New case" },
          { value: "mine", label: "My cases", count: count || undefined },
        ]}
        value={tab}
        onChange={go}
      />
      {tab === "help" ? <HelpTab onOpenCase={() => go("case")} /> : null}
      {tab === "case" ? (
        <CaseForm
          onOpened={(text) => {
            setFlash(text);
            setTab("mine");
          }}
        />
      ) : null}
      {tab === "mine" ? (
        <>
          {flash ? <Notice tone="success" message={flash} /> : null}
          <MyCases onOpen={() => go("case")} />
        </>
      ) : null}
    </Screen>
  );
}

function ConsultantCard({ onOpenCase }: { onOpenCase: () => void }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroHead}>
        <View style={styles.heroIcon}>
          <Ionicons name="headset-outline" size={22} color="#fff" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Talk to a consultant</Text>
          <Text style={styles.heroBody}>A real person reviews your case. Your Ava chat is shared, so no need to repeat yourself.</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button label="Chat with Ava" variant="ghost" style={styles.heroGhost} onPress={() => router.navigate("/ava")} />
        <Button label="Open a case" variant="accent" style={styles.flex} onPress={onOpenCase} />
      </View>
    </View>
  );
}

function HelpTab({ onOpenCase }: { onOpenCase: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const topics = SUPPORT_TOPICS.map((topic) => ({
    topic,
    faqs: topic.faqs.filter((f) => !q || `${f.q} ${f.a}`.toLowerCase().includes(q)),
  })).filter((t) => t.faqs.length);

  return (
    <>
      <ConsultantCard onOpenCase={onOpenCase} />
      <TextField
        label="Search answers"
        hideLabel
        icon="search"
        value={query}
        onChangeText={setQuery}
        placeholder="Refund, baggage, visa…"
        autoCorrect={false}
        returnKeyType="search"
      />
      {topics.length ? (
        topics.map(({ topic, faqs }) => (
          <Card key={topic.id} title={topic.title} subtitle={topic.desc} icon={TOPIC_ICON[topic.id] ?? "help-circle-outline"} tint="blue">
            <View>
              {faqs.map((f, i) => {
                const id = `${topic.title}:${f.q}`;
                return (
                  <FaqRow
                    key={id}
                    q={f.q}
                    a={f.a}
                    expanded={open === id || Boolean(q)}
                    onToggle={() => setOpen(open === id ? null : id)}
                    last={i === faqs.length - 1}
                  />
                );
              })}
            </View>
          </Card>
        ))
      ) : (
        <EmptyState
          icon="search-outline"
          title="No answers match"
          body={`Nothing matches "${query.trim()}". A consultant can help with anything not covered here.`}
          actionLabel="Open a case"
          onAction={onOpenCase}
        />
      )}
    </>
  );
}

/** Same flow as web: create a conversation, then request an escalation on it. */
function CaseForm({ onOpened }: { onOpened: (message: string) => void }) {
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
      const text = `Case ${ticket.id.slice(-8).toUpperCase()} opened. A consultant will pick it up.`;
      setMessage({ tone: "success", text });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onOpened(text);
    } catch (err) {
      setMessage({ tone: "error", text: formatApiError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Talk to a consultant" subtitle="Tell us what's going on and we'll take it from here." icon="headset-outline" tint="blue">
      <ChoiceRow label="Topic" options={TRIGGER_OPTIONS} value={trigger} onChange={setTrigger} />
      <TextField
        label="Booking reference (optional)"
        icon="pricetag-outline"
        value={bookingId}
        onChangeText={setBookingId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.noteWrap}>
        <TextField
          label="What do you need?"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          placeholder="Describe the issue, dates and anything you've already tried."
          style={styles.textarea}
        />
        <Text style={styles.counter}>{note.length}/1000</Text>
      </View>
      {message ? <Notice tone={message.tone} message={message.text} /> : null}
      <Button label="Open case" onPress={submit} loading={busy} />
      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.inkFaint} />
        <Text style={[styles.privacyText, styles.flex]}>
          {"Your Ava conversation history is shared with the consultant so you don't have to repeat yourself."}
        </Text>
      </View>
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
      <EmptyState
        icon="chatbubbles-outline"
        tint="blue"
        title="No cases yet"
        body="When you open a case, you can follow its progress and the conversation here."
        actionLabel="Open a case"
        onAction={onOpen}
      />
    );
  }
  const active = data.items.filter((c) => !isClosedCase(c.status));
  const closed = data.items.filter((c) => isClosedCase(c.status));
  return (
    <>
      {active.length ? (
        <>
          <SectionLabel>{`In progress · ${active.length}`}</SectionLabel>
          <View style={styles.list}>
            {active.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </View>
        </>
      ) : null}
      {closed.length ? (
        <>
          <SectionLabel>{`Closed · ${closed.length}`}</SectionLabel>
          <View style={styles.list}>
            {closed.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: space.sm },
  list: { gap: space.sm },

  hero: { backgroundColor: colors.night, borderRadius: radius.md + 8, padding: space.lg, gap: space.lg },
  heroHead: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: fonts.display, fontSize: 18, color: "#fff" },
  heroBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.72)", marginTop: 2 },
  heroGhost: { flex: 1, backgroundColor: "#fff", borderColor: "#fff" },

  noteWrap: { gap: 4 },
  textarea: { minHeight: 120, textAlignVertical: "top", paddingTop: space.md },
  counter: { alignSelf: "flex-end", fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  privacy: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  privacyText: { ...type.bodySoft, fontSize: 13, lineHeight: 18 },
});
