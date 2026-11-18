import { useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Button, Card, ListRow, Notice, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import {
  useAnnouncementsQuery,
  useCreatePollMutation,
  useGroupItineraryQuery,
  useGroupMembersQuery,
  useGroupQuery,
  useInviteMemberMutation,
  useLeaveGroupMutation,
  usePollsQuery,
  usePostAnnouncementMutation,
  useShareBookingMutation,
  useVoteMutation,
} from "../api/groupsApi";
import { GROUP_TYPE_LABELS } from "../lib/groupLabels";

export function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: group, isLoading, error, refetch } = useGroupQuery(groupId, { skip: !groupId });
  const [leaveGroup] = useLeaveGroupMutation();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fail = (err: unknown) => setFlash({ tone: "error", text: formatApiError(err) });

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (error || !group) {
    const forbidden = (error as { status?: number })?.status === 403;
    return (
      <Screen>
        <Notice message={forbidden ? "You're not an active member of this group. Accept your invitation first." : formatApiError(error, "Group unavailable.")} />
        {!forbidden ? <Button label="Retry" variant="ghost" onPress={() => refetch()} /> : null}
      </Screen>
    );
  }

  const role = group.myMembership?.role ?? group.myRole;
  const organizer = role === "ORGANIZER" || role === "ADMIN";

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: group.name }} />
      <Card>
        <View style={styles.between}>
          <Text style={type.h2}>{group.name}</Text>
          {organizer ? <Tag label="Organizer" tone="accent" /> : null}
        </View>
        <Text style={type.bodySoft}>{GROUP_TYPE_LABELS[group.type] ?? group.type}</Text>
        <Text style={type.label}>Invite code</Text>
        <Text style={styles.code} selectable>
          {group.inviteCode}
        </Text>
        <View style={styles.row}>
          <Button
            label="Copy"
            variant="ghost"
            style={styles.flex}
            onPress={async () => {
              await Clipboard.setStringAsync(group.inviteCode);
              setFlash({ tone: "success", text: "Invite code copied." });
            }}
          />
          <Button
            label="Share"
            variant="ghost"
            style={styles.flex}
            onPress={() => Share.share({ message: `Join "${group.name}" on FlightOne with invite code ${group.inviteCode}` }).catch(() => {})}
          />
        </View>
      </Card>
      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}
      <Members id={group.id} organizer={organizer} onError={fail} onDone={(t) => setFlash({ tone: "success", text: t })} />
      <Announcements id={group.id} organizer={organizer} onError={fail} />
      <Polls id={group.id} organizer={organizer} onError={fail} />
      <Itinerary id={group.id} onError={fail} />
      <Button
        label="Leave group"
        variant="ghost"
        onPress={async () => {
          if (!(await confirmAction("Leave this group?", "You'll lose access to its itinerary, announcements and polls.", "Leave"))) return;
          try {
            await leaveGroup(group.id).unwrap();
            router.back();
          } catch (err) {
            fail(err);
          }
        }}
      />
    </Screen>
  );
}

function Members({ id, organizer, onError, onDone }: { id: string; organizer: boolean; onError: (e: unknown) => void; onDone: (t: string) => void }) {
  const { data = [] } = useGroupMembersQuery(id);
  const [invite, { isLoading }] = useInviteMemberMutation();
  const [email, setEmail] = useState("");
  return (
    <Card>
      <Text style={type.h3}>Members ({data.filter((m) => m.status === "ACTIVE").length})</Text>
      {data.map((m) => (
        <ListRow
          key={m.id}
          title={m.displayName || m.email || "Traveller"}
          detail={[m.role.toLowerCase(), m.status === "INVITED" ? "invited" : null].filter(Boolean).join(" · ")}
        />
      ))}
      {organizer ? (
        <>
          <TextField label="Invite by email" hint="They need a FlightOne account" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button
            label="Send invite"
            variant="ghost"
            loading={isLoading}
            disabled={!email.trim()}
            onPress={async () => {
              try {
                await invite({ id, email: email.trim() }).unwrap();
                setEmail("");
                onDone("Invitation sent.");
              } catch (err) {
                onError(err);
              }
            }}
          />
        </>
      ) : null}
    </Card>
  );
}

