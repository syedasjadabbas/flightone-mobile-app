import { baseApi } from "@/core/api/baseApi";
import { PATHS } from "@/core/constants/api";
import type { EffectivePermissions } from "./check";

export const permissionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    myPermissions: builder.query<EffectivePermissions, void>({
      query: () => PATHS.me.permissions,
      providesTags: ["Permissions"],
    }),
  }),
});

export const { useMyPermissionsQuery } = permissionsApi;
