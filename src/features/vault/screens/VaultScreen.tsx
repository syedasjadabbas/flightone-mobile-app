import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Button, Card, EmptyState, Notice, PageHeader, Pill, Screen, SectionLabel, TextField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import {
  useDeleteVaultDocumentMutation,
  useShareVaultDocumentMutation,
  useVaultCapabilityQuery,
  useVaultDocumentsQuery,
} from "../api/vaultApi";
import type { VaultDocType, VaultDocument } from "../api/types";
import { DocRow } from "../components/DocRow";
import { UploadForm } from "../components/UploadForm";
import { openVaultFile } from "../lib/openVaultFile";
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

function inCategory(d: VaultDocument, key: string) {
  const cat = CATEGORIES.find((c) => c.key === key);
  if (key === "expiring" && !isExpiring(d)) return false;
  if (cat?.types && !cat.types.includes(d.type)) return false;
  return true;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function VaultScreen() {
  const { data: capability } = useVaultCapabilityQuery();
  const { data, isLoading, error, refetch } = useVaultDocumentsQuery();
  const [remove] = useDeleteVaultDocumentMutation();
  const [share] = useShareVaultDocumentMutation();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [flash, setFlash] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const docs = useMemo(() => (data?.items ?? []).filter((d) => d.isActive), [data]);
  const counts = useMemo(() => {
    const expired = docs.filter((d) => d.expiryStatus === "expired" || (d.daysUntilExpiry ?? 1) < 0).length;
    const expiring = docs.filter(isExpiring).length;
    return { total: docs.length, expired, expiring, valid: docs.length - expired - expiring };
  }, [docs]);

  const filtered = docs.filter((d) => {
    if (!inCategory(d, category)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [d.title, VAULT_TYPE_LABELS[d.type], d.originalFilename, d.visaMeta?.destinationCode, d.visaMeta?.visaType]
      .filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(q));
  });
  const groups = VAULT_TYPE_ORDER.map((t) => ({ type: t, items: filtered.filter((d) => d.type === t) })).filter((g) => g.items.length);

  const [opening, setOpening] = useState<string | null>(null);
  const onOpen = async (d: VaultDocument) => {
    setOpening(d.id);
    try {
      await openVaultFile(d);
    } catch (err) {
      setFlash({ tone: "error", text: err instanceof Error && err.message ? err.message : "Couldn't open the file." });
    } finally {
      setOpening(null);
    }
  };

  const onShare = async (d: VaultDocument) => {
    try {
      const r = await share({ id: d.id, ttlHours: 24 }).unwrap();
      await Clipboard.setStringAsync(r.token);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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

  const openUpload = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFlash(null);
    setShowUpload(true);
  };

  const filtering = category !== "all" || query.trim().length > 0;
  const attention = counts.expired + counts.expiring;
  const vaultEmpty = !isLoading && !error && !docs.length;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Travel Vault" }} />
      <PageHeader
        icon="folder-open"
        tint="blue"
        title={docs.length ? (counts.expired ? "Renewal needed" : "Ready for departure") : undefined}
        subtitle="Passports, visas, tickets and insurance in one encrypted place, so Ava can check them before you fly."
        stats={
          docs.length
            ? [
                { value: counts.total, label: "Documents" },
                { value: counts.expiring, label: "Expiring" },
                { value: counts.expired, label: "Expired" },
              ]
            : undefined
        }
      />

      {flash ? <Notice tone={flash.tone} message={flash.text} /> : null}

      {showUpload ? (
        <UploadForm
          capability={capability}
          onCancel={() => setShowUpload(false)}
          onDone={(msg) => {
            setShowUpload(false);
            setFlash({ tone: "success", text: msg });
          }}
        />
      ) : !vaultEmpty ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a document"
          onPress={openUpload}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={colors.onBtn} />
          <Text style={styles.addText}>Add a document</Text>
        </Pressable>
      ) : null}

      {attention > 0 && category !== "expiring" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${plural(attention, "document")} need attention. Show expiring`}
          onPress={() => setCategory("expiring")}
          style={({ pressed }) => [styles.alert, counts.expired ? styles.alertDanger : styles.alertWarn, pressed && styles.pressed]}
        >
          <Ionicons name="alert-circle" size={20} color={counts.expired ? colors.danger : "#b26a00"} />
          <Text style={[styles.alertText, { color: counts.expired ? colors.danger : "#b26a00" }]}>
            {[counts.expired ? `${counts.expired} expired` : null, counts.expiring ? `${counts.expiring} expiring within ${EXPIRING_DAYS} days` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={counts.expired ? colors.danger : "#b26a00"} />
        </Pressable>
      ) : null}

      {docs.length ? (
        <>
          <TextField label="Search documents" hideLabel icon="search" placeholder="Search title, type, destination…" value={query} onChangeText={setQuery} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={styles.pillScroll}>
            {CATEGORIES.map((c) => {
              const n = docs.filter((d) => inCategory(d, c.key)).length;
              return <Pill key={c.key} label={`${c.label}${n ? ` · ${n}` : ""}`} selected={category === c.key} onPress={() => setCategory(c.key)} />;
            })}
          </ScrollView>
        </>
      ) : null}

      {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <>
          <Notice message={formatApiError(error, "Your vault is unavailable right now.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}

      {!isLoading && !error && !groups.length && !showUpload ? (
        docs.length ? (
          <EmptyState
            icon="search-outline"
            tint="slate"
            title="No matching documents"
            body="Try another search or category."
            actionLabel={filtering ? "Show all documents" : undefined}
            onAction={() => {
              setCategory("all");
              setQuery("");
            }}
          />
        ) : (
          <EmptyState
            icon="folder-open-outline"
            tint="blue"
            title="Your Travel Vault is empty"
            body="Keep passports, visas, tickets and insurance here so Ava can check them before you fly."
            actionLabel="Add your first document"
            onAction={openUpload}
          />
        )
      ) : null}

      {groups.map((g) => (
        <View key={g.type} style={styles.group}>
          <SectionLabel right={<Text style={styles.count}>{g.items.length}</Text>}>{VAULT_TYPE_LABELS[g.type] ?? g.type}</SectionLabel>
          <Card style={styles.card}>
            {g.items.map((d, i) => {
              const primary =
                d.type === "TICKET" && d.bookingId
                  ? {
                      label: "View ticket",
                      icon: "airplane-outline" as const,
                      onPress: () => router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: d.bookingId! } }),
                    }
                  : d.hasBinary && capability?.canDownload !== false
                    ? { label: opening === d.id ? "Opening…" : "Open", icon: "open-outline" as const, onPress: () => void onOpen(d), busy: opening === d.id }
                    : undefined;
              return (
                <DocRow
                  key={d.id}
                  doc={d}
                  last={i === g.items.length - 1}
                  primary={primary}
                  actions={[
                    { label: "Share", icon: "share-outline", onPress: () => void onShare(d) },
                    ...(!d.isPlatformIssued ? [{ label: "Remove", icon: "trash-outline" as const, onPress: () => void onDelete(d), danger: true }] : []),
                  ]}
                />
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.btn,
  },
  addText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onBtn },
  alert: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.md },
  alertWarn: { backgroundColor: "#fdf1dc" },
  alertDanger: { backgroundColor: colors.dangerSoft },
  alertText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14 },
  pillScroll: { marginHorizontal: -space.lg, marginTop: -space.sm },
  pills: { gap: space.sm, paddingHorizontal: space.lg },
  group: { gap: space.sm },
  count: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkFaint, marginRight: space.xs },
  card: { paddingVertical: space.xs, gap: 0 },
});
