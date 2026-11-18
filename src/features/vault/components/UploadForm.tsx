import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { Button, Card, Notice, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import { useCreateIdentityDocumentMutation } from "@/features/profile/api/profileApi";
import { DocumentScanPanel } from "@/features/profile/components/DocumentScanPanel";
import { useUploadVaultDocumentMutation } from "../api/vaultApi";
import type { VaultDocType, VaultStorageCapability } from "../api/types";
import { VAULT_TYPE_LABELS } from "../lib/visaStatus";

const UPLOAD_TYPES: VaultDocType[] = ["PASSPORT", "NATIONAL_ID", "VISA", "RESIDENCE_PERMIT", "INSURANCE", "TICKET", "HOTEL_VOUCHER", "OTHER"];
const IDENTITY = new Set<VaultDocType>(["PASSPORT", "NATIONAL_ID", "VISA", "RESIDENCE_PERMIT"]);
/** Same types the server's upload signer accepts. */
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type Picked = { name: string; mimeType: string; size: number; base64: string };

/**
 * Add a document: pick a file → POST /vault/upload (base64) → for identity
 * documents also POST /profile/documents, same as the web's upload flow.
 */
export function UploadForm({
  capability,
  onDone,
  onCancel,
}: {
  capability: VaultStorageCapability | undefined;
  onDone: (msg: string) => void;
  onCancel?: () => void;
}) {
  const [upload, uploadState] = useUploadVaultDocumentMutation();
  const [createIdentity, identityState] = useCreateIdentityDocumentMutation();
  const [docType, setDocType] = useState<VaultDocType>("PASSPORT");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scan, setScan] = useState<{ id: string; title: string } | null>(null);
  const maxBytes = capability?.maxBytes ?? 10 * 1024 * 1024;
  const allowed = capability?.allowedMimeTypes?.length ? capability.allowedMimeTypes : ALLOWED;

  if (scan) {
    const finish = () => {
      setScan(null);
      setTitle("");
      setExpiresAt("");
      onDone(`${scan.title} saved to your vault.`);
    };
    return (
      <Card title={`${scan.title} saved`} subtitle="Let Ava read the details from your scan" icon="checkmark-circle" tint="green">
        <DocumentScanPanel documentId={scan.id} onDone={finish} />
        <Button label="Skip for now" variant="ghost" onPress={finish} />
      </Card>
    );
  }

  if (capability && !capability.canUpload) {
    return (
      <View style={styles.gap}>
        <Notice tone="info" message={capability.reasons[0] || "Document uploads aren't available right now."} />
        {onCancel ? <Button label="Close" variant="ghost" onPress={onCancel} /> : null}
      </View>
    );
  }

  const pick = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: allowed, base64: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const mime = a.mimeType ?? "";
    if (!allowed.includes(mime)) return setError("Choose a PDF, JPEG, PNG or WebP file.");
    if (a.size && a.size > maxBytes) return setError(`That file is over ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    const raw = a.base64 ?? "";
    const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
    if (!base64) return setError("Couldn't read that file. Try another one.");
    setFile({ name: a.name, mimeType: mime, size: a.size ?? 0, base64 });
    if (!title.trim()) setTitle(VAULT_TYPE_LABELS[docType] ?? "Document");
  };

  const submit = async () => {
    setError(null);
    if (!file) return setError("Choose a file first.");
    if (!title.trim()) return setError("Give the document a title.");
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt.trim())) return setError("Expiry date looks like 2030-04-15.");
    try {
      const doc = await upload({
        type: docType,
        title: title.trim(),
        contentType: file.mimeType,
        originalFilename: file.name,
        contentBase64: file.base64,
        ...(expiresAt.trim() ? { expiresAt: expiresAt.trim() } : {}),
      }).unwrap();
      if (IDENTITY.has(docType) && doc.hasBinary) {
        const identity = await createIdentity({
          type: docType as "PASSPORT" | "NATIONAL_ID" | "VISA" | "RESIDENCE_PERMIT",
          vaultDocumentId: doc.id,
          ...(expiresAt.trim() ? { expiresAt: expiresAt.trim() } : {}),
        })
          .unwrap()
          .catch(() => null); // the file is safely in the vault even if this link fails
        if (identity) {
          // Same as web: go straight to reading the details from the scan.
          setScan({ id: identity.id, title: doc.title });
          setFile(null);
          return;
        }
      }
      setFile(null);
      setTitle("");
      setExpiresAt("");
      onDone(`${doc.title} saved to your vault.`);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const cancel = onCancel ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onCancel} hitSlop={10} style={styles.close}>
      <Ionicons name="close" size={18} color={colors.inkSoft} />
    </Pressable>
  ) : null;

  return (
    <Card title="Add a document" subtitle="Stored encrypted; only you can open it" icon="cloud-upload-outline" tint="blue" right={cancel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={file ? `Change file, ${file.name}` : "Choose file"}
        onPress={pick}
        style={({ pressed }) => [styles.drop, file && styles.dropOn, pressed && styles.pressed]}
      >
        <Ionicons name={file ? "document-attach" : "add-circle-outline"} size={26} color={file ? colors.success : colors.accent} />
        <View style={styles.dropText}>
          <Text style={styles.dropTitle} numberOfLines={1}>
            {file ? file.name : "Choose a file"}
          </Text>
          <Text style={type.bodySoft}>
            {file ? "Tap to change" : `PDF or photo, up to ${Math.round(maxBytes / 1024 / 1024)} MB`}
          </Text>
        </View>
      </Pressable>
      <ChoiceRow
        label="Type"
        options={UPLOAD_TYPES.map((t) => ({ value: t, label: VAULT_TYPE_LABELS[t] ?? t }))}
        value={docType}
        onChange={setDocType}
      />
      <TextField label="Title" value={title} onChangeText={setTitle} maxLength={200} />
      <DateField label="Expiry date (optional)" value={expiresAt} onChange={setExpiresAt} optional minimumDate={new Date()} />
      {error ? <Notice message={error} /> : null}
      <Button label="Save to vault" onPress={submit} loading={uploadState.isLoading || identityState.isLoading} disabled={!file} />
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  drop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  dropOn: { borderStyle: "solid", borderColor: colors.success, backgroundColor: colors.successSoft },
  pressed: { opacity: 0.8 },
  dropText: { flex: 1, gap: 2 },
  dropTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
});
