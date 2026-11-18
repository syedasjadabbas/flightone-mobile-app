import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatApiError } from "./formatApiError.ts";

describe("formatApiError", () => {
  it("prefers a safe server message", () => {
    assert.equal(formatApiError({ status: 400, data: { message: "Email already in use." } }), "Email already in use.");
  });

  it("hides technical server text", () => {
    assert.equal(
      formatApiError({ status: 500, data: { message: "PrismaClientKnownRequestError P2002" } }),
      "Something went wrong on our side. Please try again.",
    );
  });

  it("maps network failures", () => {
    assert.match(formatApiError({ status: "FETCH_ERROR" }), /Can't reach FlightOne/);
  });

  it("falls back for unknown input", () => {
    assert.equal(formatApiError(null), "Something went wrong. Please try again.");
  });
});
