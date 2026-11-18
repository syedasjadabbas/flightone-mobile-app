import { test } from "node:test";
import assert from "node:assert/strict";
import { GROUPS, SECTIONS, isSectionKey, missingLabel, sectionForMissing } from "./profileSections.ts";

test("every section appears in exactly one group", () => {
  const keys = GROUPS.flatMap((g) => g.keys);
  assert.deepEqual([...keys].sort(), Object.keys(SECTIONS).sort());
});

test("missing items point at the row that fixes them", () => {
  assert.equal(sectionForMissing("passport"), "documents");
  assert.equal(sectionForMissing("emergencyContact"), "emergency");
  assert.equal(sectionForMissing("seatPref"), "preferences");
  assert.equal(missingLabel("mealPref"), "Meal preference");
  assert.equal(missingLabel("frequentRoute"), "Frequent Route");
});

test("isSectionKey", () => {
  assert.ok(isSectionKey("security"));
  assert.ok(!isSectionKey("nope"));
});
