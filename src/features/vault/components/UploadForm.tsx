import { useState } from "react";
import { Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Button, Card, Notice, TextField, DateField } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { type } from "@/core/theme/tokens";
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
export function UploadForm({ capability, onDone }: { capability: VaultStorageCapability | undefined; onDone: (msg: string) => void }) {
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
      <Card>
        <Text style={type.h3}>{scan.title} saved</Text>
        <DocumentScanPanel documentId={scan.id} onDone={finish} />
        <Button label="Skip for now" variant="ghost" onPress={finish} />
      </Card>
    );
  }

  if (capability && !capability.canUpload) {
    return <Notice tone="info" message={capability.reasons[0] || "Document uploads aren't available right now."} />;
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

  return (
    <Card>
      <Text style={type.h3}>Add a document</Text>
      <ChoiceRow
        label="Type"
        options={UPLOAD_TYPES.map((t) => ({ value: t, label: VAULT_TYPE_LABELS[t] ?? t }))}
        value={docType}
        onChange={setDocType}
      />
      <TextField label="Title" value={title} onChangeText={setTitle} maxLength={200} />
      <DateField label="Expiry date (optional)" value={expiresAt} onChange={setExpiresAt} optional minimumDate={new Date()} />
      <Button label={file ? `Change file (${file.name})` : "Choose file"} variant="ghost" onPress={pick} />
      <Text style={type.bodySoft}>PDF or photo, up to {Math.round(maxBytes / 1024 / 1024)} MB. Stored encrypted; only you can open it.</Text>
      {error ? <Notice message={error} /> : null}
      <Button label="Save to vault" onPress={submit} loading={uploadState.isLoading || identityState.isLoading} disabled={!file} />
    </Card>
  );
}
