import { test } from "node:test";
import assert from "node:assert/strict";
import type { OfferCard } from "../types.ts";
import { NO_FILTERS, activeFilterCount, applyFilters, cheapest, facets, sortOffers, timeKey } from "./resultsFilter.ts";

const flight = (id: string, price: number, airline: string, stops: number, depart: string, minutes: number, extra = {}): OfferCard => ({
  id,
  type: "flight",
  angle: "best",
  title: airline,
  subtitle: "",
  price: `PKR ${price}`,
  priceMinor: price * 100,
  currency: "PKR",
  marketPrice: null,
  savingsPct: null,
  reasons: [],
  badges: [],
  flight: {
    airline,
    airlineCode: airline.slice(0, 2).toUpperCase(),
    originCode: "LHE",
    destinationCode: "LHR",
    originCity: "Lahore",
    destinationCity: "London",
    departTimeLocal: depart,
    arriveTimeLocal: null,
    durationMinutes: minutes,
    stops,
    cabin: "economy",
    ...extra,
  },
});

const offers = [
  flight("a", 400000, "Qatar Airways", 1, "03:35", 860),
  flight("b", 316000, "Emirates", 1, "10:40", 900, { baggageKg: 30 }),
  flight("c", 520000, "PIA", 0, "13:15", 520, { refundable: true }),
  flight("d", 290000, "Turkish Airlines", 2, "22:05", 1300),
];

test("timeKey buckets departure times", () => {
  assert.equal(timeKey("03:35"), "night");
  assert.equal(timeKey("05:00"), "morning");
  assert.equal(timeKey("12:00"), "afternoon");
  assert.equal(timeKey("17:30"), "evening");
  assert.equal(timeKey(null), null);
});

test("sortOffers keeps recommended order, sorts by price and duration", () => {
  assert.deepEqual(sortOffers(offers, "angle").map((o) => o.id), ["a", "b", "c", "d"]);
  assert.deepEqual(sortOffers(offers, "price").map((o) => o.id), ["d", "b", "a", "c"]);
  assert.deepEqual(sortOffers(offers, "duration").map((o) => o.id), ["c", "a", "b", "d"]);
});

test("applyFilters: stops, airlines, times, price, baggage, refundable", () => {
  const ids = (f: Partial<typeof NO_FILTERS>) => applyFilters(offers, { ...NO_FILTERS, ...f }).map((o) => o.id);
  assert.deepEqual(ids({ stops: [0] }), ["c"]);
  assert.deepEqual(ids({ stops: [1, 2] }), ["a", "b", "d"]);
  assert.deepEqual(ids({ airlines: ["Emirates", "PIA"] }), ["b", "c"]);
  assert.deepEqual(ids({ times: ["night"] }), ["a", "d"]);
  assert.deepEqual(ids({ maxPriceMinor: 32000000 }), ["b", "d"]);
  assert.deepEqual(ids({ baggage: true }), ["b"]);
  assert.deepEqual(ids({ refundable: true }), ["c"]);
  assert.equal(activeFilterCount({ ...NO_FILTERS, stops: [0], baggage: true }), 2);
});

test("facets and cheapest", () => {
  const f = facets(offers);
  assert.deepEqual(f.stops, [0, 1, 2]);
  assert.equal(f.airlines.length, 4);
  assert.deepEqual(f.times, ["morning", "afternoon", "night"]);
  assert.equal(f.priceMin, 29000000);
  assert.equal(f.priceMax, 52000000);
  assert.equal(cheapest(offers)?.id, "d");
});
