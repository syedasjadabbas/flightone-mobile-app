import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSseParser } from "./sse.ts";

describe("createSseParser", () => {
  it("parses whole events", () => {
    const push = createSseParser();
    assert.deepEqual(push('data: {"type":"status","phase":"search"}\n\n'), [{ type: "status", phase: "search" }]);
  });

  it("joins events split across chunks", () => {
    const push = createSseParser();
    assert.deepEqual(push('data: {"type":"tok'), []);
    assert.deepEqual(push('en","delta":"Hi"}\n'), []);
    assert.deepEqual(push('\ndata: {"type":"done"}\n\n'), [{ type: "token", delta: "Hi" }, { type: "done" }]);
  });

  it("handles CRLF and skips malformed or [DONE] events", () => {
    const push = createSseParser();
    const out = push('data: nope\r\n\r\ndata: [DONE]\r\n\r\ndata: {"ok":1}\r\n\r\n');
    assert.deepEqual(out, [{ ok: 1 }]);
  });
});
