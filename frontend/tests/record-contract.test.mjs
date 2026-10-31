import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Exercise the actual TS derivation with the already installed Vite toolchain.
// No generated bundle, browser, backend or model request is needed.
const bundle = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/observatory-data.ts", import.meta.url)),
  ],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { buildCaseView, formatRecordTime } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const original = JSON.parse(
  await readFile(new URL("../src/live-case.json", import.meta.url), "utf8"),
);
const record = () => structuredClone(original);
const phase = (view, id) => view.casePhases.find((item) => item.id === id);
const withoutCheck = (value, name) => {
  value.checks = value.checks.filter((check) => check !== name);
};

test("the retained case preserves its measured outcome without mutating the record", () => {
  const value = record();
  const before = structuredClone(value);
  const view = buildCaseView(value);
  assert.deepEqual(value, before);
  assert.equal(view.outcome.beforeStatus, 500);
  assert.equal(view.outcome.afterStatus, 200);
  assert.equal(view.outcome.hasInitialSuccess, true);
  assert.equal(view.outcome.hasSuccessfulApproval, true);
  assert.equal(view.outcome.hasVerifiedRecovery, true);
  assert.equal(view.outcome.modelToolCount, 2);
  assert.equal(view.outcome.checkCount, 8);
  assert.equal(view.outcome.durationSeconds, 9.5);
  assert.equal(view.caseDate, "19 Ekim 2026");
  assert.equal(phase(view, "recovery").app, "healthy");
});

test("missing or non-successful approval never claims a successful repair", async (t) => {
  for (const status of [
    null,
    "requested",
    "approved",
    "executing",
    "failed",
    "rejected",
  ]) {
    await t.test(String(status ?? "absent"), () => {
      const value = record();
      if (status === null) value.incident.story.approvals = [];
      else value.incident.story.approvals[0].status = status;
      const view = buildCaseView(value);
      assert.equal(view.outcome.hasSuccessfulApproval, false);
      assert.equal(view.outcome.hasVerifiedRecovery, false);
      assert.equal(view.outcome.afterStatus, null);
      assert.equal(phase(view, "action").app, "checking");
      assert.match(phase(view, "action").heading, /doğrulanamadı/);
      assert.equal(phase(view, "recovery").tone, "checking");
    });
  }
});

test("an approval for another incident, target or runbook cannot supply this repair", async (t) => {
  for (const [key, replacement] of [
    ["incident_id", "another-incident"],
    ["target", "sample-postgres"],
    ["runbook", "another-runbook:v1"],
  ]) {
    await t.test(key, () => {
      const value = record();
      value.incident.story.approvals[0][key] = replacement;
      const view = buildCaseView(value);
      assert.equal(view.outcome.hasSuccessfulApproval, false);
      assert.equal(view.outcome.afterStatus, null);
    });
  }
});

test("missing success assertions do not fabricate HTTP or recovery success", async (t) => {
  for (const name of original.checks.filter((check) =>
    /initial HTTP|injected HTTP|approved fixed|post-action HTTP|closed incident/.test(
      check,
    ),
  )) {
    await t.test(name, () => {
      const value = record();
      withoutCheck(value, name);
      const view = buildCaseView(value);
      if (name === "initial HTTP 200") {
        assert.equal(view.outcome.hasInitialSuccess, false);
        assert.equal(phase(view, "before").app, "checking");
      } else if (name === "real injected HTTP 500") {
        assert.equal(view.outcome.beforeStatus, null);
        for (const id of ["failure", "detection", "agent"])
          assert.doesNotMatch(phase(view, id).response, /500/);
      } else if (name === "monitoring closed incident with recovery") {
        assert.equal(view.outcome.hasVerifiedRecovery, false);
        assert.equal(phase(view, "recovery").app, "checking");
      } else {
        assert.equal(view.outcome.afterStatus, null);
        assert.equal(view.outcome.hasSuccessfulApproval, false);
        assert.equal(view.outcome.hasVerifiedRecovery, false);
      }
    });
  }
});

