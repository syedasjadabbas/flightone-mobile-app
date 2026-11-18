import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Button, Card, ListRow, Notice, Pill, Screen, Tag, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, radius, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import {
  useActiveProfileQuery,
  useApprovalsQuery,
  useCompaniesQuery,
  useCompanyBookingsQuery,
  useCreateCompanyMutation,
  useDecideApprovalMutation,
  usePoliciesQuery,
  useRequestApprovalMutation,
} from "../api/corporateApi";
import { useCorporateProfileStore } from "../store/corporateProfile.store";

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

      <Card>
        <Text style={type.h3}>Booking as</Text>
        <View style={styles.row}>
          <Pill label="Personal" selected={!activeId} onPress={setPersonal} />
          {companies.map((c) => (
            <Pill key={c.id} label={c.name} selected={activeId === c.id} onPress={() => setCorporate(c.id)} />
          ))}
        </View>
        <Text style={type.bodySoft}>
          {activeId
            ? "New Ava searches and bookings are charged to the company and follow its travel policy."
            : "Trips are booked and paid personally."}
        </Text>
      </Card>

      {!isLoading && !companies.length ? <CreateCompany /> : null}

      {activeId && profile?.company ? (
        <>
          <Card>
            <View style={styles.between}>
              <Text style={type.h2}>{profile.company.name}</Text>
              {role ? <Tag label={role.toLowerCase()} tone="accent" /> : null}
            </View>
            <CreditMeter used={profile.company.creditUsedMinor} limit={profile.company.creditLimitMinor} currency={profile.company.currency} />
            <Text style={type.bodySoft}>
              {profile.policy
                ? [
                    profile.policy.maxCabin ? `Max cabin ${profile.policy.maxCabin.toLowerCase()}` : null,
                    profile.policy.maxAmountMinor ? `up to ${formatMinor(profile.policy.maxAmountMinor, profile.company.currency)}` : null,
                    profile.policy.advanceBookingDays ? `book ${profile.policy.advanceBookingDays}+ days ahead` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Travel policy active"
                : "No active travel policy configured."}
            </Text>
          </Card>
          {isApprover ? <PendingApprovals companyId={activeId} currency={profile.company.currency} /> : null}
          <RequestApproval companyId={activeId} />
          <Policies companyId={activeId} currency={profile.company.currency} />
          <CompanyBookings companyId={activeId} />
          {role === "ADMIN" ? (
            <Notice tone="info" message="Invoices, expenses, members, project codes and the company portal are managed on the FlightOne website." />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function CreditMeter({ used, limit, currency }: { used: number; limit: number; currency: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <View style={styles.meter}>
      <View style={styles.between}>
        <Text style={type.bodySoft}>Credit used</Text>
        <Text style={type.label}>
          {formatMinor(used, currency)} / {formatMinor(limit, currency)}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${pct}%` }, pct > 85 && { backgroundColor: colors.danger }]} />
      </View>
      <Text style={type.bodySoft}>Available {formatMinor(Math.max(0, limit - used), currency)}</Text>
    </View>
  );
}

function CreateCompany() {
  const [create, { isLoading }] = useCreateCompanyMutation();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return (
    <Card>
      <Text style={type.h3}>Create your company workspace</Text>
      <Text style={type.bodySoft}>You'll be its admin. A FlightOne account manager sets the credit limit.</Text>
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
  const items = data?.items ?? [];
  return (
    <Card>
      <Text style={type.h3}>Pending approvals</Text>
      {msg ? <Notice message={msg} /> : null}
      {items.length ? (
        items.map((a) => (
          <View key={a.id} style={styles.approval}>
            <Text style={type.label}>
              {formatMinor(a.amountMinor, a.currency || currency)} · booking #{a.bookingId.slice(-8).toUpperCase()}
            </Text>
            {a.policyViolation ? <Text style={type.bodySoft}>Out of policy</Text> : null}
            <View style={styles.row}>
              <Button
                label="Approve"
                style={styles.flex}
                onPress={() => decide({ id: a.id, decision: "APPROVE" }).unwrap().catch((e) => setMsg(formatApiError(e)))}
              />
              <Button
                label="Reject"
                variant="ghost"
                style={styles.flex}
                onPress={async () => {
                  if (await confirmAction("Reject this booking?", "The traveller won't be able to pay for it.", "Reject")) {
                    decide({ id: a.id, decision: "REJECT" }).unwrap().catch((e) => setMsg(formatApiError(e)));
                  }
                }}
              />
            </View>
          </View>
        ))
      ) : (
        <Text style={type.bodySoft}>No pending approvals.</Text>
      )}
    </Card>
  );
}

function RequestApproval({ companyId }: { companyId: string }) {
  const [request, { isLoading }] = useRequestApprovalMutation();
  const [bookingId, setBookingId] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  return (
    <Card>
      <Text style={type.h3}>Request approval</Text>
      <TextField label="Booking reference" value={bookingId} onChangeText={setBookingId} autoCapitalize="none" />
      {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
      <Button
        label="Submit for approval"
        variant="ghost"
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
          } catch (err) {
            setMsg({ tone: "error", text: formatApiError(err) });
          }
        }}
      />
    </Card>
  );
}

function Policies({ companyId, currency }: { companyId: string; currency: string }) {
  const { data = [] } = usePoliciesQuery(companyId);
  if (!data.length) return null;
  return (
    <Card>
      <Text style={type.h3}>Travel policies</Text>
      {data.map((p) => (
        <ListRow
          key={p.id}
          title={p.name || "Travel policy"}
          detail={[
            p.maxCabin ? `Max cabin ${p.maxCabin.toLowerCase()}` : null,
            p.maxAmountMinor ? `up to ${formatMinor(p.maxAmountMinor, currency)}` : null,
            p.advanceBookingDays ? `${p.advanceBookingDays} days ahead` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
    </Card>
  );
}

function CompanyBookings({ companyId }: { companyId: string }) {
  const { data } = useCompanyBookingsQuery(companyId);
  return (
    <Card>
      <Text style={type.h3}>Company bookings</Text>
      {data?.items.length ? (
        data.items.slice(0, 10).map((b) => (
          <ListRow
            key={b.id}
            title={`${b.product === "HOTEL" ? "Hotel" : "Flight"} · ${b.status.toLowerCase()}`}
            detail={`${new Date(b.createdAt).toLocaleDateString()} · ${formatMinor(b.amountMinor, b.currency)}`}
          />
        ))
      ) : (
        <Text style={type.bodySoft}>No company bookings yet.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  meter: { gap: 4 },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.bgGlow, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.accent, borderRadius: radius.pill },
  approval: { gap: space.xs, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
