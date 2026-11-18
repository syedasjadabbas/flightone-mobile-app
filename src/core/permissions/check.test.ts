import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasAnyPermission, hasPermissionKey } from "./check.ts";

const perms = {
  global: ["dashboard:read", "refunds:write"],
  byCompany: { co1: ["corporate:company:write"] },
};

describe("permission checks", () => {
  it("matches global keys", () => {
    assert.equal(hasPermissionKey(perms, "dashboard:read"), true);
    assert.equal(hasPermissionKey(perms, "visa:write"), false);
  });

  it("matches company-scoped keys", () => {
    assert.equal(hasPermissionKey(perms, "corporate:company:write", "co1"), true);
    assert.equal(hasPermissionKey(perms, "corporate:company:write", "co2"), false);
    assert.equal(hasPermissionKey(perms, "corporate:company:write"), true);
  });

  it("is false with no permissions loaded", () => {
    assert.equal(hasPermissionKey(null, "dashboard:read"), false);
    assert.equal(hasAnyPermission(undefined, ["dashboard:read"]), false);
  });
});
