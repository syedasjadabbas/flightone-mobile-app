import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { starterRoutes } from "./starterRoutes.ts";

const today = new Date("2026-11-18T10:00:00Z");

describe("starterRoutes", () => {
  it("defaults to Lahore like the web", () => {
    const r = starterRoutes(today);
    assert.equal(r[0].title, "Lahore → Dubai");
    assert.match(r[0].prompt, /^Cheapest Lahore to Dubai on 9 December$/);
  });

  it("starts from the traveller's city", () => {
    const r = starterRoutes(today, "Karachi");
    assert.equal(r[0].title, "Karachi → Dubai");
    assert.match(r[1].prompt, /^Round trip Karachi to London/);
    assert.match(r[2].prompt, /Paris back to Karachi/);
  });

  it("never suggests flying to where you already are", () => {
    assert.equal(starterRoutes(today, "Dubai")[0].title, "Dubai → Istanbul");
    assert.equal(starterRoutes(today, "London")[1].title, "London ⇄ New York");
    assert.equal(starterRoutes(today, "London")[2].title, "Rome & Barcelona");
  });
});
