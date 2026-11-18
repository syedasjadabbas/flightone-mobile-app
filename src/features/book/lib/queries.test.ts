import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { carsQuery, flightQuery, isIsoDate, isoDateFromToday, staysQuery } from "./queries.ts";

describe("book → Ava sentences (same wording as web)", () => {
  it("builds round-trip and one-way flight queries", () => {
    const base = { origin: "LHE", destination: "DXB", departureDate: "2026-12-09", returnDate: "2026-12-20", passengers: 2, cabin: "economy" };
    assert.equal(
      flightQuery({ ...base, tripType: "roundtrip" }),
      "Roundtrip flights from LHE to DXB departing 2026-12-09 returning 2026-12-20 for 2 passenger in economy",
    );
    assert.equal(
      flightQuery({ ...base, tripType: "oneway" }),
      "One-way flight from LHE to DXB departing 2026-12-09 for 2 passenger in economy",
    );
  });

  it("spells out rooms only when more than one", () => {
    const s = { destination: "Dubai, UAE", checkIn: "2026-12-09", checkOut: "2026-12-11", guests: 2 };
    assert.equal(staysQuery({ ...s, rooms: 1 }), "Hotels in Dubai, UAE checking in 2026-12-09 checking out 2026-12-11 for 2 guests");
    assert.match(staysQuery({ ...s, rooms: 2 }), / in 2 rooms$/);
  });

  it("adds a drop-off city only for one-way rentals", () => {
    const c = { city: "Dubai", pickupDate: "2026-12-09", dropoffDate: "2026-12-12", dropoffCity: "Abu Dhabi" };
    assert.equal(carsQuery({ ...c, sameReturn: true }), "Rental cars in Dubai from 2026-12-09 to 2026-12-12");
    assert.match(carsQuery({ ...c, sameReturn: false }), /dropping off at Abu Dhabi$/);
  });

  it("handles dates", () => {
    assert.equal(isoDateFromToday(7, new Date("2026-11-18T10:00:00Z")), "2026-11-25");
    assert.equal(isIsoDate("2026-12-09"), true);
    assert.equal(isIsoDate("9 Dec"), false);
  });
});
