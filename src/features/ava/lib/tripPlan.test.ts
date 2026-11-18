import { test } from "node:test";
import assert from "node:assert/strict";
import { cabinLabel, chipDate, planSummary, shiftDay, spokenDate } from "./tripPlan.ts";

test("planSummary reads a flight search", () => {
  const plan = {
    action: "search",
    searches: [
      {
        product: "FLIGHT",
        query: { origin: "LHE", destination: "DXB", departureDate: "2026-12-12", returnDate: "2026-12-20", passengers: 2, cabinClass: "BUSINESS" },
      },
    ],
  };
  assert.deepEqual(planSummary(plan), {
    kind: "flight",
    origin: "LHE",
    destination: "DXB",
    departureDate: "2026-12-12",
    returnDate: "2026-12-20",
    passengers: 2,
    cabin: "business",
  });
});

test("planSummary reads a clarify draft and a hotel search", () => {
  const clarify = { action: "clarify", draft: { searches: [{ product: "FLIGHT", query: { origin: "LHE", destination: "IST", departureDate: "" } }] } };
  const s = planSummary(clarify);
  assert.equal(s?.kind, "flight");
  assert.equal(s?.kind === "flight" && s.departureDate, null);

  const hotel = { action: "search", searches: [{ product: "HOTEL", query: { cityCode: "DXB", checkInDate: "2026-12-02", checkOutDate: "2026-12-05", guests: 2 } }] };
  assert.deepEqual(planSummary(hotel), { kind: "hotel", city: "DXB", checkIn: "2026-12-02", checkOut: "2026-12-05", guests: 2 });
});

test("planSummary returns null without a usable search", () => {
  assert.equal(planSummary(null), null);
  assert.equal(planSummary({ action: "clarify" }), null);
  assert.equal(planSummary({ action: "search", searches: [{ product: "FLIGHT", query: { origin: "LHE" } }] }), null);
});

test("date helpers", () => {
  assert.equal(chipDate("2026-12-12"), "12 Dec");
  assert.equal(chipDate(null), null);
  assert.equal(spokenDate("2026-12-12"), "12 December 2026");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDay("2026-12-01", -1), "2026-11-30");
  assert.equal(cabinLabel("premium_economy"), "Premium economy");
});
