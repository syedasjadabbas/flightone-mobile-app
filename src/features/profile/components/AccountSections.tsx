import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { DocumentScanPanel } from "./DocumentScanPanel";
import { AddButton, ItemRow, ListGroup, StatTile, ToneTag, formatDay, hapticTap } from "./SectionParts";
import { TwoFactorSetup } from "@/features/auth/components/TwoFactorSetup";
import { useTwoFactorDisableMutation } from "@/features/auth/api/authApi";
import { Button, Card, EmptyState, ListRow, Notice, SkeletonList, TextField, type MenuAction, type TintName } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { formatMinor } from "@/features/checkout/lib/checkoutDisplay";
import {
  useIdentityDocumentsQuery,
  useRevokeSessionMutation,
  useSessionsQuery,
  useTravelHistoryQuery,
  type AuthDeviceSession,
  type IdentityDocument,
  type TravelHistory,
} from "../api/profileApi";

type IconName = keyof typeof Ionicons.glyphMap;

const DOC_META: Record<IdentityDocument["type"], { label: string; icon: IconName; tint: TintName }> = {
  PASSPORT: { label: "Passport", icon: "book-outline", tint: "blue" },
  NATIONAL_ID: { label: "National ID", icon: "id-card-outline", tint: "teal" },
  VISA: { label: "Visa", icon: "airplane-outline", tint: "violet" },
  RESIDENCE_PERMIT: { label: "Residence permit", icon: "home-outline", tint: "slate" },
};
const VERIFY_META: Record<IdentityDocument["verificationStatus"], { label: string; tint: TintName }> = {
  VERIFIED: { label: "Verified", tint: "green" },
  PENDING: { label: "Pending", tint: "blue" },
  UNVERIFIED: { label: "Unverified", tint: "slate" },
  REJECTED: { label: "Rejected", tint: "rose" },
};

/** Valid / Expiring / Expired tag from the server's expiry state. */
function expiryTag(d: IdentityDocument) {
  const state = d.status === "EXPIRED" ? "expired" : d.expiry?.state;
  if (state === "expired") return <ToneTag label="Expired" tint="rose" />;
  if (state === "expiring_soon") {
    const days = d.expiry?.daysRemaining;
    return <ToneTag label={days != null ? `Expiring · ${days}d` : "Expiring"} tint="amber" />;
  }
  if (state === "valid") return <ToneTag label="Valid" tint="green" />;
  return null;
}

