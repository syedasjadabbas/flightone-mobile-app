import { useState } from "react";
import { router } from "expo-router";
import { formatApiError } from "@/core/api/formatApiError";
import type { OfferCard } from "@/features/ava/types";
import { useCorporateProfileStore } from "@/features/corporate/store/corporateProfile.store";
import { useQuoteOfferMutation } from "../api/bookingsApi";
import { bookingBlocked } from "../lib/bookability";

const EXPIRED = "That fare's quote has expired. Run the search again and I'll re-price it.";

/**
 * Offer → quote → checkout screen. Same rules as the web's `startCheckout`:
 * never open a quote that can't be fulfilled (it would leave a dead QUOTED
 * booking), and explain an expired fare instead of a generic error.
 */
export function useStartCheckout(offer: OfferCard) {
  const [quote, { isLoading }] = useQuoteOfferMutation();
  const [error, setError] = useState<string | null>(null);
  const blocked = bookingBlocked(offer);

  async function start() {
    setError(null);
    if (blocked) {
      setError(blocked.reason);
      return;
    }
    try {
      // Company profile: the server verifies membership and tags the quote to the company.
      const { mode, companyId } = useCorporateProfileStore.getState();
      const body = { ...(offer as unknown as Record<string, unknown>), ...(mode === "CORPORATE" && companyId ? { companyId } : {}) };
      const booking = await quote(body).unwrap();
      if (!booking?.id) {
        setError("Checkout didn't return a booking reference. Please try that fare again.");
        return;
      }
      router.push({ pathname: "/checkout/[bookingId]", params: { bookingId: booking.id } });
    } catch (err) {
      const e = err as { status?: number; data?: { code?: string; message?: string } };
      if (e?.data?.code === "FARE_UNAVAILABLE" && e.data.message) setError(e.data.message);
      else if (e?.status === 409) setError(EXPIRED);
      else setError(formatApiError(err, "I couldn't start checkout for that fare. Please try again."));
    }
  }

  return { start, isLoading, error, blocked };
}
