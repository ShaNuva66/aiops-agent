import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Server,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Incident } from "./types";
import {
  auditLabel,
  explainEvidence,
  labelFor,
  reportText,
  serviceTitle,
} from "./learning";

const scenarios = {
  http: [
    {
      title: "Her şey çalışıyor",
      action:
        "Kullanıcı uygulamaya istek gönderiyor. Uygulama ve veritabanı yanıt veriyor.",
      app: "ok",
      db: "ok",
      response: "200 · İstek başarılı",
      observation: "Beklenen durum",
      operation: "Henüz müdahale gerekmiyor.",
    },
    {
      title: "Test hatası açılıyor",
      action:
        "Laboratuvar yöneticisi HTTP 500 test hatasını açıyor. Hata sistem tarafından kendiliğinden üretilmiyor.",
      app: "bad",
      db: "ok",
      response: "500 · Uygulama hatası",
      observation: "Uygulama hatası etkin",
      operation: "Bu örnekte hatanın nasıl oluştuğu biliniyor: kontrollü test.",
    },
    {
      title: "İzleme hatayı yakalıyor",
      action:
        "Kolektör iki başarısız erişim gözleminden sonra bir arıza kaydı açıyor. İlk gözlem kanıt olarak saklanıyor.",
      app: "bad",
      db: "ok",
      response: "500 · İstek başarısız",
      observation: "Arıza kaydı açıldı",
      operation:
        "Kural tabanlı inceleme kayıtlı bulguyu açıklar; kesin nedeni tahmin etmez.",
    },
    {
      title: "İnsan işlemi onaylıyor",
      action:
        "Operatör yalnızca bu uygulamadaki test hatasını temizleme isteğini inceliyor ve onaylıyor. Onay tek başına işlemi başlatmıyor.",
      app: "bad",
      db: "ok",
      response: "500 · Hata sürüyor",
      observation: "Onay → ayrı çalıştırma adımı",
      operation: "Gerçek müdahalede ayrıca laboratuvar işlem izni açık olmalı.",
    },
    {
      title: "Test hatası temizleniyor",
      action:
        "Operatör işlemi çalıştırıyor. Yürütücü önce HTTP 500 test hatasının gerçekten etkin olduğunu kontrol ediyor, ardından sabit temizleme işlemini uyguluyor.",
      app: "ok",
      db: "ok",
      response: "200 · İşlem sonrası kontrol",
      observation: "Hazırlık kontrolü yeniden yapıldı",
      operation: "Onay tüketilir; aynı onayla ikinci kez işlem yapılamaz.",
    },
    {
      title: "Toparlanma doğrulanıyor",
      action:
        "İşlem sonrası hazırlık kontrolü 200 döndü. Sonraki sağlıklı izleme gözlemi arıza kaydını kapatır; kanıt ve işlem geçmişi saklanır.",
      app: "ok",
      db: "ok",
      response: "200 · Yeniden yanıt alınıyor",
      observation: "Arıza çözüldü",
      operation:
        "Başarılı temizleme ile arızanın izleme tarafından kapanması ayrı adımlardır.",
    },
  ],
  database: [
    {
      title: "Bağlantı kurulabiliyor",
      action:
        "Uygulama veritabanına bağlanıyor. SELECT 1 kontrolü yanıt alıyor.",
      app: "ok",
      db: "ok",
      response: "200 · Uygulama hazır",
      observation: "Veritabanı erişimi başarılı",
      operation: "İki servis ayrı ayrı izleniyor.",
    },
    {
      title: "Test veritabanı durduruluyor",
      action:
        "Bu örnekte yönetici laboratuvarın PostgreSQL container’ını durduruyor. Kontrol veritabanı ayrı olduğu için izleme paneli çalışmaya devam ediyor.",
      app: "warn",
      db: "bad",
      response: "503 · Bağımlılık hazır değil",
      observation: "Veritabanına bağlantı kurulamıyor",
      operation:
        "Bu, senaryonun bilinen nedeni. Gerçek erişim hatalarında neden ayrıca araştırılır.",
    },
    {
      title: "Bağlantı hatası kaydediliyor",
      action:
        "İki başarısız bağlantı gözleminden sonra veritabanı için arıza açılıyor. Uygulama süreci ayakta olsa da bağımlılığı olmadan hazır sayılmıyor.",
      app: "warn",
      db: "bad",
      response: "503 · Hazırlık kontrolü başarısız",
      observation: "Veritabanı arıza kaydı açıldı",
      operation:
        "Kanıt yalnızca erişilemediğini gösterir; tek başına neden durduğunu kanıtlamaz.",
    },
    {
      title: "Operatör nedeni inceliyor",
      action:
        "Operatör container durumunu ve veritabanı hata kayıtlarını kontrol ediyor. Bu senaryoda kasıtlı durdurmayı doğruluyor.",
      app: "warn",
      db: "bad",
      response: "503 · Sorun devam ediyor",
      observation: "Otomatik yeniden başlatma yok",
      operation: "HTTP hata temizleme işlemi veritabanını düzeltmez.",
    },
    {
      title: "Veritabanı yeniden başlatılıyor",
      action:
        "Yönetici laboratuvar PostgreSQL container’ını yeniden başlatıyor. Bu işlemi mevcut AIOps ajanı otomatik yapmıyor.",
      app: "warn",
      db: "wait",
      response: "Bağlantı tekrar kontrol ediliyor",
      observation: "Yanıt bekleniyor",
      operation: "Başlatma komutunun verilmesi, toparlanma kanıtı değildir.",
    },
    {
      title: "Bağlantı yeniden doğrulanıyor",
      action:
        "SELECT 1 yeniden başarılı oluyor. İzleme sağlıklı sonucu gördüğünde arızayı kapatıyor; uygulamanın hazırlık kontrolü de 200 dönüyor.",
      app: "ok",
      db: "ok",
      response: "200 · Bağımlılık yeniden hazır",
      observation: "Arıza çözüldü",
      operation:
        "Kapanış, kontrolün başarılı olduğunu gösterir; kimin başlattığı ayrı işlem kaydı gerektirir.",
    },
  ],
};

