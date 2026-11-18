import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "@/core/config/env";
import { clientHeaders } from "@/core/api/headers";
import { useAuthStore } from "@/core/auth/auth.store";
import { refreshSessionOnce } from "@/core/auth/refreshSession";
import type { VaultDocument } from "../api/types";

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return { ...clientHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function safeName(doc: VaultDocument): string {
  const ext = doc.originalFilename?.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? (doc.contentType === "application/pdf" ? ".pdf" : "");
  const base = (doc.title || "document").replace(/[^a-z0-9 _-]+/gi, "").trim().slice(0, 60) || "document";
  return `${base}${ext}`;
}

/**
 * Download a vault file (GET /vault/:id/download, raw bytes, owner only) and
 * open it in the phone's preview/share sheet. One refresh-and-retry on 401,
 * same as the rest of the app. Files go to the cache folder only.
 */
export async function openVaultFile(doc: VaultDocument): Promise<void> {
  const url = `${API_BASE_URL}/vault/${doc.id}/download`;

  if (Platform.OS === "web") {
    let res = await fetch(url, { headers: authHeaders() });
    if (res.status === 401 && (await refreshSessionOnce())) res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(res.status === 409 ? "This document is no longer active." : "Couldn't open the file.");
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
    return;
  }

  const target = new File(Paths.cache, `${doc.id}-${safeName(doc)}`);
  const download = () => File.downloadFileAsync(url, target, { headers: authHeaders(), idempotent: true });
  let file: File;
  try {
    file = await download();
  } catch (err) {
    // The native downloader reports HTTP errors as exceptions; retry once after a refresh.
    if (!(await refreshSessionOnce())) throw err;
    file = await download();
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("Opening files isn't available on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: doc.contentType ?? undefined,
    dialogTitle: doc.title,
    UTI: doc.contentType === "application/pdf" ? "com.adobe.pdf" : undefined,
  });
}
