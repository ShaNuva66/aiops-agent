import recordedCase from "./live-case.json";
import { buildCaseView } from "./observatory-data";
import type { RecordedCase } from "./observatory-data";

export type IntroSlide = {
  id:
    | "purpose"
    | "stack"
    | "failure"
    | "detection"
    | "agent"
    | "action"
    | "recovery";
  eyebrow: string;
  title: string;
  description: string;
  actor: string;
  takeaway: string;
  facts: { label: string; value: string }[];
  phaseId?: string;
};

export type IntroProof = {
  environment: string;
  hasEvidenceTool: boolean;
  hasGuideTool: boolean;
  detectionRecorded: boolean;
  hasReport: boolean;
  model: string;
};

/** Shared derivation keeps visual indicators and narrative claims in agreement. */
function buildIntroContext(record: RecordedCase) {
  const view = buildCaseView(record);
  const { caseReport, caseModel, caseIncident, caseAudit, modelTools } = view;
  const model = caseReport && caseModel?.trim() ? caseModel : "Doğrulanamadı";
  const scope = (record as RecordedCase & { scope?: unknown }).scope;
  const environment =
    typeof scope === "string" && scope.trim()
      ? /Windows/i.test(scope) && /SQLite/i.test(scope)
        ? "Windows + SQLite laboratuvarı"
        : scope
      : "Ortam kaydı yok";
  const linkedToolIds = new Set(modelTools.map((tool) => tool.id));
  const usedTool = (name: string) =>
    caseAudit.some(
      (event) => event.action === name && linkedToolIds.has(event.id),
    );
  const detectionRecorded =
    (view.casePhases.find((item) => item.id === "detection")?.evidenceIds
      .length ?? 0) > 0 &&
    caseAudit.some(
      (event) =>
        event.action === "incident.created" && event.target === caseIncident.id,
    );
  const proof: IntroProof = {
    environment,
    hasEvidenceTool: usedTool("tool.get_incident_evidence"),
    hasGuideTool: usedTool("tool.search_knowledge_base"),
    detectionRecorded,
    hasReport: Boolean(caseReport),
    model,
  };
  return { view, scope, proof };
}

export function buildIntroProof(record: RecordedCase): IntroProof {
  return buildIntroContext(record).proof;
}

