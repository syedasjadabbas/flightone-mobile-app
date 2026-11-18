import { baseApi } from "@/core/api/baseApi";
import type { JourneyCapability, JourneyPollResult, JourneyWatch, Paged } from "./types";

/** My trips (server `modules/journey`). Owner-scoped; no permission keys needed. */
export const journeyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    journeyWatches: build.query<Paged<JourneyWatch> & { capability?: JourneyCapability }, void>({
      // sync=true (server default) first creates watches for newly ticketed bookings.
      query: () => ({ url: "/journey/watches", params: { page: 1, pageSize: 100 } }),
      providesTags: ["Journey"],
    }),
    pollJourney: build.mutation<JourneyPollResult, string>({
      query: (id) => ({ url: `/journey/watches/${id}/poll`, method: "POST" }),
      invalidatesTags: ["Journey"],
    }),
  }),
});

export const { useJourneyWatchesQuery, usePollJourneyMutation } = journeyApi;
