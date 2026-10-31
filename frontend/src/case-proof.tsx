import {
  ArrowUpLeft,
  ChevronRight,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { caseIncident, formatRecordTime, outcome } from "./observatory-data";
import recordedCase from "./live-case.json";
import httpGuide from "../../knowledge-base/http500.md?raw";
import "./case-proof.css";

export type RecordProofKey = "previous" | "approval" | "recovery" | "checks";

export function CaseProofLedger({
  activeProof,
  onOpen,
  onReturn,
}: {
  activeProof: RecordProofKey | null;
  onOpen: (key: RecordProofKey | null) => void;
  onReturn: () => void;
}) {
  const approval = caseIncident.story?.approvals.find(
    (item) =>
      item.incident_id === caseIncident.id &&
      item.runbook === "clear-http-fault:v1" &&
      item.target === caseIncident.service_id,
  );
  const records = [
    {
      key: "previous" as const,
      title: "Arıza öncesi kontrol",
      label: outcome.hasInitialSuccess
        ? "Başarılı başlangıç kayıtlı"
        : "Başlangıç doğrulanamıyor",
      explanation:
        "Hata oluşmadan önce uygulamadan yanıt alınıp alınmadığını burada kontrol ediyoruz.",
      at: caseIncident.story?.previous?.observed_at,
      value: caseIncident.story?.previous ?? null,
      facts: [
        ["Kontrol edilen", "İş uygulamasından başarılı yanıt alınabiliyor mu?"],
        [
          "Doğrulanan yanıt",
          outcome.hasInitialSuccess
            ? "HTTP 200 · başarılı"
            : "Başlangıç yanıtı doğrulanamadı",
        ],
      ],
    },
    {
      key: "approval" as const,
      title: "Onay ve uygulanan işlem",
      label: outcome.hasSuccessfulApproval
        ? "Onaylı işlem başarılı"
        : "Başarılı işlem kaydı yok",
      explanation:
        "AI önerisinden ayrı olarak, hangi hedefe hangi işlemin onaylandığını ve yürütücünün sonucunu gösterir.",
      at: null,
      value: caseIncident.story?.approvals ?? [],
      facts: [
        [
          "Hedef",
          approval
            ? "İş uygulaması · sample-api"
            : "Bu arızaya bağlı uygun işlem kaydı bulunamadı",
        ],
        [
          "İşlem",
          approval
            ? "Yalnızca açık HTTP 500 test hatasını temizle"
            : "Doğrulanmış işlem yok",
        ],
        ["Sınır", "Genel uygulama hatalarını veya durmuş veritabanını onarmaz"],
        [
          "Sonuç",
          outcome.hasSuccessfulApproval
            ? "İşlem ve HTTP 200 kontrolü başarılı"
            : "Başarılı müdahale doğrulanamadı",
        ],
      ],
    },
    {
      key: "recovery" as const,
      title: "Düzelmenin doğrulaması",
      label: outcome.hasVerifiedRecovery
        ? "Sağlıklı toparlanma doğrulandı"
        : "Toparlanma doğrulanamıyor",
      explanation:
        "İşlemden sonra uygulamanın yanıtını ve ayrı izleme gözlemini birlikte kontrol ediyoruz. Kaydın kapanması tek başına yeterli değildir.",
      at: caseIncident.story?.recovery?.observed_at,
      value: {
        afterStatus: outcome.afterStatus,
        recovery: caseIncident.story?.recovery ?? null,
      },
      facts: [
        [
          "İşlem sonrası yanıt",
          outcome.afterStatus === 200
            ? "HTTP 200 · başarılı yanıt kayıtlı"
            : "Başarılı yanıt doğrulanamadı",
        ],
        [
          "Ayrı izleme kontrolü",
          outcome.hasVerifiedRecovery
            ? "Sağlıklı toparlanma gözlemi bu arızaya bağlı"
            : "İlgili sağlıklı toparlanma kaydı eksik veya doğrulanamadı",
        ],
        [
          "Sonuç",
          outcome.hasVerifiedRecovery
            ? "Yanıt ve izleme birlikte düzelmeyi doğruluyor"
            : "Yalnızca kaydın kapanması düzelme kanıtı sayılmıyor",
        ],
      ],
    },
    {
      key: "checks" as const,
      title: "Bu çalıştırmada kontrol edilenler",
      label: `${outcome.checkCount} kayıtlı kontrol`,
      explanation:
        "Bunlar saklanmış testin kontrolleridir. Bu sayfa açıldığında yeni bir test veya müdahale çalışmaz.",
      at: null,
      value: recordedCase.checks,
      facts: [
        ["Kayıt sayısı", String(outcome.checkCount)],
        ["Kapsam", "Arşivlenmiş tek bir çalıştırmanın kontrol sonuçları"],
      ],
    },
  ];
  return (
    <div className="case-proof-ledger">
      <div className="case-proof-intro">
        <p>
          <FileCheck2 size={17} /> Her aşamanın özgün kaydını ayrı açıp incele.
        </p>
        {activeProof && (
          <button onClick={onReturn}>
            <ArrowUpLeft size={16} /> Anlatıma geri dön
          </button>
        )}
      </div>
      <div className="case-proof-grid">
        {records.map((record) => (
          <details
            key={record.key}
            id={`obs-proof-${record.key}`}
            className="case-proof-record"
            open={activeProof === record.key}
            onToggle={(event) => {
              if (event.currentTarget.open) onOpen(record.key);
              else if (activeProof === record.key) onOpen(null);
            }}
          >
            <summary>
              <span>
                <strong>{record.title}</strong>
                <small>{record.label}</small>
              </span>
              <ChevronRight size={18} />
            </summary>
            <div className="case-proof-content">
              <p>{record.explanation}</p>
              <dl>
                {record.facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {record.at && (
                <time>{formatRecordTime(record.at)} · Türkiye saati</time>
              )}
              <details className="case-proof-raw">
                <summary>Özgün teknik veriyi aç</summary>
                <pre aria-label={`${record.title} özgün veri`}>
                  {JSON.stringify(record.value, null, 2)}
                </pre>
              </details>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Citation identity is from the recorded report; the bundled document is current. */
export function CitedGuides({ sourceIds }: { sourceIds: string[] }) {
  if (!sourceIds.length) return null;
  return (
    <section
      className="case-cited-guides"
      aria-label="Raporun başvurduğu kaynaklar"
    >
      <h3>
        <ShieldCheck size={17} /> Rapor hangi rehbere dayandı?
      </h3>
      {sourceIds.map((id) => (
        <article key={id}>
          <code>{id}</code>
          {id === "runbook:http500" ? (
            <>
              <h4>HTTP 500 inceleme rehberi</h4>
              <p>
                Önce test hatasının gerçekten etkin olup olmadığını ve
                veritabanına erişimi kontrol etmeyi söyler. Hata temizleme
                işlemi yalnızca bu laboratuvardaki açık HTTP 500 test hatası
                için uygundur.
              </p>
              <details>
                <summary>
                  Projedeki güncel rehberi oku <ChevronRight size={15} />
                </summary>
                <p className="case-source-boundary">
                  Kaynak kimliği özgün model raporundandır. Aşağıdaki metin
                  projenin güncel rehberidir; modelin o anda okuduğu metnin
                  birebir arşivi bu vakada saklanmamıştır.
                </p>
                <pre>{httpGuide}</pre>
              </details>
            </>
          ) : (
            <p>
              Bu kaynak raporda belirtilmiş. İçeriğinin arşivi bu kayıtta
              bulunmuyor.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