/** Identity documents on file (numbers are never shown). Uploads happen in the Vault. */
export function DocumentsSection() {
  const { data = [], error, isLoading } = useIdentityDocumentsQuery();
  const [scanning, setScanning] = useState<string | null>(null);
  const docs = data.filter((d) => d.status !== "SUPERSEDED");
  const openVault = () => router.push("/vault");

  return (
    <>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {isLoading ? (
        <SkeletonList count={2} lines={3} />
      ) : docs.length ? (
        <>
          <ListGroup label={`On file · ${docs.length}`}>
            {docs.map((d, i) => {
              const meta = DOC_META[d.type];
              const verify = VERIFY_META[d.verificationStatus];
              const actions: MenuAction[] = [];
              if (d.vaultDocumentId) {
                actions.push({ label: "Scan details from upload", icon: "scan-outline", onPress: () => setScanning(d.id) });
              }
              actions.push({ label: "Open in Travel Vault", icon: "folder-open-outline", onPress: openVault });
              const last = i === docs.length - 1;
              return (
                <View key={d.id}>
                  <ItemRow
                    title={d.countryCode ? `${meta.label} · ${d.countryCode}` : meta.label}
                    avatar={{ icon: meta.icon }}
                    tint={meta.tint}
                    tags={expiryTag(d)}
                    detail={[
                      d.hasDocumentNumber ? "No. ••••" : null,
                      d.expiresAt ? `Expires ${formatDay(d.expiresAt)}` : "No expiry date",
                      verify.label,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    menuTitle={meta.label}
                    last={last || scanning === d.id}
                    actions={actions}
                  />
                  {scanning === d.id ? (
                    <View style={[styles.scanWrap, !last && styles.scanDivider]}>
                      <DocumentScanPanel documentId={d.id} onDone={() => setScanning(null)} onCancel={() => setScanning(null)} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ListGroup>
          <AddButton label="Add a document" detail="Upload passports, IDs and visas in your Travel Vault" icon="cloud-upload-outline" onPress={openVault} />
        </>
      ) : (
        <EmptyState
          icon="document-text-outline"
          title="No travel documents yet"
          body="Upload your passport or ID in the Travel Vault and it shows up here."
          actionLabel="Open Travel Vault"
          onAction={openVault}
        />
      )}
    </>
  );
}

/** Pick a device icon from the label / user agent. */
function deviceIcon(s: AuthDeviceSession): IconName {
  const l = `${s.deviceLabel} ${s.userAgent ?? ""}`.toLowerCase();
  if (/ipad|tablet/.test(l)) return "tablet-portrait-outline";
  if (/iphone|android|mobile|ios|expo|okhttp/.test(l)) return "phone-portrait-outline";
  if (/mac|windows|linux|chrome|safari|firefox|edge|web/.test(l)) return "laptop-outline";
  return "hardware-chip-outline";
}

/** "Active now", "5 min ago", "3 h ago", "2 d ago", or a date. */
function lastSeen(iso: string, now: number) {
  const d = new Date(iso);
  const mins = Math.round((now - d.getTime()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 2) return "Active now";
  if (mins < 60) return `Active ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Active ${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Active ${days} d ago`;
  return `Last active ${formatDay(iso)}`;
}

/** 2-step verification (turn on / off) and signed-in devices (revoke any but this one). */
export function SecuritySection() {
  const sessionId = useAuthStore((s) => s.sessionId);
  const twoFactor = useAuthStore((s) => s.user?.twoFactorEnabled);
  const { data, error, isLoading, fulfilledTimeStamp } = useSessionsQuery(sessionId);
  const [revoke] = useRevokeSessionMutation();
  const [disable, disableState] = useTwoFactorDisableMutation();
  const [offCode, setOffCode] = useState("");
  const [turningOff, setTurningOff] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const sessions = [...(data?.sessions ?? [])].sort((a, b) => Number(b.current) - Number(a.current));
  // "Now" = when the list was fetched, so rendering stays pure.
  const now = fulfilledTimeStamp ?? 0;

  return (
    <>
      <Card
        title="2-step verification"
        subtitle={twoFactor ? "A code from your authenticator is needed to sign in" : "Add a second check when you sign in"}
        icon={twoFactor ? "shield-checkmark-outline" : "shield-outline"}
        tint={twoFactor ? "green" : "amber"}
        right={<ToneTag label={twoFactor ? "On" : "Off"} tint={twoFactor ? "green" : "slate"} icon={twoFactor ? "checkmark" : undefined} />}
      >
        {msg ? <Notice tone={msg.tone} message={msg.text} /> : null}
        {twoFactor ? (
          turningOff ? (
            <>
              <TextField
                label="Code to turn it off"
                icon="keypad-outline"
                hint="From your authenticator, or a backup code"
                value={offCode}
                onChangeText={setOffCode}
                autoCapitalize="none"
              />
              <View style={styles.pair}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  style={styles.flex}
                  onPress={() => {
                    setTurningOff(false);
                    setOffCode("");
                  }}
                />
                <Button
                  label="Turn off"
                  style={styles.flex}
                  loading={disableState.isLoading}
                  disabled={!offCode.trim()}
                  onPress={async () => {
                    if (!(await confirmAction("Turn off 2-step verification?", "Your account will only need your password to sign in.", "Turn off"))) return;
                    try {
                      await disable({ code: offCode.trim() }).unwrap();
                      setOffCode("");
                      setTurningOff(false);
                      setMsg({ tone: "success", text: "2-step verification is off." });
                    } catch (err) {
                      setMsg({ tone: "error", text: formatApiError(err) });
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.benefit}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.success} />
                <Text style={styles.benefitText}>Even if someone learns your password, they can’t sign in without your phone.</Text>
              </View>
              <Button
                label="Turn off 2-step verification"
                variant="ghost"
                onPress={() => {
                  hapticTap();
                  setMsg(null);
                  setTurningOff(true);
                }}
              />
            </>
          )
        ) : (
          <TwoFactorSetup onEnabled={() => setMsg({ tone: "success", text: "2-step verification is on." })} />
        )}
      </Card>

      {error ? <Notice message={formatApiError(error)} /> : null}
      {isLoading ? (
        <SkeletonList count={2} />
      ) : sessions.length ? (
        <ListGroup label={`Signed-in devices · ${sessions.length}`}>
          {sessions.map((s, i) => (
            <ItemRow
              key={s.id}
              title={s.deviceLabel}
              avatar={{ icon: deviceIcon(s) }}
              tint={s.current ? "green" : "slate"}
              tags={s.current ? <ToneTag label="This device" tint="green" /> : null}
              detail={s.current ? "Signed in now" : [lastSeen(s.lastUsedAt, now), s.ip].filter(Boolean).join(" · ")}
              last={i === sessions.length - 1}
              actions={
                s.current
                  ? undefined
                  : [
                      {
                        label: "Sign out this device",
                        icon: "log-out-outline",
                        destructive: true,
                        onPress: async () => {
                          if (await confirmAction("Sign out device?", s.deviceLabel, "Sign out")) revoke(s.id);
                        },
                      },
                    ]
              }
            />
          ))}
        </ListGroup>
      ) : !error ? (
        <Text style={[type.bodySoft, styles.muted]}>No other devices are signed in.</Text>
      ) : null}
    </>
  );
}

type HistoryItem = TravelHistory["items"][number];

function statusLabel(s: string) {
  const l = s.toLowerCase().replace(/_/g, " ");
  return l.charAt(0).toUpperCase() + l.slice(1);
}

/** Newest first, grouped by the booking's year. */
function groupByYear(items: HistoryItem[]) {
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups: { year: string; items: HistoryItem[] }[] = [];
  for (const b of sorted) {
    const y = new Date(b.createdAt).getFullYear();
    const year = Number.isNaN(y) ? "Earlier" : String(y);
    const g = groups[groups.length - 1];
    if (g && g.year === year) g.items.push(b);
    else groups.push({ year, items: [b] });
  }
  return groups;
}

export function HistorySection() {
  const { data, error, isLoading } = useTravelHistoryQuery();
  const routes = data?.patterns?.frequentRoutes ?? [];
  const airlines = data?.patterns?.frequentAirlines ?? [];
  const groups = data ? groupByYear(data.items) : [];

  return (
    <>
      {error ? <Notice message={formatApiError(error)} /> : null}
      {isLoading ? <SkeletonList count={4} /> : null}
      {data ? (
        <>
          <View style={styles.tiles}>
            <StatTile value={data.stats.totalBookings} label={data.stats.totalBookings === 1 ? "Booking" : "Bookings"} icon="receipt-outline" />
            <StatTile value={data.stats.completedBookings} label="Completed" icon="checkmark-done-outline" tint="green" />
            {routes.length ? <StatTile value={routes.length} label={routes.length === 1 ? "Route" : "Routes"} icon="git-compare-outline" tint="violet" /> : null}
          </View>

          {routes.length || airlines.length ? (
            <Card title="Your patterns" subtitle="What you book most" icon="trending-up-outline" tint="teal">
              {routes.length ? <ChipLine label="Routes" values={routes} /> : null}
              {airlines.length ? <ChipLine label="Airlines" values={airlines} /> : null}
            </Card>
          ) : null}

          {groups.length ? (
            groups.map((g) => (
              <ListGroup key={g.year} label={`${g.year} · ${g.items.length}`}>
                  {g.items.map((b, i) => (
                    <ListRow
                      key={b.id}
                      icon={b.product === "HOTEL" ? "bed-outline" : "airplane-outline"}
                      tint={b.product === "HOTEL" ? "violet" : "blue"}
                      title={b.product === "HOTEL" ? "Hotel" : "Flight"}
                      detail={`${formatDay(b.createdAt)} · ${statusLabel(b.status)}`}
                      meta={formatMinor(b.amountMinor, b.currency)}
                      last={i === g.items.length - 1}
                      onPress={() => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: b.id } })}
                    />
                  ))}
              </ListGroup>
            ))
          ) : (
            <EmptyState icon="map-outline" tint="teal" title="No trips yet" body="Bookings you make with FlightOne will show up here." />
          )}
        </>
      ) : null}
    </>
  );
}

function ChipLine({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={styles.chipBlock}>
      <Text style={styles.chipLabel}>{label}</Text>
      <View style={styles.chips}>
        {values.map((v) => (
          <View key={v} style={styles.chip}>
            <Text style={styles.chipText}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pair: { flexDirection: "row", gap: space.sm },
  muted: { marginLeft: space.xs },
  benefit: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", backgroundColor: colors.successSoft, borderRadius: radius.md, padding: space.md },
  benefitText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink },
  scanWrap: { paddingBottom: space.md },
  scanDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  tiles: { flexDirection: "row", gap: space.sm },
  chipBlock: { gap: space.xs + 2 },
  chipLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs + 2 },
  chip: { borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingHorizontal: space.md, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
});
