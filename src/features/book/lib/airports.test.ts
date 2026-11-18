import { test } from "node:test";
import assert from "node:assert/strict";
import { daysBetween, searchAirports, tileDate, type Airport } from "./airportSearch.ts";

const ALL: Airport[] = [
  { code: "LHE", city: "Lahore", label: "Lahore (LHE)" },
  { code: "DXB", city: "Dubai", label: "Dubai International (DXB)" },
  { code: "LHR", city: "London", label: "London Heathrow (LHR)" },
  { code: "DUB", city: "Dublin", label: "Dublin (DUB)" },
];

test("searchAirports: exact code first, then city prefix, then contains", () => {
  assert.equal(searchAirports(ALL, "dxb")[0].code, "DXB");
  assert.equal(searchAirports(ALL, "dub")[0].code, "DUB");
  assert.equal(searchAirports(ALL, "lond")[0].city, "London");
  assert.equal(searchAirports(ALL, "heathrow")[0].code, "LHR");
  assert.equal(searchAirports(ALL, "zzzz").length, 0);
});

test("searchAirports excludes the other end of the trip", () => {
  assert.ok(!searchAirports(ALL, "", "LHE").some((a) => a.code === "LHE"));
});

test("date helpers", () => {
  assert.equal(tileDate("2026-12-12"), "Sat 12 Dec");
  assert.equal(daysBetween("2026-12-12", "2026-12-15"), 3);
});
