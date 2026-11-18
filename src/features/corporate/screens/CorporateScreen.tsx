import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Button, Card, Notice, Screen, SectionLabel, TINT, TextField, type TintName } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { HeaderToggle, IconBadge, Initials, Row, StatusTag } from "@/features/groups/components/GroupUi";
import {
  useActiveProfileQuery,
  useApprovalsQuery,
  useCompaniesQuery,
  useCompanyBookingsQuery,
  useCreateCompanyMutation,
  useDecideApprovalMutation,
  usePoliciesQuery,
  useRequestApprovalMutation,
  type ActiveCorporateProfile,
} from "../api/corporateApi";
import { useCorporateProfileStore } from "../store/corporateProfile.store";

const titleCase = (s: string) => {
  const t = s.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const shortDay = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

/** Corporate travel: profile switch, credit, policy, approvals, company bookings. Admin tools stay on the web. */
export function CorporateScreen() {
  const { mode, companyId, setPersonal, setCorporate } = useCorporateProfileStore();
  const { data: companies = [], isLoading, error, refetch } = useCompaniesQuery();
  const activeId = mode === "CORPORATE" ? companyId || companies[0]?.id || null : null;
  const { data: profile } = useActiveProfileQuery(
    { mode: activeId ? "CORPORATE" : "PERSONAL", companyId: activeId },
    { skip: isLoading },
  );
  const role = profile?.membership?.role;
  const isApprover = role === "APPROVER" || role === "ADMIN";
  const activeName = companies.find((c) => c.id === activeId)?.name ?? profile?.company?.name;

  const pick = (fn: () => void) => () => {
    void Haptics.selectionAsync().catch(() => {});
    fn();
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Corporate" }} />
      {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <>
          <Notice message={formatApiError(error, "We couldn't load your companies.")} />
          <Button label="Try again" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}

      {!isLoading ? <Identity activeName={activeId ? activeName : undefined} profile={activeId ? profile : undefined} /> : null}

      {companies.length ? (
        <>
          <SectionLabel>Booking as</SectionLabel>
          <Card style={styles.list}>
            <ModeRow icon="person-outline" title="Personal" detail="Booked and paid by you" selected={!activeId} onPress={pick(setPersonal)} last={false} />
            {companies.map((c, i) => (
              <ModeRow
                key={c.id}
                icon="briefcase-outline"
                title={c.name}
                detail="Charged to the company · follows its policy"
                selected={activeId === c.id}
                onPress={pick(() => setCorporate(c.id))}
                last={i === companies.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      {!isLoading && !companies.length ? <CreateCompany /> : null}

      {activeId && profile?.company ? (
        <>
          {isApprover ? <PendingApprovals companyId={activeId} currency={profile.company.currency} /> : null}
          <PolicySummary policy={profile.policy ?? null} currency={profile.company.currency} />
          <Policies companyId={activeId} currency={profile.company.currency} />
          <RequestApproval companyId={activeId} />
          <CompanyBookings companyId={activeId} />
          {role === "ADMIN" ? (
            <Notice tone="info" message="Invoices, expenses, members, project codes and the company portal are managed on the FlightOne website." />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

/** Who you're booking as: company identity (name, role, credit) or personal mode. */
function Identity({ activeName, profile }: { activeName?: string; profile?: ActiveCorporateProfile }) {
  const company = profile?.company;
  const role = profile?.membership?.role;
  if (!activeName) {
    return (
      <Card>
        <View style={styles.idHead}>
          <IconBadge icon="person" tint="slate" size={52} />
          <View style={styles.flexText}>
            <Text style={type.h2}>Personal</Text>
            <ModeLine on={false} />
          </View>
        </View>
        <Text style={type.bodySoft}>Trips are booked and paid personally. Switch to a company below to book on its account.</Text>
      </Card>
    );
  }
  const member = profile?.membership;
  return (
    <Card>
      <View style={styles.idHead}>
        <Initials name={activeName} tint="slate" size={52} />
        <View style={styles.flexText}>
          <Text style={type.h2} numberOfLines={2}>
            {activeName}
          </Text>
          <ModeLine on />
        </View>
        {role ? <StatusTag label={titleCase(role)} tint="slate" /> : null}
      </View>
      {member?.department || member?.costCentre ? (
        <Text style={type.bodySoft}>{[member.department, member.costCentre ? `Cost centre ${member.costCentre}` : null].filter(Boolean).join(" · ")}</Text>
      ) : null}
      {company ? (
        <CreditMeter used={company.creditUsedMinor} limit={company.creditLimitMinor} currency={company.currency} />
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
      <Text style={type.bodySoft}>New Ava searches and bookings are charged to the company and follow its travel policy.</Text>
    </Card>
  );
}

function ModeLine({ on }: { on: boolean }) {
  return (
    <View style={styles.modeLine}>
      <View style={[styles.dot, { backgroundColor: on ? colors.success : colors.inkFaint }]} />
      <Text style={[styles.modeText, on && { color: colors.success }]}>Corporate mode {on ? "on" : "off"}</Text>
    </View>
  );
}

function ModeRow({
  icon,
  title,
  detail,
  selected,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
  last: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Book as ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.modeRow, !last && styles.divider, pressed && styles.pressed]}
    >
      <IconBadge icon={icon} tint={selected ? "blue" : "slate"} size={34} />
      <View style={styles.flexText}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeDetail}>{detail}</Text>
      </View>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? colors.accent : colors.inkFaint} />
    </Pressable>
  );
}

function CreditMeter({ used, limit, currency }: { used: number; limit: number; currency: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <View style={styles.meter}>
      <View style={styles.between}>
        <View>
          <Text style={styles.kvLabel}>Available credit</Text>
          <Text style={styles.big}>{formatMinor(Math.max(0, limit - used), currency)}</Text>
        </View>
        <Text style={styles.pct}>{pct}% used</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${pct}%` }, pct > 85 && { backgroundColor: colors.danger }]} />
      </View>
      <Text style={styles.small}>
        {formatMinor(used, currency)} used of {formatMinor(limit, currency)}
      </Text>
    </View>
  );
}

function KV({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.kv, !last && styles.divider]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function PolicySummary({ policy, currency }: { policy: ActiveCorporateProfile["policy"]; currency: string }) {
  return (
    <Card title="Your travel policy" icon="shield-checkmark-outline" tint="green" right={policy ? <StatusTag label="Active" tint="green" /> : undefined}>
      {policy ? (
        <View>
          <KV label="Highest cabin" value={policy.maxCabin ? titleCase(policy.maxCabin) : "Any cabin"} />
          <KV label="Max per booking" value={policy.maxAmountMinor ? formatMinor(policy.maxAmountMinor, currency) : "No limit"} />
          <KV label="Book ahead" value={policy.advanceBookingDays ? `${policy.advanceBookingDays}+ days` : "Any time"} last />
        </View>
      ) : (
        <Text style={type.bodySoft}>No active travel policy configured.</Text>
      )}
    </Card>
  );
}

function CreateCompany() {
  const [create, { isLoading }] = useCreateCompanyMutation();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return (
    <Card title="Create your company workspace" subtitle="Book trips on your company's account" icon="briefcase-outline" tint="slate">
      <Text style={type.bodySoft}>{"You'll be its admin. A FlightOne account manager sets the credit limit."}</Text>
      <TextField label="Company name" value={name} onChangeText={setName} maxLength={200} />
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
      <Button
        label="Create company"
        loading={isLoading}
        disabled={!name.trim()}
        onPress={async () => {
          try {
            const c = await create({ name: name.trim() }).unwrap();
            setName("");
            setMsg({ tone: "success", text: `${c.name} created. Pick it above to book for the company.` });
          } catch (err) {
            setMsg({ tone: "error", text: formatApiError(err) });
          }
        }}
      />
    </Card>
  );
}

function PendingApprovals({ companyId, currency }: { companyId: string; currency: string }) {
  const { data } = useApprovalsQuery({ companyId, status: "PENDING" });
  const [decide] = useDecideApprovalMutation();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = data?.items ?? [];

  const run = async (id: string, decision: "APPROVE" | "REJECT") => {
    setBusy(id);
    try {
      await decide({ id, decision }).unwrap();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setMsg(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="Approvals"
      subtitle={items.length ? "Bookings waiting for your decision" : undefined}
      icon="checkmark-done-outline"
      tint="amber"
      right={items.length ? <StatusTag label={`${items.length} pending`} tint="amber" /> : undefined}
    >
      {msg ? <Notice message={msg} /> : null}
      {items.length ? (
        items.map((a, i) => (
          <View key={a.id} style={[styles.approval, i > 0 && styles.approvalSep]}>
            <View style={styles.approvalHead}>
              <IconBadge icon="receipt-outline" tint={a.policyViolation ? "rose" : "amber"} size={36} />
              <View style={styles.flexText}>
                <Text style={styles.amount}>{formatMinor(a.amountMinor, a.currency || currency)}</Text>
                <Text style={styles.small}>
                  Booking #{a.bookingId.slice(-8).toUpperCase()} · requested {shortDay(a.createdAt)}
                </Text>
              </View>
              {a.policyViolation ? <StatusTag label="Out of policy" tint="rose" /> : <StatusTag label="Pending" tint="amber" />}
            </View>
            <View style={styles.row}>
              <Button label="Approve" style={styles.flex} loading={busy === a.id} disabled={busy != null} onPress={() => run(a.id, "APPROVE")} />
              <Button
                label="Decline"
                variant="ghost"
                style={styles.flex}
                disabled={busy != null}
                onPress={async () => {
                  if (await confirmAction("Decline this booking?", "The traveller won't be able to pay for it.", "Decline")) {
                    await run(a.id, "REJECT");
                  }
                }}
              />
            </View>
          </View>
        ))
      ) : (
        <View style={styles.allClear}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={type.bodySoft}>{"You're all caught up — no pending approvals."}</Text>
        </View>
      )}
    </Card>
  );
}

function RequestApproval({ companyId }: { companyId: string }) {
  const [request, { isLoading }] = useRequestApprovalMutation();
  const [bookingId, setBookingId] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  return (
    <Card
      title="Request approval"
      subtitle="Send one of your bookings to your approvers"
      icon="paper-plane-outline"
      tint="blue"
      right={<HeaderToggle open={open} label="Request" onPress={() => setOpen((v) => !v)} />}
    >
      {open ? (
        <>
          <TextField label="Booking reference" value={bookingId} onChangeText={setBookingId} autoCapitalize="none" />
          <Button
            label="Submit for approval"
            loading={isLoading}
            disabled={!bookingId.trim()}
            onPress={async () => {
              try {
                const a = await request({ bookingId: bookingId.trim(), companyId }).unwrap();
                setMsg(
                  a.status === "APPROVED"
                    ? { tone: "success", text: "Within policy — approved automatically." }
                    : { tone: "info", text: "Sent to your company's approvers." },
                );
                setBookingId("");
              } catch (err) {
                setMsg({ tone: "error", text: formatApiError(err) });
              }
            }}
          />
        </>
      ) : null}
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
    </Card>
  );
}

function Policies({ companyId, currency }: { companyId: string; currency: string }) {
  const { data = [] } = usePoliciesQuery(companyId);
  if (!data.length) return null;
  return (
    <Card title="Company policies" icon="document-text-outline" tint="slate">
      <View>
        {data.map((p, i) => (
          <Row
            key={p.id}
            last={i === data.length - 1}
            title={p.name || "Travel policy"}
            detail={
              [
                p.maxCabin ? `Max cabin ${p.maxCabin.toLowerCase().replace(/_/g, " ")}` : null,
                p.maxAmountMinor ? `up to ${formatMinor(p.maxAmountMinor, currency)}` : null,
                p.advanceBookingDays ? `${p.advanceBookingDays} days ahead` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "No limits set"
            }
            tag={p.isActive === false ? { label: "Inactive", tint: "slate" } : p.isActive ? { label: "Active", tint: "green" } : null}
          />
        ))}
      </View>
    </Card>
  );
}

function bookingTint(status: string): TintName {
  const s = status.toUpperCase();
  if (s.includes("CANCEL") || s.includes("REFUND")) return "slate";
  if (s.includes("FAIL") || s.includes("REJECT")) return "rose";
  if (s.includes("PENDING") || s.includes("HOLD") || s.includes("AWAIT")) return "amber";
  if (s.includes("CONFIRM") || s.includes("TICKET") || s.includes("PAID") || s.includes("COMPLETE")) return "green";
  return "blue";
}

function CompanyBookings({ companyId }: { companyId: string }) {
  const { data } = useCompanyBookingsQuery(companyId);
  const items = data?.items.slice(0, 10) ?? [];
  return (
    <Card title="Company bookings" subtitle={data?.total ? `Latest ${items.length} of ${data.total}` : undefined} icon="airplane-outline" tint="blue">
      {items.length ? (
        <View>
          {items.map((b, i) => (
            <Row
              key={b.id}
              last={i === items.length - 1}
              leading={<IconBadge icon={b.product === "HOTEL" ? "bed-outline" : "airplane-outline"} tint="blue" size={34} />}
              title={`${b.product === "HOTEL" ? "Hotel" : "Flight"} · ${formatMinor(b.amountMinor, b.currency)}`}
              detail={shortDay(b.createdAt)}
              tag={{ label: titleCase(b.status), tint: bookingTint(b.status) }}
            />
          ))}
        </View>
      ) : (
        <Text style={type.bodySoft}>No company bookings yet.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: space.sm },
  flex: { flex: 1 },
  flexText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  list: { paddingVertical: space.xs, gap: 0 },
  idHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  modeLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  modeText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  modeRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, minHeight: 56 },
  modeTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  modeDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  meter: { gap: 6, backgroundColor: TINT.slate.bg, borderRadius: radius.md, padding: space.md },
  big: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  pct: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.card, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.accent, borderRadius: radius.pill },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.sm + 2, gap: space.md },
  kvLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  kvValue: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  amount: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.ink },
  approval: { gap: space.md },
  approvalSep: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  approvalHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  allClear: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
