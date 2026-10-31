import recordedCase from "./live-case.json";
import type { Audit, Diagnosis, Incident, Report } from "./types";

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

export type RecordedCase = {
  model: string;
  checks: string[];
  incident: Omit<Incident, "diagnoses"> & {
    diagnoses?: (Diagnosis & { finished_at?: string | null })[];
  };
};

export const caseScope =
  "Windows üzerinde ayrı uygulama ve SQLite. Gerçek HTTP test hatası ve gerçek OpenAI çağrısı; Docker/PostgreSQL denemesi değil.";
export const caseAuditNote =
  "Saatler Türkiye saatidir. İşlem zamanı ile gözlem zamanı farklı olabilir; aynı zaman damgasına sahip kayıtların kendi aralarındaki sırası kesin değildir.";
export const durationLabel =
  "İlk kayıtlı hata gözleminden sağlıklı toparlanma gözlemine kadar. AI yanıt süresi veya üretim hizmet seviyesi değildir.";

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

/** Derive only claims supported by this record; missing data stays unknown. */
export function buildCaseView(record: RecordedCase) {
  const caseIncident = record.incident;
  const completedRun = caseIncident.diagnoses?.find(
    (run) =>
      run.provider === "openai" && run.status === "completed" && run.report,
  );
  const caseReport: Report | null = completedRun?.report ?? null;
  const caseModel = record.model;
  const createdAt = parseTime(caseIncident.created_at);
  const caseDate =
    createdAt === null
      ? "Tarih bilgisi yok"
      : new Intl.DateTimeFormat("tr-TR", {
          timeZone: "Europe/Istanbul",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(createdAt);
  const checks = new Set(record.checks);
  // Stable sort preserves stored order for tied timestamps without inventing precision.
  const caseAudit: Audit[] = [...(caseIncident.story?.actions ?? [])].sort(
    (left, right) =>
      (parseTime(left.created_at) ?? 0) - (parseTime(right.created_at) ?? 0),
  );
  const modelTools = caseAudit
    .filter(
      (action) =>
        Boolean(completedRun) &&
        action.actor === "diagnosis-agent" &&
        action.target === caseIncident.id &&
        Object.hasOwn(toolDescriptions, action.action) &&
        object(action.details).run_id === completedRun?.id,
    )
    .map((action) => ({
      id: action.id,
      title: toolDescriptions[action.action].title,
      description: toolDescriptions[action.action].description,
      at: action.created_at,
    }));

  const matchesIncident = (payload: unknown) => {
    const event = object(payload);
    return (
      event.service_id === caseIncident.service_id &&
      event.check === caseIncident.check &&
      event.source_kind === caseIncident.source_kind
    );
  };
  const healthyObservation = (payload: unknown) =>
    object(object(object(payload).data).observation).healthy === true;
  const previous = caseIncident.story?.previous;
  const recovery = caseIncident.story?.recovery;
  const firstEvidence = caseIncident.evidence?.find(
    (evidence) =>
      object(evidence.data).state === "problem" &&
      matchesIncident(evidence.data),
  );
  const firstPayload = object(firstEvidence?.data);
  const firstObservation = object(object(firstPayload.data).observation);
  const faultObserved = firstObservation.healthy === false;
  const telemetry = caseIncident.evidence?.find(
    (evidence) => evidence.source === "lab-telemetry",
  );
  const telemetryDatabase = object(object(telemetry?.data).database);
  const successfulApproval = caseIncident.story?.approvals.find(
    (approval) =>
      approval.incident_id === caseIncident.id &&
      approval.status === "succeeded" &&
      approval.runbook === "clear-http-fault:v1" &&
      approval.target === "sample-api" &&
      approval.target === caseIncident.service_id,
  );
  const approvedResult = object(successfulApproval?.result);
  const hasInitialSuccess =
    Boolean(previous) &&
    matchesIncident(previous?.payload) &&
    healthyObservation(previous?.payload) &&
    checks.has("initial HTTP 200");
  const hasSuccessfulApproval =
    Boolean(successfulApproval) &&
    object(approvedResult.after).http_status === 200 &&
    checks.has("approved fixed runbook succeeded") &&
    checks.has("post-action HTTP 200");
  const hasVerifiedRecovery =
    hasSuccessfulApproval &&
    Boolean(recovery) &&
    caseIncident.status === "resolved" &&
    object(recovery).incident_id === caseIncident.id &&
    matchesIncident(recovery?.payload) &&
    healthyObservation(recovery?.payload) &&
    checks.has("monitoring closed incident with recovery");
  const initialAt =
    typeof firstPayload.observed_at === "string"
      ? firstPayload.observed_at
      : (firstEvidence?.collected_at ?? null);
  const initialMilliseconds = parseTime(initialAt);
  const recoveryMilliseconds = parseTime(recovery?.observed_at);
  const durationSeconds =
    hasVerifiedRecovery &&
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
  const outcome = {
    beforeStatus:
      faultObserved &&
      firstObservation.fault === "http500" &&
      checks.has("real injected HTTP 500")
        ? 500
        : null,
    afterStatus: hasSuccessfulApproval ? 200 : null,
    modelToolCount: modelTools.length,
    checkCount: checks.size,
    durationSeconds,
    hasInitialSuccess,
    hasSuccessfulApproval,
    hasVerifiedRecovery,
  };
  const matchingAction = (action: string) =>
    caseAudit.find((item) => item.action === action);
  const failureEvidenceIds = firstEvidence ? [firstEvidence.id] : [];
  const validEvidenceIds = new Set(
    caseIncident.evidence?.map((evidence) => evidence.id) ?? [],
  );
  const reportEvidenceIds = [
    ...new Set(
      caseReport?.findings.flatMap((finding) => finding.evidence_ids) ?? [],
    ),
  ].filter((id) => validEvidenceIds.has(id));
  const faultState: Phase["app"] = faultObserved ? "fault" : "checking";
  const casePhases: Phase[] = [
    {
      id: "before",
      title: hasInitialSuccess
        ? "Her şey çalışıyordu"
        : "Önceki durum bilinmiyor",
      short: "Normal durum",
      actor: "İzleme sistemi",
      heading: hasInitialSuccess
        ? "Uygulama isteğe cevap veriyor."
        : "Arıza öncesi başarı doğrulanamadı.",
      description: hasInitialSuccess
        ? "Arıza öncesi kontrol başarılıydı. Uygulama, isteğe HTTP 200 ile yanıt verdi."
        : "Arıza öncesine ait başarılı gözlem ve HTTP 200 doğrulaması bu kayıtta birlikte yok.",
      impact: hasInitialSuccess
        ? "Bu kontrol sırasında uygulamaya erişilebiliyor."
        : "Arıza öncesindeki kullanıcı etkisi bu kayıttan anlaşılamıyor.",
      proof: hasInitialSuccess
        ? "Arıza öncesi başarılı erişim gözlemi ve başlangıç HTTP 200 kontrolü."
        : "Önceki başarılı kontrolün doğrulama kaydı eksik.",
      app: hasInitialSuccess ? "healthy" : "checking",
      database: hasInitialSuccess ? "healthy" : "checking",
      response: hasInitialSuccess
        ? "200 · Başlangıç kontrolü başarılı"
        : "Sonuç bilinmiyor",
      tone: hasInitialSuccess ? "healthy" : "checking",
      at: previous?.observed_at ?? null,
      evidenceIds: [],
    },
    {
      id: "failure",
      title: faultObserved ? "Hata oluştu" : "Hata gözlemi eksik",
      short: outcome.beforeStatus === 500 ? "HTTP 500" : "Hata kontrolü",
      actor: "Test yürütücüsü",
      heading: faultObserved
        ? "Uygulama hata vermeye başladı."
        : "Hata sonucu doğrulanamadı.",
      description:
        outcome.beforeStatus === 500
          ? "Test yürütücüsü, uygulamada kontrollü bir hata açtı. Gerçek istek bu kez başarılı yanıt yerine HTTP 500 hatası aldı."
          : "Bu kayıtta HTTP 500 yanıtını ve kontrollü test hatasını birlikte doğrulayacak yeterli veri yok.",
      impact: faultObserved
        ? "Bu uygulamayı kullanan biri isteğini tamamlayamayabilirdi."
        : "Kullanıcı etkisi için doğrulanmış hata gözlemi gerekir.",
      proof: faultObserved
        ? "İlk başarısız kontrol gözlemi ve varsa HTTP doğrulaması kayıtlı."
        : "İlgili başarısız kontrol gözlemi bulunamadı.",
      app: faultState,
      database: databaseState,
      response:
        outcome.beforeStatus === 500
          ? "500 · İstek başarısız"
          : "HTTP sonucu bilinmiyor",
      tone: faultState,
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
      app: faultState,
      database: databaseState,
      response:
        outcome.beforeStatus === 500
          ? "500 · Hata kayıt altında"
          : "HTTP sonucu bilinmiyor",
      tone: faultState,
      at:
        matchingAction("incident.created")?.created_at ??
        caseIncident.created_at,
      evidenceIds: failureEvidenceIds,
    },
    {
      id: "agent",
      title: caseReport ? "AI kanıtları inceledi" : "AI raporu bulunamadı",
      short: "Kanıt + öneri",
      actor: `AI agent · ${caseModel}`,
      heading: caseReport
        ? "Agent gördüğünü açıkladı, rehber önerdi."
        : "Tamamlanmış AI raporu yok.",
      description: caseReport
        ? "Agent hata kanıtlarını ve çözüm rehberlerini okudu. HTTP 500 sorununu açıkladı; ilgili rehberin, veritabanının ve uygulama yanıtının kontrol edilmesini önerdi."
        : "Bu kayıt için tamamlanmış bir AI raporu yok.",
      impact: caseReport
        ? "Ekip sorunun açıklamasını ve sırada neyi kontrol edebileceğini görüyor."
        : "AI katkısını değerlendirmek için tamamlanmış bir rapor gerekir.",
      proof: caseReport
        ? `${modelTools.length} kayıtlı model araç çağrısı; bulgular özgün kanıt kimliklerine bağlı.`
        : "Tamamlanmış model raporu ve ona bağlı araç çağrıları bulunamadı.",
      app: faultState,
      database: databaseState,
      response:
        outcome.beforeStatus === 500
          ? "500 · İnceleme sorunu tek başına düzeltmez"
          : "İnceleme müdahale değildir",
      tone: "checking",
      at: completedRun?.finished_at ?? null,
      evidenceIds: reportEvidenceIds,
    },
    {
      id: "action",
      title: hasSuccessfulApproval
        ? "Onaylı işlem uygulandı"
        : "Müdahale doğrulanamadı",
      short: "Kontrollü müdahale",
      actor: "Yetkili test yürütücüsü",
      heading: hasSuccessfulApproval
        ? "Yalnızca test hatası temizlendi."
        : "Müdahale sonucu doğrulanamadı.",
      description: hasSuccessfulApproval
        ? "Yetkilendirilmiş test yürütücüsü, yalnızca bu hatayı temizleyen işlemi onaylayıp çalıştırdı. Yürütücü önce test hatasını doğruladı, ardından temizledi."
        : "Bu arızaya bağlı başarılı işlem ve HTTP 200 kontrolü birlikte doğrulanamadı. İnceleme yapılması, düzeltme yapıldığı anlamına gelmez.",
      impact: hasSuccessfulApproval
        ? "Uygulamayı değiştiren ve test hatasını temizleyen adım burada gerçekleşti."
        : "Bu kayıttan uygulamanın düzeltildiği sonucu çıkarılamaz.",
      proof: hasSuccessfulApproval
        ? "İstek → onay → çalıştırma → başarı kayıtları ve işlem sonrası HTTP yanıtı."
        : "Başarılı onaylı işlem veya HTTP doğrulaması eksik.",
      app: hasSuccessfulApproval ? "healthy" : "checking",
      database: databaseState,
      response: hasSuccessfulApproval
        ? "200 · İşlem sonrası kontrol başarılı"
        : "Kontrol sonucu eksik",
      tone: hasSuccessfulApproval ? "healthy" : "checking",
      at: successfulApproval
        ? (matchingAction("runbook.succeeded")?.created_at ?? null)
        : null,
      evidenceIds: [],
    },
    {
      id: "recovery",
      title: hasVerifiedRecovery
        ? "Düzelme doğrulandı"
        : "Toparlanma doğrulanamadı",
      short: hasVerifiedRecovery ? "HTTP 200" : "Sonuç kontrolü",
      actor: "İzleme sistemi",
      heading: hasVerifiedRecovery
        ? "Yanıt geri geldi. Arıza kapandı."
        : "Toparlanma henüz doğrulanamadı.",
      description: hasVerifiedRecovery
        ? "İşlem sonrası kontrol HTTP 200 ile başarılı oldu. İzleme sistemi de sağlıklı yanıtı görünce arıza kaydını kapattı."
        : "Bu arızaya bağlı başarılı HTTP kontrolü ve sağlıklı toparlanma gözlemi birlikte doğrulanamadı. Yalnızca kapanış durumuna bakarak düzelme doğrulandı diyemeyiz.",
      impact: hasVerifiedRecovery
        ? "Uygulama yeniden yanıt veriyor; ekip başarılı kontrolü görebiliyor."
        : "Sonucun doğrulanması için başarılı kontrol ve ilgili toparlanma kaydı gerekir.",
      proof: hasVerifiedRecovery
        ? "İşlem sonucundaki HTTP 200 ve ayrı toparlanma gözlemi birlikte kayıtlı."
        : "İlgili toparlanma gözlemi veya HTTP doğrulaması eksik.",
      app: hasVerifiedRecovery ? "healthy" : "checking",
      database: databaseState,
      response: hasVerifiedRecovery
        ? "200 · Uygulama yeniden yanıt veriyor"
        : "Sonuç bilinmiyor",
      tone: hasVerifiedRecovery ? "healthy" : "checking",
      at: recovery?.observed_at ?? null,
      evidenceIds: [],
    },
  ];
  return {
    caseIncident,
    caseReport,
    caseModel,
    caseDate,
    caseAudit,
    modelTools,
    outcome,
    casePhases,
  };
}

export const {
  caseIncident,
  caseReport,
  caseModel,
  caseDate,
  caseAudit,
  modelTools,
  outcome,
  casePhases,
} = buildCaseView(recordedCase as unknown as RecordedCase);
