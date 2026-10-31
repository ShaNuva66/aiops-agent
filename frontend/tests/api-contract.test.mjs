import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Compile the production helper in memory; no browser, backend or paid API is involved.
const source = await readFile(
  new URL("../src/api.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { request, ApiError } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("API failures remain understandable and writes are never retried", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = globalThis.setTimeout;
  try {
    await t.test(
      "network failures expose a Turkish connection error",
      async () => {
        globalThis.fetch = async () => {
          throw new TypeError("Failed to fetch");
        };
        await assert.rejects(
          () => request("/overview"),
          (error) =>
            error instanceof ApiError &&
            error.kind === "network" &&
            error.status === 0 &&
            error.message.includes("Yönetim hizmetine ulaşılamıyor") &&
            !error.message.includes("Failed to fetch"),
        );
      },
    );
    await t.test(
      "uncertain writes have one attempt and warn before repetition",
      async () => {
        let calls = 0;
        globalThis.fetch = async () => {
          calls++;
          throw new TypeError("Network failure");
        };
        await assert.rejects(
          () => request("/approvals/example/execute", "POST", {}),
          (error) =>
            error.kind === "network" &&
            error.message.includes("sunucuda tamamlanmış olabilir") &&
            error.message.includes("işlem geçmişini kontrol et"),
        );
        assert.equal(calls, 1);
      },
    );
    await t.test("server errors do not expose internal details", async () => {
      globalThis.fetch = async () =>
        json(
          { error: { message: "Internal database connection string" } },
          503,
        );
      await assert.rejects(
        () => request("/overview"),
        (error) =>
          error.kind === "server" &&
          !error.message.includes("database") &&
          !error.message.includes("Otomatik"),
      );
      await assert.rejects(
        () => request("/approvals/example/execute", "POST", {}),
        (error) => error.message.includes("yeniden denemeden önce"),
      );
    });
    await t.test(
      "HTML preview fallbacks and malformed JSON are not accepted as data",
      async () => {
        globalThis.fetch = async () =>
          new Response("<html>Preview</html>", {
            headers: { "Content-Type": "text/html" },
          });
        await assert.rejects(
          () => request("/auth/status"),
          (error) => error.kind === "response",
        );
        globalThis.fetch = async () =>
          new Response("{not json", {
            headers: { "Content-Type": "application/json" },
          });
        await assert.rejects(
          () => request("/overview"),
          (error) => error.kind === "response",
        );
      },
    );
    await t.test(
      "login failure and expired session have distinct explanations",
      async () => {
        globalThis.fetch = async () =>
          json({ error: { message: "Incorrect password" } }, 401);
        await assert.rejects(
          () => request("/auth/login", "POST", {}),
          (error) =>
            error.status === 401 &&
            error.message.includes("Kullanıcı adı veya şifre hatalı"),
        );
        await assert.rejects(
          () => request("/auth/me"),
          (error) =>
            error.status === 401 &&
            error.message.includes("Oturumun sona erdi"),
        );
      },
    );
    await t.test(
      "request routing, same-origin cookies and CSRF are preserved",
      async () => {
        globalThis.fetch = async (url, init) => {
          assert.equal(url, "/api/approvals");
          assert.equal(init.credentials, "same-origin");
          assert.equal(init.headers["X-CSRF-Token"], "test-csrf");
          assert.deepEqual(JSON.parse(init.body), { example: true });
          return json({ ok: true });
        };
        assert.deepEqual(
          await request("/approvals", "POST", { example: true }, "test-csrf"),
          { ok: true },
        );
      },
    );
    await t.test("superseded connection checks can be cancelled", async () => {
      const controller = new AbortController();
      let receivedSignal;
      globalThis.fetch = async (_url, init) => {
        receivedSignal = init.signal;
        return new Promise((_resolve, reject) =>
          init.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          ),
        );
      };
      const pending = request(
        "/auth/status",
        "GET",
        undefined,
        undefined,
        controller.signal,
      );
      controller.abort();
      await assert.rejects(pending, (error) => error.kind === "cancelled");
      assert.equal(receivedSignal.aborted, true);
    });
    await t.test(
      "cancelling a sent write does not claim the server cancelled it",
      async () => {
        const controller = new AbortController();
        let calls = 0;
        globalThis.fetch = async (_url, init) => {
          calls++;
          return new Promise((_resolve, reject) =>
            init.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            ),
          );
        };
        const pending = request(
          "/approvals/example/execute",
          "POST",
          {},
          undefined,
          controller.signal,
        );
        controller.abort();
        await assert.rejects(
          pending,
          (error) =>
            error.kind === "cancelled" &&
            error.message.includes("sunucuda tamamlanmış olabilir"),
        );
        assert.equal(calls, 1);
      },
    );
    await t.test(
      "timeout aborts stalled reads and preserves write uncertainty",
      async () => {
        globalThis.setTimeout = (handler, delay) => {
          assert.equal(delay, 15_000);
          return originalTimeout(handler, 0);
        };
        globalThis.fetch = async (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            ),
          );
        await assert.rejects(
          () => request("/overview"),
          (error) =>
            error.kind === "timeout" &&
            error.message.includes("zamanında yanıt vermedi"),
        );
        await assert.rejects(
          () => request("/approvals/example/execute", "POST", {}),
          (error) =>
            error.kind === "timeout" &&
            error.message.includes("sunucuda tamamlanmış olabilir"),
        );
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalTimeout;
  }
});
