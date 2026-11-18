import { useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, Notice, Screen, SectionLabel, TINT, TextField } from "@/core/components";
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
  type TravelGroup,
} from "../api/groupsApi";
import { HeaderToggle, IconBadge, Initials, Row, StatusTag, shortDate } from "../components/GroupUi";
import { GROUP_TYPE_LABELS } from "../lib/groupLabels";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

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
      <Summary group={group} organizer={organizer} role={role ?? null} onFlash={setFlash} />
      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}
      <Members id={group.id} organizer={organizer} onError={fail} onDone={(t) => setFlash({ tone: "success", text: t })} />
      <Polls id={group.id} organizer={organizer} onError={fail} />
      <Announcements id={group.id} organizer={organizer} onError={fail} />
      <Itinerary id={group.id} onError={fail} />

      <SectionLabel>Group actions</SectionLabel>
      <Card style={styles.actions}>
        <Row
          leading={<IconBadge icon="share-social-outline" tint="teal" size={34} />}
          title="Share invite"
          detail="Send the invite code to someone"
          onPress={() => Share.share({ message: `Join "${group.name}" on FlightOne with invite code ${group.inviteCode}` }).catch(() => {})}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave group"
          onPress={async () => {
            if (!(await confirmAction("Leave this group?", "You'll lose access to its itinerary, announcements and polls.", "Leave"))) return;
            try {
              await leaveGroup(group.id).unwrap();
              router.back();
            } catch (err) {
              fail(err);
            }
          }}
          style={({ pressed }) => [styles.leave, pressed && styles.pressed]}
        >
          <IconBadge icon="exit-outline" tint="rose" size={34} />
          <Text style={styles.leaveText}>Leave group</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

