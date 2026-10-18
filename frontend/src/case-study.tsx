import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import caseData from "./live-case.json";
import type { Incident } from "./types";
import { AgentContribution } from "./contribution";
import { IncidentStory } from "./story";
import { explainEvidence } from "./learning";

export function LiveCaseStudy({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const incident = caseData.incident as Incident;
  return (
    <section className="panel live-case" aria-label="Gerçek AI vaka kaydı">
      <span className="eyebrow">ÇALIŞTIRILMIŞ VAKA · SAKLANMIŞ SONUÇ</span>
      <h2>Hata 500’dü. Agent ne buldu, biz nasıl düzelttik?</h2>
      <p>
        Ayrı yerel uygulamada gerçek HTTP 500 test hatası açtık.{" "}
        <strong>{caseData.model}</strong> kanıtları okuyup öneri hazırladı.
        Kullanıcının yetkilendirdiği test yürütücüsü, yalnızca bu olaya bağlı
        hata temizleme işlemini onayladı ve çalıştırdı.
      </p>
      <div className="case-outcome">
        <span>🔴 Önce: HTTP 500</span>
        <ArrowRight size={18} />
        <span>Agent: kanıt + öneri</span>
        <ArrowRight size={18} />
        <span>Onaylı işlem</span>
        <ArrowRight size={18} />
        <strong>
          <CheckCircle2 size={17} /> Sonra: HTTP 200
        </strong>
      </div>
      <p className="muted">
        Kapsam: Windows üzerinde ayrı uygulama ve SQLite. Docker/PostgreSQL
        denemesi değildir. Bu, geçmiş bir çalıştırmanın kaydıdır; sayfa açılınca
        yeni AI çağrısı veya müdahale yapılmaz.
      </p>
      <button
        className="primary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open
          ? "Vaka ayrıntılarını kapat"
          : "Agent’ın gerçek raporunu ve işlemleri gör"}
        <ArrowRight size={16} />
      </button>
      {open && (
        <div>
          <p>
            Çalıştırma kaydı: {incident.id} · {incident.created_at} UTC
          </p>
          <IncidentStory incident={incident} />
          <AgentContribution incident={incident} />
          <section>
            <h3>Vakanın kaynak kanıtları ({incident.evidence?.length})</h3>
            {incident.evidence?.map((e) => (
              <article
                key={e.id}
                id={"evidence-" + e.id}
                className="evidence-card"
              >
                <strong>
                  {e.source} · {e.collected_at}
                </strong>
                <code>{e.id}</code>
                <p>{explainEvidence(e, incident)}</p>
                <details>
                  <summary>Ham gözlemi aç</summary>
                  <pre>{JSON.stringify(e.data, null, 2)}</pre>
                </details>
              </article>
            ))}
          </section>
          <p>
            Doğrulanan adımlar: {caseData.checks.length}. Agent sisteme komut
            vermedi; düzeltmeyi mevcut onay mekanizması yaptı.
          </p>
        </div>
      )}
    </section>
  );
}

export function CasePage() {
  return (
    <main className="case-page">
      <header>
        <span className="eyebrow">AIOPS AGENT · GERÇEK ÇALIŞTIRMA KAYDI</span>
        <h1>Bir uygulama bozulduğunda ne olduğunu kanıtlarıyla anlayalım.</h1>
        <p>
          Bu projenin amacı, IT ekibinin arızayı fark etmesine, kanıtları
          incelemesine ve insan onayıyla kontrollü müdahale yapmasına yardımcı
          olmak. Aşağıdaki vaka, gerçek model çağrısıyla yürütülen tek bir
          testin sonucudur.
        </p>
      </header>
      <LiveCaseStudy defaultOpen />
      <footer>
        Bu kayıt başarı oranı veya üretim performansı ölçümü değildir. Modelin
        önerileri insan değerlendirmesi gerektirir.
      </footer>
    </main>
  );
}
