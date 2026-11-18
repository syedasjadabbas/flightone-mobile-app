import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fibonacciSphere, greatCircle, latLonToVec, project, yawFacing } from "./globe.ts";

const len = (v: number[]) => Math.hypot(...v);

describe("globe maths", () => {
  it("spreads points on the unit sphere", () => {
    const pts = fibonacciSphere(200);
    assert.equal(pts.length, 200);
    for (const p of pts) assert.ok(Math.abs(len(p) - 1) < 1e-9);
  });

  it("puts a city facing the viewer when yawed to its longitude", () => {
    const lahore = latLonToVec(0, 74.4);
    const p = project(lahore, yawFacing(74.4), 0);
    assert.ok(Math.abs(p.x) < 1e-9);
    assert.ok(p.z > 0.99);
  });

  it("north is up on screen", () => {
    const pole = project(latLonToVec(90, 0), 0, 0);
    assert.ok(pole.y < -0.99);
  });

  it("arcs start and end on the cities and rise in the middle", () => {
    const a = latLonToVec(31.5, 74.4);
    const b = latLonToVec(51.5, -0.45);
    const arc = greatCircle(a, b, 20);
    assert.equal(arc.length, 21);
    assert.ok(len(arc[0]) - 1 < 1e-9 && len(arc[20]) - 1 < 1e-9);
    assert.ok(len(arc[10]) > 1.05);
  });
});