/** Presentation copy follows the archived proof, never the animation's state. */
export function buildIntroSlides(record: RecordedCase): IntroSlide[] {
  const { view, scope, proof } = buildIntroContext(record);
  const { outcome, caseReport, caseIncident, modelTools } = view;
  const {
    environment,
    model,
    detectionRecorded,
    hasEvidenceTool: readEvidence,
    hasGuideTool: readGuide,
  } = proof;
  const phase = (id: string) => view.casePhases.find((item) => item.id === id)!;
  const agentDescription = !caseReport
    ? "Bu olay için tamamlanmış bir OpenAI raporu bulunamadı. AI'ın ne incelediğini bu kayıttan doğrulayamıyoruz."
    : readEvidence && readGuide
      ? "Agent hata kanıtlarını ve çözüm rehberini okudu. Bulgularını kaynaklarıyla açıkladı; sıradaki kontrolleri önerdi."
      : readEvidence
        ? "Agent'ın bu olaya ait hata kanıtlarını okuduğu ve bir rapor ürettiği kayıtlı. Rehber kullanımı doğrulanamadı."
        : readGuide
          ? "Agent'ın çözüm rehberinde arama yaptığı ve bir rapor ürettiği kayıtlı. Kanıt okuma aracı doğrulanamadı."
          : "Tamamlanmış bir AI raporu var. Bu incelemeyle eşleşen araç kullanım kaydı bulunamadı.";

  return [
    {
      id: "purpose",
      eyebrow: "01 · PROJENİN AMACI",
      title: "Arızayı fark eden, ekibe yol gösteren bir sistem.",
      description:
        "AIOps Agent uygulamayı düzenli kontrol eder; hata çıktığında kanıtları toplar. AI bulguları açıklar, yetkili kişi müdahaleyi onaylar ve sonuç yeniden ölçülür.",
      actor: "AIOps Agent",
      takeaway:
        "Bu sunum kayıtlı bir laboratuvar olayını anlatır. Yeni AI çağrısı veya sistem müdahalesi yapmaz.",
      facts: [
        { label: "İzleme", value: "Sorunu fark eder" },
        { label: "AI agent", value: "Kanıtları yorumlar" },
        { label: "Yetkili kişi", value: "Müdahaleyi onaylar" },
      ],
    },
    {
      id: "stack",
      eyebrow: "02 · NEYLE YAPILDI?",
      title: "Arayüz, izleme ve AI birlikte çalışıyor.",
      description:
        "React ekranı süreci gösterir. Python servisi uygulamayı kontrol eder ve kayıtları tutar. İsteğe bağlı OpenAI agent kanıtları inceleyip rapor hazırlar.",
      actor: "Projenin bileşenleri",
      takeaway:
        typeof scope === "string" &&
        /Windows/i.test(scope) &&
        /SQLite/i.test(scope)
          ? "Burada anlatılan vaka Windows/SQLite üzerinde kaydedildi. Docker/PostgreSQL kontrolleri ayrı testlerdir."
          : "Gösterilen ortam bilgisi bu olayın kaydına aittir; diğer testlerin sonucu bu vakaya aktarılmaz.",
      facts: [
        { label: "Arayüz", value: "React + TypeScript" },
        { label: "İzleme ve API", value: "Python + FastAPI" },
        { label: "Bu vakanın ortamı", value: environment },
      ],
    },
    {
      id: "failure",
      eyebrow: "03 · SORUN NASIL OLUŞTU?",
      title:
        outcome.beforeStatus === 500
          ? "Test uygulaması hata vermeye başladı."
          : "İlk hata sonucu doğrulanamadı.",
      description: phase("failure").description,
      actor: "Yetkili test yürütücüsü",
      takeaway:
        outcome.beforeStatus === 500
          ? "HTTP 500, uygulamanın isteği başarıyla tamamlayamadığını gösterir. Bu hata test için kontrollü olarak açıldı."
          : "Kontrollü HTTP 500 hatasını doğrulayacak gözlem veya kontrol kaydı eksik.",
      facts: [
        { label: "Hedef", value: caseIncident.service_id ?? "Kayıt yok" },
        {
          label: "Önceki kontrol",
          value: outcome.hasInitialSuccess
            ? "HTTP 200 · Başarılı"
            : "Bilinmiyor",
        },
        {
          label: "Hata yanıtı",
          value:
            outcome.beforeStatus === 500
              ? "HTTP 500 · Başarısız"
              : "Bilinmiyor",
        },
      ],
      phaseId: "failure",
    },
    {
      id: "detection",
      eyebrow: "04 · SİSTEM NE YAPTI?",
      title: detectionRecorded
        ? "Hata, kanıtlı bir arıza kaydına dönüştü."
        : "Arıza açılışının kanıtı eksik.",
      description: detectionRecorded
        ? "İzleme sistemi başarısız kontrolleri fark etti. Hangi uygulamanın hata verdiğini kaydetti ve ilk hata kanıtını inceleme için sakladı."
        : "Arıza kaydının açılışını ve ona bağlı ilk hata gözlemini birlikte doğrulayamıyoruz.",
      actor: "Otomatik izleme sistemi",
      takeaway:
        "Bu aşama sabit izleme kurallarıyla çalışır. AI değerlendirmesi sonraki adımda başlar.",
      facts: [
        { label: "Kontrol", value: "Uygulamaya erişilebiliyor mu?" },
        {
          label: "Kayıt",
          value: detectionRecorded ? "Arıza açılışı kayıtlı" : "Doğrulanamadı",
        },
        {
          label: "İlk kanıt",
          value:
            phase("detection").evidenceIds.length > 0
              ? "Saklandı"
              : "Bulunamadı",
        },
      ],
      phaseId: "detection",
    },
    {
      id: "agent",
      eyebrow: "05 · AI AGENT NE İŞE YARADI?",
      title: caseReport
        ? "Veriyi okuyup anlaşılır bir öneriye çevirdi."
        : "AI raporu bu kayıtta bulunamadı.",
      description: agentDescription,
      actor: "AI agent",
      takeaway:
        "Agent'ın görevi incelemek ve açıklamak. Bu akışta müdahale yetkisi ayrı bir onay mekanizmasında.",
      facts: [
        { label: "Model", value: model },
        {
          label: "Araç kullanımı",
          value: `${modelTools.length} kayıtlı çağrı`,
        },
        {
          label: "Üretilen çıktı",
          value: caseReport
            ? "Kaynaklı bulgular + kontrol önerisi"
            : "Rapor yok",
        },
      ],
      phaseId: "agent",
    },
    {
      id: "action",
      eyebrow: "06 · SORUN NASIL ÇÖZÜLDÜ?",
      title: outcome.hasSuccessfulApproval
        ? "Onaylı işlem test hatasını temizledi."
        : "Başarılı müdahale doğrulanamadı.",
      description: phase("action").description,
      actor: "Yetkili test yürütücüsü + sabit yürütücü",
      takeaway: outcome.hasSuccessfulApproval
        ? "Bu vakada onayı yetkilendirilmiş test yürütücüsü verdi. AI kendisine işlem yetkisi vermedi."
        : "Müdahalenin yapıldığını söylemek için bu arızaya bağlı onay, işlem sonucu ve başarılı kontrol birlikte gerekir.",
      facts: [
        {
          label: "İşlemin hedefi",
          value: outcome.hasSuccessfulApproval
            ? "Yalnızca sample-api"
            : "Doğrulanamadı",
        },
        {
          label: "İşlemin kapsamı",
          value: outcome.hasSuccessfulApproval
            ? "Test HTTP hatasını temizle"
            : "Doğrulanamadı",
        },
        {
          label: "Onaylı işlemin sonucu",
          value: outcome.hasSuccessfulApproval
            ? "Başarılı · HTTP 200"
            : "Doğrulanamadı",
        },
      ],
      phaseId: "action",
    },
    {
      id: "recovery",
      eyebrow: "07 · DÜZELDİĞİNİ NASIL ANLADIK?",
      title: outcome.hasVerifiedRecovery
        ? "Yanıt geri geldi. İzleme de doğruladı."
        : "Toparlanmayı doğrulayacak kayıt eksik.",
      description: phase("recovery").description,
      actor: "İşlem sonrası kontrol + izleme sistemi",
      takeaway:
        "Şimdi asıl sayfada raporu, onayı ve önce/sonra kanıtlarını inceleyebilirsin. Bu tek vaka genel AI başarım ölçümü değildir.",
      facts: [
        {
          label: "İşlem sonrası yanıt",
          value:
            outcome.afterStatus === 200 ? "HTTP 200 · Başarılı" : "Bilinmiyor",
        },
        {
          label: "Ayrı izleme gözlemi",
          value: outcome.hasVerifiedRecovery
            ? "Sağlıklı yanıt doğrulandı"
            : "Doğrulanamadı",
        },
        {
          label: "Arıza sonucu",
          value: outcome.hasVerifiedRecovery
            ? "Toparlanma ile kapandı"
            : "Toparlanma kanıtı eksik",
        },
      ],
      phaseId: "recovery",
    },
  ];
}

export const introSlides = buildIntroSlides(recordedCase as RecordedCase);
export const introProof = buildIntroProof(recordedCase as RecordedCase);
