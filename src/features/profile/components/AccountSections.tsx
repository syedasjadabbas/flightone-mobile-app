import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, ListRow, Notice, Tag } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import { useIdentityDocumentsQuery, useRevokeSessionMutation, useSessionsQuery, useTravelHistoryQuery } from "../api/profileApi";

const DOC_LABEL = { PASSPORT: "Passport", NATIONAL_ID: "National ID", VISA: "Visa", RESIDENCE_PERMIT: "Residence permit" } as const;
const VERIFY_TONE = { VERIFIED: "success", PENDING: "accent", UNVERIFIED: "neutral", REJECTED: "neutral" } as const;

/** Identity documents on file (numbers are never shown). Uploads happen in the Vault. */
export function DocumentsSection() {
  const { data = [], error } = useIdentityDocumentsQuery();
  const docs = data.filter((d) => d.status !== "SUPERSEDED");
  return (
    <Card>
      <Text style={type.h3}>Travel documents</Text>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {docs.length ? (
        docs.map((d) => (
          <View key={d.id} style={{ gap: 4, paddingVertical: space.sm }}>
            <Text style={type.label}>
              {DOC_LABEL[d.type]}
              {d.countryCode ? ` · ${d.countryCode}` : ""}
            </Text>
            <Text style={type.bodySoft}>
              {d.expiresAt ? `Expires ${d.expiresAt.slice(0, 10)}` : "No expiry date"}
              {d.expiry?.state === "expiring_soon" ? " · expiring soon" : d.expiry?.state === "expired" ? " · expired" : ""}
            </Text>
            <Tag label={d.verificationStatus.toLowerCase()} tone={VERIFY_TONE[d.verificationStatus]} />
          </View>
        ))
      ) : (
        <Text style={type.bodySoft}>No travel documents on file yet.</Text>
      )}
      <Button label="Open Travel Vault" variant="ghost" onPress={() => router.push("/vault")} />
    </Card>
  );
}

/** Signed-in devices; revoke any but this one. 2-step setup stays on the website for now. */
export function SecuritySection() {
  const sessionId = useAuthStore((s) => s.sessionId);
  const twoFactor = useAuthStore((s) => s.user?.twoFactorEnabled);
  const { data, error } = useSessionsQuery(sessionId);
  const [revoke] = useRevokeSessionMutation();

  return (
    <Card>
      <Text style={type.h3}>Security</Text>
      <Text style={type.body}>Two-step verification: {twoFactor ? "on" : "off"}</Text>
      {!twoFactor ? <Text style={type.bodySoft}>Turn it on from the FlightOne website (Profile → Security).</Text> : null}
      <Text style={[type.label, { marginTop: space.sm }]}>Signed-in devices</Text>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {(data?.sessions ?? []).map((s) => (
        <ListRow
          key={s.id}
          title={`${s.deviceLabel}${s.current ? " · This device" : ""}`}
          detail={`Last active ${new Date(s.lastUsedAt).toLocaleString()}`}
          actionLabel={s.current ? undefined : "Sign out"}
          onAction={
            s.current
              ? undefined
              : async () => {
                  if (await confirmAction("Sign out device?", s.deviceLabel, "Sign out")) revoke(s.id);
                }
          }
        />
      ))}
    </Card>
  );
}

export function HistorySection() {
  const { data, error } = useTravelHistoryQuery();
  return (
    <Card>
      <Text style={type.h3}>Travel history</Text>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {data ? (
        <>
          <Text style={type.body}>
            {data.stats.totalBookings} booking{data.stats.totalBookings === 1 ? "" : "s"} · {data.stats.completedBookings} completed
          </Text>
          {data.patterns?.frequentRoutes?.length ? (
            <Text style={type.bodySoft}>Frequent routes: {data.patterns.frequentRoutes.join(", ")}</Text>
          ) : null}
          {data.items.map((b) => (
            <ListRow
              key={b.id}
              title={`${b.product === "HOTEL" ? "Hotel" : "Flight"} · ${b.status.toLowerCase()}`}
              detail={`${new Date(b.createdAt).toLocaleDateString()} · ${formatMinor(b.amountMinor, b.currency)}`}
              actionLabel="Open"
              tone="accent"
              onAction={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: b.id } })}
            />
          ))}
        </>
      ) : null}
    </Card>
  );
}
