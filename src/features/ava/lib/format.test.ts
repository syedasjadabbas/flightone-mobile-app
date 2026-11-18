import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { angleLabel, formatDuration, formatStops, stars } from "./format.ts";

describe("offer formatting", () => {
  it("formats durations", () => {
    assert.equal(formatDuration(200), "3h 20m");
    assert.equal(formatDuration(120), "2h");
    assert.equal(formatDuration(45), "45m");
    assert.equal(formatDuration(0), "");
  });

  it("formats stops", () => {
    assert.equal(formatStops(0), "Non-stop");
    assert.equal(formatStops(1), "1 stop");
    assert.equal(formatStops(2), "2 stops");
  });

  it("labels angles and stars", () => {
    assert.equal(angleLabel("best_value"), "Best value");
    assert.equal(angleLabel("red_eye"), "Red eye");
    assert.equal(stars(4), "★★★★");
    assert.equal(stars(0), "");
  });
});