test("missing, unhealthy or unrelated recovery is unknown even when incident status is resolved", async (t) => {
  const cases = [
    ["absent", (value) => (value.incident.story.recovery = null)],
    [
      "unhealthy",
      (value) =>
        (value.incident.story.recovery.payload.data.observation.healthy = false),
    ],
    [
      "other incident",
      (value) => (value.incident.story.recovery.incident_id = "another"),
    ],
    [
      "other service",
      (value) =>
        (value.incident.story.recovery.payload.service_id = "sample-postgres"),
    ],
    ["not resolved", (value) => (value.incident.status = "open")],
  ];
  for (const [name, change] of cases) {
    await t.test(name, () => {
      const value = record();
      change(value);
      const view = buildCaseView(value);
      assert.equal(view.outcome.hasVerifiedRecovery, false);
      assert.equal(view.outcome.durationSeconds, null);
      assert.equal(phase(view, "recovery").app, "checking");
      assert.equal(phase(view, "recovery").response, "Sonuç bilinmiyor");
      assert.match(phase(view, "recovery").heading, /doğrulanamadı/);
    });
  }
});

test("a non-200 post-action result cannot be displayed as healthy", () => {
  const value = record();
  value.incident.story.approvals[0].result.after.http_status = 503;
  const view = buildCaseView(value);
  assert.equal(view.outcome.afterStatus, null);
  assert.equal(view.outcome.hasSuccessfulApproval, false);
  assert.equal(phase(view, "action").app, "checking");
});

test("missing completed model report removes AI tools and completion claims", () => {
  const value = record();
  value.incident.diagnoses[0].report = null;
  const view = buildCaseView(value);
  assert.equal(view.caseReport, null);
  assert.equal(view.modelTools.length, 0);
  assert.match(phase(view, "agent").heading, /raporu yok/);
  assert.deepEqual(phase(view, "agent").evidenceIds, []);
});

test("only known model tools correlated to the selected diagnosis and incident count", () => {
  const value = record();
  const tool = value.incident.story.actions.find(
    (item) => item.action === "tool.get_incident_evidence",
  );
  for (const addition of [
    { details: {} },
    { details: { run_id: "unrelated-run" } },
    { target: "another-incident" },
    { actor: "monitoring" },
    { action: "tool.collect_telemetry" },
    { action: "constructor" },
  ]) {
    value.incident.story.actions.push({
      ...structuredClone(tool),
      ...addition,
      id: JSON.stringify(addition),
    });
  }
  assert.equal(buildCaseView(value).outcome.modelToolCount, 2);
  delete tool.details.run_id;
  assert.equal(buildCaseView(value).outcome.modelToolCount, 1);
});

test("unavailable sections and unknown evidence references stay empty", () => {
  const value = record();
  value.incident.diagnoses[0].report.findings[0].evidence_ids.push(
    "missing-evidence",
  );
  assert.ok(
    !phase(buildCaseView(value), "agent").evidenceIds.includes(
      "missing-evidence",
    ),
  );
  delete value.incident.story;
  delete value.incident.diagnoses;
  delete value.incident.evidence;
  const view = buildCaseView(value);
  assert.equal(view.outcome.hasInitialSuccess, false);
  assert.equal(view.outcome.hasSuccessfulApproval, false);
  assert.equal(view.outcome.hasVerifiedRecovery, false);
  assert.equal(view.outcome.beforeStatus, null);
  assert.equal(view.outcome.modelToolCount, 0);
});

test("invalid dates never become a January 1970 case or a measured duration", () => {
  const value = record();
  value.incident.created_at = "invalid";
  value.incident.story.recovery.observed_at = "invalid";
  const view = buildCaseView(value);
  assert.equal(view.caseDate, "Tarih bilgisi yok");
  assert.equal(view.outcome.durationSeconds, null);
  assert.equal(formatRecordTime("invalid"), "Zaman bilgisi yok");
  assert.equal(formatRecordTime("2026-10-18T21:57:38Z"), "00:57:38");
});

test("equal timestamps preserve recorded action order", () => {
  const value = record();
  for (const action of value.incident.story.actions)
    action.created_at = "2026-10-18T21:57:38Z";
  assert.deepEqual(
    buildCaseView(value).caseAudit.map((action) => action.id),
    value.incident.story.actions.map((action) => action.id),
  );
});
