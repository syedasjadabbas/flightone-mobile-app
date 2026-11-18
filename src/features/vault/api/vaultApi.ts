import { baseApi } from "@/core/api/baseApi";
import type { VaultDocument, VaultStorageCapability, VaultUploadBody } from "./types";

/** Traveller Vault (server `modules/vault`). Owner-only; no permission keys needed. */
export const vaultApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    vaultCapability: build.query<VaultStorageCapability, void>({
      query: () => "/vault/capability",
      providesTags: ["Vault"],
    }),
    vaultDocuments: build.query<{ items: VaultDocument[]; total: number }, void>({
      query: () => "/vault",
      providesTags: ["Vault"],
    }),
    /** Upload straight to the vault as base64 (same path the web Profile → Documents tab uses). */
    uploadVaultDocument: build.mutation<VaultDocument, VaultUploadBody>({
      query: (body) => ({ url: "/vault/upload", method: "POST", body }),
      invalidatesTags: ["Vault"],
    }),
    deleteVaultDocument: build.mutation<VaultDocument, string>({
      query: (id) => ({ url: `/vault/${id}`, method: "DELETE" }),
      invalidatesTags: ["Vault"],
    }),
    shareVaultDocument: build.mutation<{ token: string; expiresAt: string }, { id: string; ttlHours?: number }>({
      query: ({ id, ttlHours = 24 }) => ({ url: `/vault/${id}/share`, method: "POST", body: { ttlHours } }),
    }),
  }),
});

export const {
  useVaultCapabilityQuery,
  useVaultDocumentsQuery,
  useUploadVaultDocumentMutation,
  useDeleteVaultDocumentMutation,
  useShareVaultDocumentMutation,
} = vaultApi;