function Announcements({ id, organizer, onError }: { id: string; organizer: boolean; onError: (e: unknown) => void }) {
  const { data = [] } = useAnnouncementsQuery(id);
  const [post, { isLoading }] = usePostAnnouncementMutation();
  const [body, setBody] = useState("");
  const send = async (emergency: boolean) => {
    if (emergency && !(await confirmAction("Send emergency broadcast?", "Every member is alerted immediately.", "Send"))) return;
    try {
      await post({ id, body: body.trim(), emergency }).unwrap();
      setBody("");
    } catch (err) {
      onError(err);
    }
  };
  return (
    <Card>
      <Text style={type.h3}>Announcements</Text>
      {data.length ? (
        data.map((a) => (
          <View key={a.id} style={[styles.note, a.isEmergency && styles.emergency]}>
            {a.isEmergency ? <Text style={[type.label, { color: colors.danger }]}>Emergency</Text> : null}
            <Text style={type.body}>{a.body}</Text>
            <Text style={type.bodySoft}>{new Date(a.createdAt).toLocaleString()}</Text>
          </View>
        ))
      ) : (
        <Text style={type.bodySoft}>No announcements yet.</Text>
      )}
      {organizer ? (
        <>
          <TextField label="New announcement" value={body} onChangeText={setBody} multiline maxLength={4000} />
          <View style={styles.row}>
            <Button label="Post" style={styles.flex} loading={isLoading} disabled={!body.trim()} onPress={() => send(false)} />
            <Button label="Emergency" variant="ghost" style={styles.flex} disabled={!body.trim()} onPress={() => send(true)} />
          </View>
        </>
      ) : null}
    </Card>
  );
}

function Polls({ id, organizer, onError }: { id: string; organizer: boolean; onError: (e: unknown) => void }) {
  const { data = [] } = usePollsQuery(id);
  const [vote] = useVoteMutation();
  const [create, { isLoading }] = useCreatePollMutation();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  return (
    <Card>
      <Text style={type.h3}>Polls</Text>
      {data.length ? (
        data.map((p) => {
          const counts = p.options.map((_, i) => Number((p.voteCounts as Record<string, number>)?.[i] ?? 0));
          const total = counts.reduce((a, b) => a + b, 0);
          return (
            <View key={p.id} style={styles.poll}>
              <Text style={type.label}>{p.question}</Text>
              {p.options.map((o, i) => (
                <Pressable
                  key={`${p.id}-${i}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: p.myOptionIndex === i }}
                  accessibilityLabel={`${o}, ${counts[i]} votes`}
                  onPress={() => vote({ id, pollId: p.id, optionIndex: i }).unwrap().catch(onError)}
                  style={[styles.option, p.myOptionIndex === i && styles.optionOn]}
                >
                  <Text style={type.body}>{o}</Text>
                  <Text style={type.bodySoft}>
                    {counts[i]}
                    {total ? ` · ${Math.round((counts[i] / total) * 100)}%` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })
      ) : (
        <Text style={type.bodySoft}>No polls yet.</Text>
      )}
      {organizer ? (
        <>
          <TextField label="Question" value={question} onChangeText={setQuestion} maxLength={500} />
          <TextField label="Options" hint="Comma separated, at least two" value={options} onChangeText={setOptions} />
          <Button
            label="Create poll"
            variant="ghost"
            loading={isLoading}
            onPress={async () => {
              const opts = options.split(",").map((s) => s.trim()).filter(Boolean);
              if (!question.trim() || opts.length < 2) return onError("Add a question and at least two options.");
              try {
                await create({ id, question: question.trim(), options: opts.slice(0, 20) }).unwrap();
                setQuestion("");
                setOptions("");
              } catch (err) {
                onError(err);
              }
            }}
          />
        </>
      ) : null}
    </Card>
  );
}

function Itinerary({ id, onError }: { id: string; onError: (e: unknown) => void }) {
  const { data } = useGroupItineraryQuery(id);
  const [share, { isLoading }] = useShareBookingMutation();
  const [bookingId, setBookingId] = useState("");
  return (
    <Card>
      <Text style={type.h3}>Shared itinerary</Text>
      {data?.items.length ? (
        data.items.map((it) => (
          <ListRow
            key={it.shareId}
            title={`${it.booking.product === "HOTEL" ? "Hotel" : "Flight"}${it.booking.route ? ` · ${it.booking.route}` : ""}`}
            detail={it.booking.status.toLowerCase()}
          />
        ))
      ) : (
        <Text style={type.bodySoft}>Nothing shared yet. Share one of your bookings so the group sees it.</Text>
      )}
      <TextField label="Your booking reference" value={bookingId} onChangeText={setBookingId} autoCapitalize="none" />
      <Button
        label="Share booking"
        variant="ghost"
        loading={isLoading}
        disabled={!bookingId.trim()}
        onPress={async () => {
          try {
            await share({ id, bookingId: bookingId.trim() }).unwrap();
            setBookingId("");
          } catch (err) {
            onError(err);
          }
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  row: { flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
  code: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 3, color: colors.ink },
  note: { gap: 2, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  emergency: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: space.sm },
  poll: { gap: space.xs, paddingVertical: space.sm },
  option: { flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: space.md },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
