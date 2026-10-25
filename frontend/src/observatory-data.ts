import recordedCase from "./live-case.json";
import type { Audit, Incident, Report } from "./types";

export type Phase = {
  id: string;
  title: string;
  short: string;
  actor: string;
  heading: string;
  description: string;
  impact: string;
  proof: string;
  app: "healthy" | "fault" | "checking";
  database: "healthy" | "fault" | "checking";
  response: string;
  tone: "healthy" | "fault" | "checking";
  at: string | null;
  evidenceIds: string[];
};

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const milliseconds = Date.parse(
    /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`,
  );
  return Number.isFinite(milliseconds) ? milliseconds : null;
};

export function formatRecordTime(value: string | null | undefined): string {
  const milliseconds = parseTime(value);
  return milliseconds === null
    ? "Zaman bilgisi yok"
    : new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(milliseconds);
}

export const caseIncident = recordedCase.incident as Incident;
const completedRun = recordedCase.incident.diagnoses.find(
  (run) =>
    run.provider === "openai" && run.status === "completed" && run.report,
);
export const caseReport: Report | null = completedRun?.report ?? null;
export const caseModel = recordedCase.model;
export const caseDate = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(parseTime(caseIncident.created_at) ?? 0);

export const caseScope =
  "Windows üzerinde ayrı uygulama ve SQLite. Gerçek HTTP test hatası ve gerçek OpenAI çağrısı; Docker/PostgreSQL denemesi değil.";
export const caseAuditNote =
  "Saatler Türkiye saatidir. İşlem zamanı ile gözlem zamanı farklı olabilir; aynı zaman damgasına sahip kayıtların kendi aralarındaki sırası kesin değildir.";

// Stable sorting preserves the stored order for tied timestamps. It does not invent
// a finer-grained tool execution order than the audit database actually recorded.
export const caseAudit: Audit[] = [...(caseIncident.story?.actions ?? [])].sort(
  (left, right) =>
    (parseTime(left.created_at) ?? 0) - (parseTime(right.created_at) ?? 0),
);

const toolDescriptions: Record<string, { title: string; description: string }> =
  {
    "tool.get_incident_evidence": {
      title: "Arızanın kanıtlarını okudu",
      description:
        "Kayıtlı hata gözlemini ve yeni uygulama kontrolünü, özgün kanıt kimlikleriyle inceledi.",
    },
    "tool.search_knowledge_base": {
      title: "Çözüm rehberini inceledi",
      description:
        "Kayıtlı çözüm belgelerinde arama yaptı. Raporunda HTTP 500 rehberine başvurdu; bu işlem sistemde değişiklik yapmadı.",
    },
    "tool.get_service_status": {
      title: "Servisin durumuna baktı",
      description:
        "Atanan servisin kayıtlı durumunu ve son kontrol zamanını okudu; herhangi bir komut çalıştırmadı.",
    },
  };

export const modelTools = caseAudit
  .filter((action) => {
    if (
      !completedRun ||
      action.actor !== "diagnosis-agent" ||
      !(action.action in toolDescriptions)
    )
      return false;
    const runId = object(action.details).run_id;
    return runId === undefined || runId === completedRun.id;
  })
  .map((action) => ({
    id: action.id,
    title: toolDescriptions[action.action].title,
    description: toolDescriptions[action.action].description,
    at: action.created_at,
  }));

const previous = caseIncident.story?.previous;
const recovery = caseIncident.story?.recovery;
const firstEvidence = caseIncident.evidence?.find(
  (evidence) => object(evidence.data).state === "problem",
);
const firstPayload = object(firstEvidence?.data);
const firstObservation = object(object(firstPayload.data).observation);
const telemetry = caseIncident.evidence?.find(
  (evidence) => evidence.source === "lab-telemetry",
);
const telemetryDatabase = object(object(telemetry?.data).database);
const successfulApproval = caseIncident.story?.approvals.find(
  (approval) =>
    approval.status === "succeeded" &&
    approval.runbook === "clear-http-fault:v1" &&
    approval.target === "sample-api",
);
const approvedResult = object(successfulApproval?.result);
const afterStatus = object(approvedResult.after).http_status;
const initialAt =
  typeof firstPayload.observed_at === "string"
    ? firstPayload.observed_at
    : (firstEvidence?.collected_at ?? null);
const initialMilliseconds = parseTime(initialAt);
const recoveryMilliseconds = parseTime(recovery?.observed_at);
const durationSeconds =
  initialMilliseconds !== null &&
  recoveryMilliseconds !== null &&
  recoveryMilliseconds >= initialMilliseconds
    ? Math.round((recoveryMilliseconds - initialMilliseconds) / 100) / 10
    : null;
const databaseState: Phase["database"] =
  telemetryDatabase.healthy === true
    ? "healthy"
    : telemetryDatabase.healthy === false
      ? "fault"
      : "checking";

export const outcome = {
  // The injected fault flag is corroborated by the successful real HTTP assertion.
  // No HTTP status is fabricated from a generic availability failure.
  beforeStatus:
    firstObservation.fault === "http500" &&
    recordedCase.checks.includes("real injected HTTP 500")
      ? 500
      : null,
  afterStatus: typeof afterStatus === "number" ? afterStatus : null,
  modelToolCount: modelTools.length,
  checkCount: recordedCase.checks.length,
  durationSeconds,
};
export const durationLabel =
  "İlk kayıtlı hata gözleminden sağlıklı toparlanma gözlemine kadar. AI yanıt süresi veya üretim hizmet seviyesi değildir.";

const matchingAction = (action: string) =>
  caseAudit.find((item) => item.action === action);
const failureEvidenceIds = firstEvidence ? [firstEvidence.id] : [];
const reportEvidenceIds = [
  ...new Set(
    caseReport?.findings.flatMap((finding) => finding.evidence_ids) ?? [],
  ),
];

export const casePhases: Phase[] = [
  {
    id: "before",
    title: "Her şey çalışıyordu",
    short: "Normal durum",
    actor: "İzleme sistemi",
    heading: "Uygulama isteğe cevap veriyor.",
    description: previous
      ? "Arıza öncesi kontrol başarılıydı. Uygulama, isteğe HTTP 200 ile yanıt verdi."
      : "Arıza öncesine ait başarılı kontrol bu kayıtta yok.",
    impact: previous
      ? "Bu kontrol sırasında uygulamaya erişilebiliyor."
      : "Arıza öncesindeki kullanıcı etkisi bu kayıttan anlaşılamıyor.",
    proof: previous
      ? "Arıza öncesi başarılı erişim gözlemi ve başlangıç HTTP 200 kontrolü."
      : "Önceki başarılı kontrol kaydı bulunamadı.",
    app: previous ? "healthy" : "checking",
    database: recordedCase.checks.includes("initial HTTP 200")
      ? "healthy"
      : "checking",
    response: previous
      ? "200 · Başlangıç kontrolü başarılı"
      : "Sonuç bilinmiyor",
    tone: previous ? "healthy" : "checking",
    at: previous?.observed_at ?? null,
    evidenceIds: [],
  },
  {
    id: "failure",
    title: "Hata oluştu",
    short: "HTTP 500",
    actor: "Test yürütücüsü",
    heading: "Uygulama hata vermeye başladı.",
    description:
      "Test yürütücüsü, uygulamada kontrollü bir hata açtı. Gerçek istek bu kez başarılı yanıt yerine HTTP 500 hatası aldı.",
    impact: "Bu uygulamayı kullanan biri isteğini tamamlayamayabilirdi.",
    proof: "İlk gözlemde healthy=false ve fault=http500 bilgileri kayıtlı.",
    app: "fault",
    database: databaseState,
    response:
      outcome.beforeStatus === 500 ? "500 · İstek başarısız" : "Erişim hatası",
    tone: "fault",
    at: initialAt,
    evidenceIds: failureEvidenceIds,
  },
  {
    id: "detection",
    title: "Sistem fark etti",
    short: "Arıza kaydı",
    actor: "İzleme sistemi",
    heading: "Başarısız kontrol kayda dönüştü.",
    description:
      "İzleme sistemi, tekrarlanan başarısız kontrolleri fark edip arıza kaydı açtı. İlk hata kanıtını saklayarak incelemeyi başlattı.",
    impact: "Ekip hangi uygulamanın ne zaman hata verdiğini görebiliyor.",
    proof: "incident.created işlem kaydı ve ona bağlı ilk hata kanıtı.",
    app: "fault",
    database: databaseState,
    response: "500 · Hata kayıt altında",
    tone: "fault",
    at:
      matchingAction("incident.created")?.created_at ?? caseIncident.created_at,
    evidenceIds: failureEvidenceIds,
  },
  {
    id: "agent",
    title: "AI kanıtları inceledi",
    short: "Kanıt + öneri",
    actor: `AI agent · ${caseModel}`,
    heading: "Agent gördüğünü açıkladı, rehber önerdi.",
    description: caseReport
      ? "Agent hata kanıtlarını ve çözüm rehberlerini okudu. HTTP 500 sorununu açıkladı; ilgili rehberin, veritabanının ve uygulama yanıtının kontrol edilmesini önerdi."
      : "Bu kayıt için tamamlanmış bir AI raporu yok.",
    impact:
      "Ekip sorunun açıklamasını ve sırada neyi kontrol edebileceğini görüyor.",
    proof: `${modelTools.length} kayıtlı model araç çağrısı; bulgular özgün kanıt kimliklerine bağlı.`,
    app: "fault",
    database: databaseState,
    response: "500 · İnceleme sorunu tek başına düzeltmez",
    tone: "checking",
    at: completedRun?.finished_at ?? null,
    evidenceIds: reportEvidenceIds,
  },
  {
    id: "action",
    title: "Onaylı işlem uygulandı",
    short: "Kontrollü müdahale",
    actor: "Yetkili test yürütücüsü",
    heading: "Yalnızca test hatası temizlendi.",
    description: successfulApproval
      ? "Yetkilendirilmiş test yürütücüsü, yalnızca bu hatayı temizleyen işlemi onaylayıp çalıştırdı. Yürütücü önce test hatasını doğruladı, ardından temizledi."
      : "Başarıyla tamamlanmış uygun bir müdahale kaydı yok. İnceleme yapılması, düzeltme yapıldığı anlamına gelmez.",
    impact: successfulApproval
      ? "Uygulamayı değiştiren ve test hatasını temizleyen adım burada gerçekleşti."
      : "Bu kayıttan uygulamanın düzeltildiği sonucu çıkarılamaz.",
    proof: successfulApproval
      ? "İstek → onay → çalıştırma → başarı kayıtları ve işlem sonrası HTTP yanıtı."
      : "Başarılı onaylı işlem kaydı bulunamadı.",
    app: successfulApproval ? "healthy" : "checking",
    database: databaseState,
    response:
      outcome.afterStatus === 200
        ? "200 · İşlem sonrası kontrol başarılı"
        : "Kontrol sonucu eksik",
    tone: outcome.afterStatus === 200 ? "healthy" : "checking",
    at: matchingAction("runbook.succeeded")?.created_at ?? null,
    evidenceIds: [],
  },
  {
    id: "recovery",
    title: "Düzelme doğrulandı",
    short: "HTTP 200",
    actor: "İzleme sistemi",
    heading: "Yanıt geri geldi. Arıza kapandı.",
    description: recovery
      ? "İşlem sonrası kontrol HTTP 200 ile başarılı oldu. İzleme sistemi de sağlıklı yanıtı görünce arıza kaydını kapattı."
      : "Bu kayda bağlı başarılı bir toparlanma gözlemi yok. Yalnızca kapanış durumuna bakarak düzelme doğrulandı diyemeyiz.",
    impact: recovery
      ? "Uygulama yeniden yanıt veriyor; ekip başarılı kontrolü görebiliyor."
      : "Sonucun doğrulanması için yeni bir başarılı kontrol gerekir.",
    proof: recovery
      ? "İşlem sonucundaki HTTP 200 ve ayrı toparlanma gözlemi birlikte kayıtlı."
      : "Toparlanma gözlemi bulunamadı.",
    app: recovery ? "healthy" : "checking",
    database: databaseState,
    response:
      outcome.afterStatus === 200
        ? "200 · Uygulama yeniden yanıt veriyor"
        : "Sonuç bilinmiyor",
    tone: recovery ? "healthy" : "checking",
    at: recovery?.observed_at ?? null,
    evidenceIds: [],
  },
];
