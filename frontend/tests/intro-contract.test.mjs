import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/intro-slides.ts", import.meta.url)),
  ],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { buildIntroSlides, buildIntroProof } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const original = JSON.parse(
  await readFile(new URL("../src/live-case.json", import.meta.url), "utf8"),
);
const record = () => structuredClone(original);
const slide = (value, id) =>
  buildIntroSlides(value).find((item) => item.id === id);
const text = (value) => JSON.stringify(value);

test("the intro explains purpose, tools and measured stages without mutating the record", () => {
  const value = record();
  const before = structuredClone(value);
  const slides = buildIntroSlides(value);
  assert.deepEqual(value, before);
  assert.deepEqual(
    slides.map((item) => item.id),
    ["purpose", "stack", "failure", "detection", "agent", "action", "recovery"],
  );
  assert.ok(slides.every((item) => item.facts.length <= 3));
  assert.match(text(slide(value, "purpose")), /kayıtlı.*laboratuvar/);
  assert.match(text(slide(value, "stack")), /Windows \+ SQLite/);
  assert.match(text(slide(value, "agent")), /2 kayıtlı çağrı/);
  assert.match(text(slide(value, "agent")), /gpt-4o-mini/);
  assert.match(text(slide(value, "recovery")), /Toparlanma ile kapandı/);
  assert.deepEqual(buildIntroProof(value), {
    environment: "Windows + SQLite laboratuvarı",
    hasEvidenceTool: true,
    hasGuideTool: true,
    detectionRecorded: true,
    hasReport: true,
    model: "gpt-4o-mini",
  });
});

test("missing approval cannot become a repair or verified recovery in the intro", () => {
  const value = record();
  value.incident.story.approvals = [];
  assert.match(slide(value, "action").title, /doğrulanamadı/);
  assert.match(slide(value, "recovery").title, /eksik/);
  assert.doesNotMatch(text(slide(value, "action")), /Başarılı · HTTP 200/);
  assert.doesNotMatch(text(slide(value, "action")), /onayı.*verdi/);
  assert.doesNotMatch(
    text(slide(value, "action").facts),
    /Yalnızca sample-api/,
  );
  assert.doesNotMatch(text(slide(value, "recovery")), /Toparlanma ile kapandı/);
});

test("an unrelated recovery does not borrow closure from the incident status", () => {
  const value = record();
  value.incident.story.recovery.incident_id = "another-incident";
  assert.equal(value.incident.status, "resolved");
  const recovery = slide(value, "recovery");
  assert.match(recovery.title, /eksik/);
  assert.match(text(recovery.facts), /HTTP 200/);
  assert.doesNotMatch(text(recovery.facts), /Toparlanma ile kapandı/);
});

test("missing initial and fault checks stay unknown instead of animating claimed success", () => {
  const value = record();
  value.checks = value.checks.filter(
    (item) => item !== "initial HTTP 200" && item !== "real injected HTTP 500",
  );
  const failure = slide(value, "failure");
  assert.match(failure.title, /doğrulanamadı/);
  assert.equal(failure.facts[1].value, "Bilinmiyor");
  assert.equal(failure.facts[2].value, "Bilinmiyor");
});

test("missing AI report and uncorrelated tools never impersonate a completed model review", () => {
  const value = record();
  value.incident.diagnoses = [];
  const agent = slide(value, "agent");
  assert.match(agent.title, /bulunamadı/);
  assert.match(text(agent.facts), /Doğrulanamadı/);
  assert.match(text(agent.facts), /0 kayıtlı çağrı/);
  assert.doesNotMatch(text(agent), /gpt-4o-mini/);
  const proof = buildIntroProof(value);
  assert.equal(proof.hasReport, false);
  assert.equal(proof.hasEvidenceTool, false);
  assert.equal(proof.hasGuideTool, false);
  assert.equal(proof.model, "Doğrulanamadı");
});

test("a completed report without linked tools does not claim evidence or guide tools ran", () => {
  const value = record();
  for (const action of value.incident.story.actions) {
    if (action.actor === "diagnosis-agent") action.details.run_id = "other-run";
  }
  const agent = slide(value, "agent");
  assert.match(agent.description, /eşleşen araç kullanım kaydı bulunamadı/);
  assert.match(text(agent.facts), /0 kayıtlı çağrı/);
  assert.doesNotMatch(
    agent.description,
    /kanıtlarını ve çözüm rehberini okudu/,
  );
  const proof = buildIntroProof(value);
  assert.equal(proof.hasReport, true);
  assert.equal(proof.hasEvidenceTool, false);
  assert.equal(proof.hasGuideTool, false);
});

test("missing creation audit and first evidence cannot claim a proven detection", () => {
  const value = record();
  value.incident.story.actions = value.incident.story.actions.filter(
    (action) => action.action !== "incident.created",
  );
  value.incident.evidence = [];
  const detection = slide(value, "detection");
  assert.match(detection.title, /eksik/);
  assert.match(text(detection.facts), /Bulunamadı/);
  assert.doesNotMatch(text(detection.facts), /Arıza açılışı kayıtlı/);
  assert.equal(buildIntroProof(value).detectionRecorded, false);
});

test("missing scope and model metadata remain unknown", () => {
  const value = record();
  delete value.scope;
  value.model = "";
  assert.match(text(slide(value, "stack").facts), /Ortam kaydı yok/);
  assert.doesNotMatch(text(slide(value, "stack")), /Windows|SQLite/);
  assert.equal(slide(value, "agent").facts[0].value, "Doğrulanamadı");
  assert.equal(buildIntroProof(value).environment, "Ortam kaydı yok");
  assert.equal(buildIntroProof(value).model, "Doğrulanamadı");
});

test("guide-only tools cannot light up the evidence tool indicator", () => {
  const value = record();
  value.incident.story.actions = value.incident.story.actions.filter(
    (action) => action.action !== "tool.get_incident_evidence",
  );
  const proof = buildIntroProof(value);
  assert.equal(proof.hasReport, true);
  assert.equal(proof.hasEvidenceTool, false);
  assert.equal(proof.hasGuideTool, true);
  assert.match(
    slide(value, "agent").description,
    /Kanıt okuma aracı doğrulanamadı/,
  );
});