function Flow({ app, db }: { app: string; db: string }) {
  return (
    <div
      className="system-flow"
      aria-label="Kullanıcı, uygulama ve veritabanı bağlantısı"
    >
      <div className="flow-node ok">
        <Monitor />
        <strong>Kullanıcı</strong>
        <small>İstek gönderiyor</small>
      </div>
      <div className={`flow-link ${app}`}>
        <span />
        <ArrowRight />
      </div>
      <div className={`flow-node ${app}`}>
        <Server />
        <strong>İş uygulaması</strong>
        <small>
          {app === "bad"
            ? "HTTP 500 hatası"
            : app === "warn"
              ? "Ayakta · bağımlılık eksik"
              : "Yanıt veriyor"}
        </small>
      </div>
      <div className={`flow-link ${db}`}>
        <span />
        <ArrowRight />
      </div>
      <div className={`flow-node ${db}`}>
        <Database />
        <strong>Veritabanı</strong>
        <small>
          {db === "bad"
            ? "Bağlantı kurulamadı"
            : db === "wait"
              ? "Bağlantı bekleniyor"
              : "Sorguya yanıt veriyor"}
        </small>
      </div>
    </div>
  );
}

export function FaultWalkthrough() {
  const [scenario, setScenario] = useState<"http" | "database">("http");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = scenarios[scenario];
  const current = steps[step];
  useEffect(() => {
    if (!playing) return;
    if (step === steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStep((value) => value + 1), 6500);
    return () => clearTimeout(timer);
  }, [playing, step, steps.length]);
  return (
    <section
      className="fault-player panel"
      aria-label="Arıza senaryosu oynatıcısı"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">GÖREREK ÖĞREN</span>
          <h2>Bir arıza nasıl oluşur, nasıl çözülür?</h2>
        </div>
        <span className="demo-label">Eğitim simülasyonu</span>
      </div>
      <p className="demo-boundary">
        Bu oynatıcı örnek bir süreci gösterir. Gerçek sisteme komut göndermez;
        aşağıdaki canlı kayıtlar ayrı tutulur.
      </p>
      <div className="scenario-tabs" aria-label="Örnek senaryo">
        <button
          aria-pressed={scenario === "http"}
          onClick={() => {
            setScenario("http");
            setStep(0);
            setPlaying(false);
          }}
        >
          Uygulama hata verirse
        </button>
        <button
          aria-pressed={scenario === "database"}
          onClick={() => {
            setScenario("database");
            setStep(0);
            setPlaying(false);
          }}
        >
          Veritabanı durursa
        </button>
      </div>
      <Flow app={current.app} db={current.db} />
      <div className={`response-strip ${current.app}`}>
        <ActivityIndicator state={current.app} />
        <strong>{current.response}</strong>
        <span>{current.observation}</span>
      </div>
      <ol className="scenario-steps">
        {steps.map((item, index) => (
          <li key={item.title}>
            <button
              aria-current={index === step ? "step" : undefined}
              aria-label={`${index + 1}. ${item.title}`}
              className={index < step ? "passed" : ""}
              onClick={() => {
                setStep(index);
                setPlaying(false);
              }}
            >
              <span>
                {index < step ? <CheckCircle2 size={15} /> : index + 1}
              </span>
              {item.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="scenario-caption" aria-live="polite">
        <span>
          ADIM {step + 1} / {steps.length}
        </span>
        <h3>{current.title}</h3>
        <p>{current.action}</p>
        <div>
          <ShieldCheck size={17} />
          {current.operation}
        </div>
      </div>
      <div className="player-controls">
        <button
          className="secondary"
          onClick={() => {
            setStep(0);
            setPlaying(false);
          }}
        >
          <RotateCcw size={15} /> Baştan
        </button>
        <button
          className="secondary"
          disabled={step === 0}
          onClick={() => {
            setStep(step - 1);
            setPlaying(false);
          }}
        >
          Önceki adım
        </button>
        <button
          className="secondary"
          onClick={() => {
            if (step === steps.length - 1) setStep(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? "Duraklat" : "Oynat"}
        </button>
        <button
          className="primary"
          disabled={step === steps.length - 1}
          onClick={() => {
            setStep(step + 1);
            setPlaying(false);
          }}
        >
          Sonraki adım <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

function ActivityIndicator({ state }: { state: string }) {
  return state === "bad" || state === "warn" ? (
    <TriangleAlert size={18} />
  ) : (
    <CheckCircle2 size={18} />
  );
}

const timestamp = (value: string) =>
  new Date(
    /[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : value + "Z",
  ).toLocaleString("tr-TR");
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function IncidentStory({ incident }: { incident: Incident }) {
  const story = incident.story;
  const [focus, setFocus] = useState(0);
  useEffect(() => setFocus(0), [incident.id]);
  if (!story)
    return (
      <section className="panel">
        <h2>Olayın akışı yükleniyor…</h2>
      </section>
    );
  const initial = incident.evidence?.find(
    (e) => asObject(e.data).state === "problem",
  );
  const initialBody = asObject(asObject(initial?.data).data);
  const observation = asObject(initialBody.observation);
  const knownFault = observation.fault === "http500";
  const completed = story.approvals.filter((a) => a.status === "succeeded");
  const failed = story.approvals.filter((a) => a.status === "failed");
  const closed = story.actions.find((a) => a.action === "incident.resolved");
  const points = [
    {
      title: "Önce",
      state: story.previous ? "ok" : "wait",
      headline: story.previous
        ? "Önceki başarılı kontrol kayıtlı"
        : "Önceki durum kayıtlı değil",
      description: story.previous
        ? `${timestamp(story.previous.observed_at)} tarihinde aynı servis ve aynı kontrol için başarılı gözlem var.`
        : "Bu arızadan önceki başarılı kontrol bulunamadı. Öncesini sağlıklı varsaymıyoruz.",
    },
    {
      title: "Hata",
      state: "bad",
      headline: knownFault
        ? "HTTP 500 test hatası görüldü"
        : `${serviceTitle(incident.service_id)} · ${labelFor(incident.check)} alarmı`,
      description: initial
        ? explainEvidence(initial, incident)
        : "İlk kontrolün ayrıntısı bulunamadı.",
      time: initial
        ? String(asObject(initial.data).observed_at || initial.collected_at)
        : incident.created_at,
    },
    {
      title: "Tespit",
      state: "warn",
      headline: `${incident.alert_count} alarm bir arızada toplandı`,
      description: `${timestamp(incident.created_at)} tarihinde kayıt açıldı. ${(incident.diagnoses || []).filter((d) => d.status === "completed").length} inceleme tamamlandı. Bu sayı, düzeltme yapıldığı anlamına gelmez.`,
    },
    {
      title: "İşlem",
      state: completed.length ? "ok" : failed.length ? "bad" : "wait",
      headline: completed.length
        ? "Onaylı hata temizleme başarılı"
        : failed.length
          ? "İşlem veya doğrulama başarısız"
          : "Başarılı otomatik müdahale kaydı yok",
      description: completed.length
        ? "İş uygulamasındaki test hatası temizlendi; işlem sonrası hazırlık kontrolü 200 döndü. Aşağıda onay ve çalıştırma adımları var."
        : failed.length
          ? "Deneme tamamlanamadı. Bu, sistemin düzeldiği anlamına gelmez; ayrıntıları işlem kaydında incele."
          : closed?.actor === "operator"
            ? `Kullanıcı kaydı notla kapatmış: ${reportText(incident.resolution_note || "")}`
            : "İnceleme veya onay oluşturulması, düzeltme değildir. Haricî bir yönetici işlemi bu kayıtta yoksa nasıl düzeltildiği bilinmez.",
    },
    {
      title: "Sonuç",
      state: story.recovery
        ? "ok"
        : incident.status === "resolved"
          ? "warn"
          : "wait",
      headline: story.recovery
        ? "Sağlıklı gözlemle kapandı"
        : incident.status === "resolved"
          ? "Notla kapandı · sağlık doğrulaması yok"
          : "Kayıt hâlâ açık",
      description: story.recovery
        ? `${timestamp(story.recovery.observed_at)} tarihinde bu kontrolün başarılı sonucu alındı. İzleme kaydı kapattı. Bu gözlem, hatayı kimin düzelttiğini tek başına açıklamaz.`
        : incident.status === "resolved"
          ? "Kayıt kapatılmış, ancak buna bağlı otomatik toparlanma gözlemi yok. Kapanış notunu kontrol et."
          : "Bu kayıt için kapanış henüz kaydedilmedi. Güncel servis kartı ile arıza geçmişi farklı zamanları gösterebilir.",
    },
  ];
  return (
    <section className="panel incident-story" aria-label="Bu arızada ne oldu">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">BU KAYDIN HİKÂYESİ</span>
          <h2>Ne bozuldu? Ne yapıldı? Sonuç ne?</h2>
        </div>
        <span className="demo-label">
          {incident.source_kind === "simulation"
            ? "Simülasyon kaydı"
            : "Kayıtlı gerçek gözlemler"}
        </span>
      </div>
      <div className="record-track">
        {points.map((point, index) => (
          <button
            key={point.title}
            className={`record-point ${point.state}`}
            aria-pressed={focus === index}
            onClick={() => setFocus(index)}
          >
            <span>{index + 1}</span>
            <small>{point.title}</small>
            <strong>{point.headline}</strong>
          </button>
        ))}
      </div>
      <div className="record-focus" aria-live="polite">
        <h3>{points[focus].headline}</h3>
        <p>{points[focus].description}</p>
        {points[focus].time && <small>{timestamp(points[focus].time!)}</small>}
        {focus === 1 && initial && (
          <a href={"#evidence-" + initial.id}>
            Bu bulgunun kanıtına git <ArrowRight size={14} />
          </a>
        )}
      </div>
      <details className="record-events">
        <summary>
          Yapılan işlemleri tarih sırasıyla göster ({story.actions.length})
        </summary>
        <ol>
          {story.actions.map((action) => (
            <li key={action.id}>
              <time>{timestamp(action.created_at)}</time>
              <strong>{auditLabel(action.action)}</strong>
              <span>
                {action.actor === "operator"
                  ? "Operatör"
                  : action.actor === "monitoring"
                    ? "İzleme"
                    : action.actor === "executor"
                      ? "İşlem yürütücüsü"
                      : action.actor}
              </span>
              <small>Kayıt: {action.id.slice(0, 8)}</small>
            </li>
          ))}
        </ol>
        {story.actions.length >= story.actions_limit && (
          <p>En son {story.actions_limit} işlem gösteriliyor.</p>
        )}
      </details>
    </section>
  );
}
