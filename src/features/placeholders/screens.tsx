import { ComingSoon } from "@/core/components";

/** Temporary tab screens until each feature's phase lands. */

export function BookPlaceholder() {
  return <ComingSoon title="Book" phase="Phase 4" description="Search flights, stays and cars, then check out." />;
}

export function TripsPlaceholder() {
  return <ComingSoon title="Trips" phase="Phase 5" description="Your journeys, tickets and dashboard." />;
}

export function MorePlaceholder() {
  return (
    <ComingSoon
      title="More"
      phase="Phases 5–6"
      description="Vault, Visa, Rewards, Corporate, Groups, MICE, Refunds, Escalations, Support and Concierge."
    />
  );
}
