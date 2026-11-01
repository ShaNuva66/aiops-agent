import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/intro-film.ts", import.meta.url)),
  ],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const {
  buildIntroFilm,
  filmChapters,
  filmDuration,
  locateFilmTime,
  formatFilmTime,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const original = JSON.parse(
  await readFile(new URL("../src/live-case.json", import.meta.url), "utf8"),
);
const record = () => structuredClone(original);
const chapter = (value, id) =>
  buildIntroFilm(value).find((item) => item.id === id);
const text = (value) => JSON.stringify(value);

test("the film preserves proof and creates a contiguous, readable 102-second story", () => {
  const value = record();
  const before = structuredClone(value);
  const film = buildIntroFilm(value);
  assert.deepEqual(value, before);
  assert.deepEqual(film, filmChapters);
  assert.equal(filmDuration, 102);
  assert.deepEqual(
    film.map((item) => item.id),
    ["purpose", "stack", "failure", "detection", "agent", "action", "recovery"],
  );
  let end = 0;
  for (const item of film) {
    assert.equal(item.start, end);
    assert.ok(item.duration <= 18 && item.duration >= 12);
    assert.equal(item.cues.length, 4);
    assert.equal(item.cues[0].at, 0);
    assert.ok(item.cues.at(-1).at < item.duration);
    assert.ok(
      item.cues.every((cue) => cue.text.length < 130 && cue.label.length < 30),
    );
    assert.ok(
      item.cues.every(
        (cue, index) => index === 0 || cue.at > item.cues[index - 1].at,
      ),
    );
    end += item.duration;
  }
  assert.equal(end, filmDuration);
  assert.match(text(chapter(value, "stack")), /Windows ve SQLite/);
  assert.match(
    text(chapter(value, "stack")),
    /Docker\/PostgreSQL testleri ayrı/,
  );
  assert.match(text(chapter(value, "failure")), /kontrollü HTTP hatası açtı/);
  assert.match(text(chapter(value, "agent")), /hata kanıtlarını okudu/);
  assert.match(text(chapter(value, "action")), /AI kendine yetki vermedi/);
  assert.match(
    text(chapter(value, "recovery")),
    /ayrı kontrolde sağlıklı yanıt gördü/,
  );
});

test("missing or unrelated approval cannot become a repaired application", () => {
  for (const alter of [
    (value) => {
      value.incident.story.approvals = [];
    },
    (value) => {
      value.incident.story.approvals[0].target = "other-service";
    },
    (value) => {
      value.incident.story.approvals[0].status = "failed";
    },
    (value) => {
      value.checks = value.checks.filter(
        (check) => check !== "post-action HTTP 200",
      );
    },
  ]) {
    const value = record();
    alter(value);
    const action = chapter(value, "action");
    const recovery = chapter(value, "recovery");
    assert.match(action.title, /doğrulanamadı/);
    assert.doesNotMatch(
      text(action),
      /işlemi çalıştırdı|işleme onay verdi|HTTP 200 görüldü/,
    );
    assert.doesNotMatch(
      text(recovery),
      /toparlanma gözlemiyle kapandı|HTTP 200 aldı/,
    );
  }
});

test("a resolved incident without matching recovery remains unverified", () => {
  const value = record();
  value.incident.story.recovery.incident_id = "unrelated-incident";
  const result = chapter(value, "recovery");
  assert.match(result.title, /kayıt eksik/);
  // The separate, successful action result is still available.
  assert.match(text(result), /HTTP 200 aldı/);
  assert.doesNotMatch(
    text(result),
    /ayrı kontrolde sağlıklı yanıt gördü|toparlanma gözlemiyle kapandı/,
  );
});

test("missing fault, baseline and detection proof never invents their events", () => {
  const value = record();
  value.checks = value.checks.filter(
    (check) => !["initial HTTP 200", "real injected HTTP 500"].includes(check),
  );
  value.incident.evidence = [];
  value.incident.story.actions = [];
  assert.match(chapter(value, "failure").title, /doğrulanamadı/);
  assert.doesNotMatch(
    text(chapter(value, "failure")),
    /kontrollü HTTP hatası açtı|HTTP 500 aldı|HTTP 200 ile başarılıydı/,
  );
  assert.match(chapter(value, "detection").title, /kanıtı eksik/);
  assert.doesNotMatch(
    text(chapter(value, "detection")),
    /arıza kaydı açıldı|gözlemi saklandı/,
  );
});

test("missing model report, linked tools and environment stay unknown", () => {
  const value = record();
  value.incident.diagnoses = [];
  delete value.scope;
  const agent = chapter(value, "agent");
  assert.match(agent.title, /bulunamadı/);
  assert.doesNotMatch(
    text(agent),
    /hata kanıtlarını okudu|rehberlerinde arama yaptı|rapora yazıldı/,
  );
  assert.match(text(chapter(value, "stack")), /Ortam kaydı yok/);
  assert.doesNotMatch(
    text(chapter(value, "stack")),
    /Windows ve SQLite laboratuvarında kaydedildi/,
  );
});

test("chapter and cue boundaries select the next scene exactly", () => {
  for (let index = 0; index < filmChapters.length; index++) {
    const item = filmChapters[index];
    for (let cueIndex = 0; cueIndex < item.cues.length; cueIndex++) {
      const at = item.start + item.cues[cueIndex].at;
      const location = locateFilmTime(filmChapters, at);
      assert.equal(location.chapterIndex, index);
      assert.equal(location.cueIndex, cueIndex);
      assert.equal(location.localTime, item.cues[cueIndex].at);
      assert.equal(location.progress, item.cues[cueIndex].at / item.duration);
    }
    if (index > 0) {
      const before = locateFilmTime(filmChapters, item.start - 0.001);
      assert.equal(before.chapterIndex, index - 1);
      assert.equal(before.cueIndex, 3);
    }
  }
});

test("seeking clamps invalid and outside times without fabricating a new chapter", () => {
  const first = { chapterIndex: 0, cueIndex: 0, localTime: 0, progress: 0 };
  for (const time of [NaN, -Infinity, -1, -900])
    assert.deepEqual(locateFilmTime(filmChapters, time), first);
  const final = {
    chapterIndex: 6,
    cueIndex: 3,
    localTime: filmChapters[6].duration,
    progress: 1,
  };
  for (const time of [filmDuration, filmDuration + 1000, Infinity])
    assert.deepEqual(locateFilmTime(filmChapters, time), final);
  assert.deepEqual(locateFilmTime([], 100), first);
});

test("scrubbing is reversible and cannot change the original timeline or captions", () => {
  const before = structuredClone(filmChapters);
  const second = locateFilmTime(filmChapters, 49.5);
  locateFilmTime(filmChapters, 92);
  assert.deepEqual(locateFilmTime(filmChapters, 49.5), second);
  assert.deepEqual(filmChapters, before);
});

test("time labels use safe minute-second values", () => {
  for (const [input, expected] of [
    [0, "0:00"],
    [9.9, "0:09"],
    [60, "1:00"],
    [102, "1:42"],
    [-1, "0:00"],
    [NaN, "0:00"],
    [Infinity, "0:00"],
  ])
    assert.equal(formatFilmTime(input), expected);
});
