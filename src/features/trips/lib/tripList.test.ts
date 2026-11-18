import { test } from "node:test";
import assert from "node:assert/strict";
import type { JourneyWatch } from "../api/types.ts";
import { countdownLabel, groupByMonth, matchesQuery, sortTrips, tripDay, tripView } from "./tripList.ts";

const trip = (id: string, extra: Partial<JourneyWatch> = {}): JourneyWatch => ({
  id,
  bookingId: `b-${id}`,
  userId: "u",
  status: "ACTIVE",
  phase: "UPCOMING",
  flightNumber: null,
  departAt: null,
  arriveAt: null,
  lastPolledAt: null,
  metadata: null,
  ...extra,
});

const flight = (departDate: string) => ({ itinerary: [{ kind: "FLIGHT", departDate, origin: "LHE", destination: "DXB" }] });

test("tripDay prefers the flight date, then hotel check-in, then departAt", () => {
  assert.equal(tripDay(trip("a", flight("2026-12-20"))), "2026-12-20");
  assert.equal(tripDay(trip("b", { itinerary: [{ kind: "HOTEL", checkInDate: "2026-12-05T00:00:00Z" }] })), "2026-12-05");
  assert.equal(tripDay(trip("c", { departAt: "2027-01-02T09:00:00Z" })), "2027-01-02");
  assert.equal(tripDay(trip("d")), null);
});

test("tripView buckets in-progress with upcoming, and cancelled separately", () => {
  assert.equal(tripView(trip("a", { phase: "IN_PROGRESS" })), "upcoming");
  assert.equal(tripView(trip("b", { phase: "COMPLETED" })), "past");
  assert.equal(tripView(trip("c", { status: "CANCELLED" })), "cancelled");
});

test("sortTrips: upcoming soonest first, past latest first, undated last", () => {
  const list = [trip("x", flight("2026-12-20")), trip("y"), trip("z", flight("2026-12-01"))];
  assert.deepEqual(sortTrips(list, "upcoming").map((t) => t.id), ["z", "x", "y"]);
  assert.deepEqual(sortTrips(list, "past").map((t) => t.id), ["x", "z", "y"]);
});

test("groupByMonth groups sorted trips into month sections", () => {
  const list = sortTrips([trip("a", flight("2026-12-20")), trip("b", flight("2027-01-03")), trip("c", flight("2026-12-01"))], "upcoming");
  const sections = groupByMonth(list);
  assert.deepEqual(sections.map((s) => [s.key, s.data.map((t) => t.id)]), [
    ["2026-12", ["c", "a"]],
    ["2027-01", ["b"]],
  ]);
  assert.equal(sections[0].title, "December 2026");
});

test("countdownLabel", () => {
  assert.equal(countdownLabel("2026-11-18", "2026-11-18"), "Today");
  assert.equal(countdownLabel("2026-11-19", "2026-11-18"), "Tomorrow");
  assert.equal(countdownLabel("2026-11-25", "2026-11-18"), "In 7 days");
  assert.equal(countdownLabel("2026-12-16", "2026-11-18"), "In 4 weeks");
  assert.equal(countdownLabel("2026-11-01", "2026-11-18"), null);
});

test("matchesQuery searches route, ref and city", () => {
  const w = trip("a", { booking: { id: "b", status: "TICKETED", product: "flight", ticketRef: "PAHETV" } });
  const head = { route: "LHE → DXB", sub: "Emirates · EK623" };
  assert.ok(matchesQuery(w, head, "dxb"));
  assert.ok(matchesQuery(w, head, "pahetv"));
  assert.ok(matchesQuery(w, head, "emirates"));
  assert.ok(!matchesQuery(w, head, "london"));
});
