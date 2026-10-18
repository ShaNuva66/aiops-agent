import { Bot, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import type { Incident } from "./types";

export function AgentContribution({ incident }: { incident: Incident }) {
  const runs = (incident.diagnoses || []).filter(
    (d) => d.provider === "openai",
  );
  const run = runs.find((d) => d.status === "completed" && d.report);
  const calls = (incident.story?.actions || []).filter(
    (a) => a.action.startsWith("tool.") && a.actor === "diagnosis-agent",
  );
  const names: Record<string, string> = {
    "tool.get_incident_evidence": "Agent arızanın kanıtlarını okudu",
    "tool.search_knowledge_base":
      "Agent çözüm rehberlerini ve geçmiş arızaları okudu",
    "tool.get_service_status": "Agent servisin mevcut durumunu kontrol etti",
    "tool.collect_telemetry": "Sistem yeni laboratuvar gözlemi topladı",
    "tool.collect_failed": "Yeni gözlem toplanamadı",
  };
  return (
    <section
      className="panel agent-contribution"
      aria-label="Yapay zekânın katkısı"
    >
      <div className="panel-heading">
        <h2>
          <Bot size={21} /> Bu olayda AI agent ne yaptı?
        </h2>
        <span className="demo-label">
          {run ? "Kaydedilmiş model yanıtı" : "Başarılı AI çalıştırması yok"}
        </span>
      </div>
      {!run ? (
        <p>
          {runs.some((d) => d.status === "running" || d.status === "queued")
            ? "AI incelemesi sürüyor. Tamamlanınca gerçek bulgular ve öneriler burada görünecek."
            : "Bu kayıt için tamamlanmış bir AI raporu yok. Kural tabanlı raporlar AI katkısı sayılmıyor."}
        </p>
      ) : (
        <>
          <p className="agent-summary">{run.report!.summary}</p>
          <div className="agent-columns">
            <div>
              <h3>
                <Search size={17} /> Kanıttan ne çıkardı?
              </h3>
              {run.report!.findings.map((finding, n) => (
                <article key={n}>
                  <p>{finding.statement}</p>
                  {finding.evidence_ids.map((id) => (
                    <a key={id} href={"#evidence-" + id}>
                      Kanıtı aç · {id.slice(0, 8)} ↗{" "}
                    </a>
                  ))}
                </article>
              ))}
            </div>
            <div>
              <h3>
                <CheckCircle2 size={17} /> Ne önerdi?
              </h3>
              <ol>
                {run.report!.recommendations.map((s, n) => (
                  <li key={n}>{s}</li>
                ))}
              </ol>
              <h3>Hangi noktalar belirsiz?</h3>
              {!run.report!.unknowns.length && (
                <p>
                  Model bu raporda belirsizlik belirtmedi. Bu, nedenin kesin
                  olarak kanıtlandığı anlamına gelmez.
                </p>
              )}
              <ul>
                {run.report!.unknowns.map((s, n) => (
                  <li key={n}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      <details>
        <summary>Kayıtlı araç çağrılarını göster ({calls.length})</summary>
        <ol>
          {calls.map((a) => (
            <li key={a.id}>
              {names[a.action] || a.action}{" "}
              <small>
                · {a.created_at} · {a.id.slice(0, 8)}
              </small>
            </li>
          ))}
        </ol>
        <p>
          Bu liste olayın mevcut işlem geçmişidir; önceki incelemeleri de
          içerebilir. Araç çağrısı, başarılı düzeltme kanıtı değildir.
        </p>
      </details>
      <div className="callout">
        <ShieldCheck size={18} />
        <span>
          Agent kanıtları yorumladı ve öneri hazırladı. Sistemde değişiklik
          yapma yetkisi yok. Uygulanan işlemi ve sonucunu yukarıdaki “İşlem” ve
          “Sonuç” adımlarında kontrol et.
        </span>
      </div>
    </section>
  );
}
