import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Button, Card, EmptyState, ListRow, Notice, Pill, Screen, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, space, type } from "@/core/theme/tokens";
import {
  useDeleteVaultDocumentMutation,
  useShareVaultDocumentMutation,
  useVaultCapabilityQuery,
  useVaultDocumentsQuery,
} from "../api/vaultApi";
import type { VaultDocType, VaultDocument } from "../api/types";
import { UploadForm } from "../components/UploadForm";
import { expiryDisplay, formatByteSize } from "../lib/vaultFormat";
import { VAULT_TYPE_LABELS, VAULT_TYPE_ORDER } from "../lib/visaStatus";

/** Same categories as the web's VaultCategoryTabs. */
const CATEGORIES: { key: string; label: string; types?: VaultDocType[] }[] = [
  { key: "all", label: "All" },
  { key: "identity", label: "Identity", types: ["PASSPORT", "NATIONAL_ID", "RESIDENCE_PERMIT"] },
  { key: "visas", label: "Visas", types: ["VISA", "TRAVEL_CERT"] },
  { key: "loyalty", label: "Loyalty", types: ["FF_CARD", "LOYALTY_CARD"] },
  { key: "vouchers", label: "Tickets & vouchers", types: ["TICKET", "HOTEL_VOUCHER", "INSURANCE", "OTHER"] },
  { key: "expiring", label: "Expiring" },
];
const EXPIRING_DAYS = 90;

function isExpiring(d: VaultDocument) {
  return d.daysUntilExpiry != null && d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= EXPIRING_DAYS;
}

export function VaultScreen() {
  const { data: capability } = useVaultCapabilityQuery();
  const { data, isLoading, error, refetch } = useVaultDocumentsQuery();
  const [remove] = useDeleteVaultDocumentMutation();
  const [share] = useShareVaultDocumentMutation();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [flash, setFlash] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const docs = (data?.items ?? []).filter((d) => d.isActive);
  const counts = useMemo(() => {
    const expired = docs.filter((d) => d.expiryStatus === "expired" || (d.daysUntilExpiry ?? 1) < 0).length;
    const expiring = docs.filter(isExpiring).length;
    return { total: docs.length, expired, expiring, valid: docs.length - expired - expiring };
  }, [docs]);

  const filtered = docs.filter((d) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    if (category === "expiring" && !isExpiring(d)) return false;
    if (cat?.types && !cat.types.includes(d.type)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [d.title, VAULT_TYPE_LABELS[d.type], d.originalFilename, d.visaMeta?.destinationCode, d.visaMeta?.visaType]
      .filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(q));
  });
  const groups = VAULT_TYPE_ORDER.map((t) => ({ type: t, items: filtered.filter((d) => d.type === t) })).filter((g) => g.items.length);

  const onShare = async (d: VaultDocument) => {
    try {
      const r = await share({ id: d.id, ttlHours: 24 }).unwrap();
      await Clipboard.setStringAsync(r.token);
      setFlash({ tone: "success", text: `Share code for "${d.title}" copied. It works for 24 hours.` });
    } catch (err) {
      setFlash({ tone: "error", text: formatApiError(err) });
    }
  };

  const onDelete = async (d: VaultDocument) => {
    if (!(await confirmAction("Remove document?", `"${d.title}" will be removed from your vault.`, "Remove"))) return;
    try {
      await remove(d.id).unwrap();
      setFlash({ tone: "success", text: `"${d.title}" removed.` });
    } catch (err) {
      setFlash({ tone: "error", text: formatApiError(err) });
    }
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Travel Vault" }} />
      <Card>
        <Text style={type.h2}>{counts.expired ? "Renewal needed" : "Ready for departure"}</Text>
        <View style={styles.stats}>
          <Stat label="Documents" value={counts.total} />
          <Stat label="Valid" value={counts.valid} />
          <Stat label="Expiring" value={counts.expiring} tone={counts.expiring ? "warn" : undefined} />
          <Stat label="Expired" value={counts.expired} tone={counts.expired ? "danger" : undefined} />
        </View>
      </Card>

      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}
      <Button label={showUpload ? "Close" : "Add a document"} variant={showUpload ? "ghost" : "primary"} onPress={() => setShowUpload((v) => !v)} />
      {showUpload ? (
        <UploadForm
          capability={capability}
          onDone={(msg) => {
            setShowUpload(false);
            setFlash({ tone: "success", text: msg });
          }}
        />
      ) : null}

      <TextField label="Search" placeholder="Title, type, destination…" value={query} onChangeText={setQuery} />
      <View style={styles.pills}>
        {CATEGORIES.map((c) => (
          <Pill key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </View>

      {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <>
          <Notice message={formatApiError(error, "Your vault is unavailable right now.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}

      {!isLoading && !error && !groups.length ? (
        <EmptyState
          title={docs.length ? "No matching documents" : "Your Travel Vault is empty"}
          body={docs.length ? "Try another search or category." : "Keep passports, visas, tickets and insurance here so Ava can check them before you fly."}
        />
      ) : null}

      {groups.map((g) => (
        <Card key={g.type}>
          <Text style={type.h3}>{VAULT_TYPE_LABELS[g.type] ?? g.type}</Text>
          {g.items.map((d) => {
            const exp = expiryDisplay(d.expiresAt);
            return (
              <View key={d.id} style={styles.doc}>
                <ListRow
                  title={d.title}
                  detail={[exp.label, d.visaMeta?.destinationCode ? `For ${d.visaMeta.destinationCode}` : null, formatByteSize(d.byteSize), d.isPlatformIssued ? "Issued by FlightOne" : null]
                    .filter(Boolean)
                    .join(" · ")}
                />
                <View style={styles.actions}>
                  <Button label="Share" variant="ghost" onPress={() => onShare(d)} style={styles.action} />
                  {!d.isPlatformIssued ? <Button label="Remove" variant="ghost" onPress={() => onDelete(d)} style={styles.action} /> : null}
                </View>
              </View>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone === "warn" && { color: colors.accent }, tone === "danger" && { color: colors.danger }]}>{value}</Text>
      <Text style={type.bodySoft}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  doc: { gap: space.xs },
  actions: { flexDirection: "row", gap: space.sm },
  action: { flex: 1, minHeight: 40 },
});
