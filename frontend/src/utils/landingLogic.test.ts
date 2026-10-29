import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveRouteView,
  getSnippetById,
  getStageById,
  calculateTiltTransform,
  CURATED_C_SNIPPETS,
  COMPILATION_STAGES,
  FEATURE_SPECS
} from "./landingLogic";

test("resolveRouteView routes root path to LANDING and compiler paths to COMPILER", () => {
  assert.equal(resolveRouteView("/", ""), "LANDING");
  assert.equal(resolveRouteView("/compiler", ""), "COMPILER");
  assert.equal(resolveRouteView("/compiler/", ""), "COMPILER");
  assert.equal(resolveRouteView("/lab", ""), "COMPILER");
  assert.equal(resolveRouteView("/playground", ""), "COMPILER");
  assert.equal(resolveRouteView("/", "?autostart=1"), "COMPILER");
  assert.equal(resolveRouteView("/", "?view=compiler"), "COMPILER");
});

test("getSnippetById returns requested snippet or falls back to default", () => {
  const quicksort = getSnippetById("quicksort-partition");
  assert.equal(quicksort.id, "quicksort-partition");
  assert.ok(quicksort.code.includes("void quicksort"));

  const fallback = getSnippetById("non-existent-id");
  assert.equal(fallback.id, CURATED_C_SNIPPETS[0].id);
});

test("getStageById returns compilation pipeline stage accurately", () => {
  const stage = getStageById("sandbox-isolation");
  assert.equal(stage.index, "03");
  assert.ok(stage.command.includes("--cap-drop ALL"));

  const fallback = getStageById("invalid");
  assert.equal(fallback.index, "01");
});

test("calculateTiltTransform computes bounded tilt angles and spotlight coordinates", () => {
  const rect = { left: 100, top: 100, width: 200, height: 100 };
  const center = calculateTiltTransform(200, 150, rect, 6);
  assert.equal(center.rotateX, 0);
  assert.equal(center.rotateY, 0);
  assert.equal(center.spotX, 50);
  assert.equal(center.spotY, 50);

  const topLeft = calculateTiltTransform(100, 100, rect, 6);
  assert.equal(topLeft.rotateX, 6);
  assert.equal(topLeft.rotateY, -6);
  assert.equal(topLeft.spotX, 0);
  assert.equal(topLeft.spotY, 0);
});

test("curated datasets contain complete required properties", () => {
  assert.equal(CURATED_C_SNIPPETS.length, 4);
  assert.equal(COMPILATION_STAGES.length, 4);
  assert.equal(FEATURE_SPECS.length, 4);
});