function Summary({
  group,
  organizer,
  role,
  onFlash,
}: {
  group: TravelGroup;
  organizer: boolean;
  role: string | null;
  onFlash: (f: { tone: "success" | "error"; text: string }) => void;
}) {
  const { data: members = [] } = useGroupMembersQuery(group.id);
  const active = members.filter((m) => m.status === "ACTIVE").length;
  const invited = members.filter((m) => m.status === "INVITED").length;
  const { data: polls = [] } = usePollsQuery(group.id);
  return (
    <Card>
      <View style={styles.summaryHead}>
        <IconBadge icon="people" tint="teal" size={52} />
        <View style={styles.flexText}>
          <Text style={type.h2} numberOfLines={2}>
            {group.name}
          </Text>
          <Text style={type.bodySoft}>
            {GROUP_TYPE_LABELS[group.type] ?? group.type} · since {shortDate(group.createdAt)}
          </Text>
        </View>
        {organizer ? <StatusTag label="Organizer" tint="teal" /> : role ? <StatusTag label={titleCase(role)} tint="slate" /> : null}
      </View>
      <View style={styles.stats}>
        <Stat value={active} label="Members" />
        <Stat value={invited} label="Invited" divider />
        <Stat value={polls.length} label="Polls" divider />
      </View>
      <View style={styles.codeBox}>
        <View style={styles.flexText}>
          <Text style={styles.codeLabel}>Invite code</Text>
          <Text style={styles.code} selectable>
            {group.inviteCode}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy invite code"
          hitSlop={6}
          onPress={async () => {
            await Clipboard.setStringAsync(group.inviteCode);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onFlash({ tone: "success", text: "Invite code copied." });
          }}
          style={({ pressed }) => [styles.codeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="copy-outline" size={18} color={colors.accent} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share invite code"
          hitSlop={6}
          onPress={() => Share.share({ message: `Join "${group.name}" on FlightOne with invite code ${group.inviteCode}` }).catch(() => {})}
          style={({ pressed }) => [styles.codeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={18} color={colors.accent} />
        </Pressable>
      </View>
    </Card>
  );
}

function Stat({ value, label, divider = false }: { value: string | number; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Members({ id, organizer, onError, onDone }: { id: string; organizer: boolean; onError: (e: unknown) => void; onDone: (t: string) => void }) {
  const { data = [] } = useGroupMembersQuery(id);
  const [invite, { isLoading }] = useInviteMemberMutation();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Card
      title={`Members (${data.filter((m) => m.status === "ACTIVE").length})`}
      icon="person-outline"
      tint="teal"
      right={organizer ? <HeaderToggle open={open} label="Invite" icon="person-add-outline" onPress={() => setOpen((v) => !v)} /> : undefined}
    >
      {organizer && open ? (
        <View style={styles.form}>
          <TextField label="Invite by email" hint="They need a FlightOne account" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button
            label="Send invite"
            loading={isLoading}
            disabled={!email.trim()}
            onPress={async () => {
              try {
                await invite({ id, email: email.trim() }).unwrap();
                setEmail("");
                setOpen(false);
                onDone("Invitation sent.");
              } catch (err) {
                onError(err);
              }
            }}
          />
        </View>
      ) : null}
      {data.length ? (
        <View>
          {data.map((m, i) => {
            const name = m.displayName || m.email || "Traveller";
            const lead = m.role === "ORGANIZER" || m.role === "ADMIN";
            return (
              <Row
                key={m.id}
                last={i === data.length - 1}
                leading={<Initials name={name} tint={m.status === "INVITED" ? "slate" : "teal"} />}
                title={name}
                detail={m.displayName && m.email ? m.email : null}
                tag={
                  m.status === "INVITED"
                    ? { label: "Invited", tint: "amber" }
                    : { label: lead ? "Organizer" : titleCase(m.role), tint: lead ? "teal" : "slate" }
                }
              />
            );
          })}
        </View>
      ) : (
        <Text style={type.bodySoft}>No members yet.</Text>
      )}
    </Card>
  );
}

function Announcements({ id, organizer, onError }: { id: string; organizer: boolean; onError: (e: unknown) => void }) {
  const { data = [] } = useAnnouncementsQuery(id);
  const [post, { isLoading }] = usePostAnnouncementMutation();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const send = async (emergency: boolean) => {
    if (emergency && !(await confirmAction("Send emergency broadcast?", "Every member is alerted immediately.", "Send"))) return;
    try {
      await post({ id, body: body.trim(), emergency }).unwrap();
      setBody("");
      setOpen(false);
    } catch (err) {
      onError(err);
    }
  };
  return (
    <Card
      title="Announcements"
      icon="megaphone-outline"
      tint="amber"
      right={organizer ? <HeaderToggle open={open} label="Post" icon="create-outline" onPress={() => setOpen((v) => !v)} /> : undefined}
    >
      {organizer && open ? (
        <View style={styles.form}>
          <TextField label="New announcement" value={body} onChangeText={setBody} multiline maxLength={4000} />
          <View style={styles.row}>
            <Button label="Post" style={styles.flex} loading={isLoading} disabled={!body.trim()} onPress={() => send(false)} />
            <Button label="Emergency" variant="ghost" style={styles.flex} disabled={!body.trim()} onPress={() => send(true)} />
          </View>
        </View>
      ) : null}
      {data.length ? (
        data.map((a) => (
          <View key={a.id} style={[styles.note, a.isEmergency && styles.emergency]}>
            {a.isEmergency ? (
              <View style={styles.emergencyHead}>
                <Ionicons name="warning" size={14} color={colors.danger} />
                <Text style={[type.label, { color: colors.danger }]}>Emergency</Text>
              </View>
            ) : null}
            <Text style={type.body}>{a.body}</Text>
            <Text style={styles.small}>{new Date(a.createdAt).toLocaleString()}</Text>
          </View>
        ))
      ) : (
        <Text style={type.bodySoft}>No announcements yet.</Text>
      )}
    </Card>
  );
}

function Polls({ id, organizer, onError }: { id: string; organizer: boolean; onError: (e: unknown) => void }) {
  const { data = [] } = usePollsQuery(id);
  const [vote] = useVoteMutation();
  const [create, { isLoading }] = useCreatePollMutation();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Card
      title="Polls"
      icon="stats-chart-outline"
      tint="violet"
      right={organizer ? <HeaderToggle open={open} label="New poll" onPress={() => setOpen((v) => !v)} /> : undefined}
    >
      {organizer && open ? (
        <View style={styles.form}>
          <TextField label="Question" value={question} onChangeText={setQuestion} maxLength={500} />
          <TextField label="Options" hint="Comma separated, at least two" value={options} onChangeText={setOptions} />
          <Button
            label="Create poll"
            loading={isLoading}
            onPress={async () => {
              const opts = options.split(",").map((s) => s.trim()).filter(Boolean);
              if (!question.trim() || opts.length < 2) return onError("Add a question and at least two options.");
              try {
                await create({ id, question: question.trim(), options: opts.slice(0, 20) }).unwrap();
                setQuestion("");
                setOptions("");
                setOpen(false);
              } catch (err) {
                onError(err);
              }
            }}
          />
        </View>
      ) : null}
      {data.length ? (
        data.map((p) => {
          const counts = p.options.map((_, i) => Number((p.voteCounts as Record<string, number>)?.[i] ?? 0));
          const total = counts.reduce((a, b) => a + b, 0);
          return (
            <View key={p.id} style={styles.poll}>
              <Text style={styles.question}>{p.question}</Text>
              {p.options.map((o, i) => {
                const mine = p.myOptionIndex === i;
                const pct = total ? Math.round((counts[i] / total) * 100) : 0;
                return (
                  <Pressable
                    key={`${p.id}-${i}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: mine }}
                    accessibilityLabel={`${o}, ${counts[i]} votes${mine ? ", your vote" : ""}`}
                    onPress={() => {
                      void Haptics.selectionAsync().catch(() => {});
                      vote({ id, pollId: p.id, optionIndex: i }).unwrap().catch(onError);
                    }}
                    style={({ pressed }) => [styles.option, mine && styles.optionOn, pressed && styles.pressed]}
                  >
                    <View style={[styles.optionFill, { width: `${pct}%` }, mine && styles.optionFillOn]} />
                    <View style={styles.optionContent}>
                      <Ionicons name={mine ? "checkmark-circle" : "ellipse-outline"} size={18} color={mine ? colors.accent : colors.inkFaint} />
                      <Text style={[styles.optionText, mine && styles.optionTextOn]} numberOfLines={2}>
                        {o}
                      </Text>
                      <Text style={[styles.optionPct, mine && styles.optionTextOn]}>{pct}%</Text>
                    </View>
                  </Pressable>
                );
              })}
              <Text style={styles.small}>
                {total} {total === 1 ? "vote" : "votes"}
                {p.myOptionIndex != null ? " · tap another option to change your vote" : " · tap an option to vote"}
              </Text>
            </View>
          );
        })
      ) : (
        <Text style={type.bodySoft}>No polls yet.</Text>
      )}
    </Card>
  );
}

function Itinerary({ id, onError }: { id: string; onError: (e: unknown) => void }) {
  const { data } = useGroupItineraryQuery(id);
  const [share, { isLoading }] = useShareBookingMutation();
  const [bookingId, setBookingId] = useState("");
  const [open, setOpen] = useState(false);
  const items = data?.items ?? [];
  return (
    <Card title="Shared itinerary" icon="map-outline" tint="blue" right={<HeaderToggle open={open} label="Share" icon="share-outline" onPress={() => setOpen((v) => !v)} />}>
      {open ? (
        <View style={styles.form}>
          <TextField label="Your booking reference" value={bookingId} onChangeText={setBookingId} autoCapitalize="none" />
          <Button
            label="Share booking"
            loading={isLoading}
            disabled={!bookingId.trim()}
            onPress={async () => {
              try {
                await share({ id, bookingId: bookingId.trim() }).unwrap();
                setBookingId("");
                setOpen(false);
              } catch (err) {
                onError(err);
              }
            }}
          />
        </View>
      ) : null}
      {items.length ? (
        <View>
          {items.map((it, i) => (
            <Row
              key={it.shareId}
              last={i === items.length - 1}
              leading={<IconBadge icon={it.booking.product === "HOTEL" ? "bed-outline" : "airplane-outline"} tint="blue" size={34} />}
              title={`${it.booking.product === "HOTEL" ? "Hotel" : "Flight"}${it.booking.route ? ` · ${it.booking.route}` : ""}`}
              tag={{ label: titleCase(it.booking.status.replace(/_/g, " ")), tint: "slate" }}
            />
          ))}
        </View>
      ) : (
        <Text style={type.bodySoft}>Nothing shared yet. Share one of your bookings so the group sees it.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
  flexText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.75 },
  form: { gap: space.md, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  stats: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: space.md },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  statValue: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.inkSoft },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: TINT.teal.fg,
    backgroundColor: TINT.teal.bg,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  codeLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: TINT.teal.fg },
  code: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 3, color: colors.ink },
  codeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  note: { gap: 4, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  emergency: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: space.md, borderTopWidth: 0 },
  emergencyHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  poll: { gap: space.sm, paddingVertical: space.xs },
  question: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: "hidden", minHeight: 46, justifyContent: "center" },
  optionOn: { borderColor: colors.accent, borderWidth: 1.5 },
  optionFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.bgGlow },
  optionFillOn: { backgroundColor: colors.accentSoft },
  optionContent: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  optionText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  optionTextOn: { fontFamily: fonts.bodySemi, color: colors.accent },
  optionPct: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  actions: { paddingVertical: space.xs, gap: 0 },
  leave: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2, minHeight: 52 },
  leaveText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger },
});
