import { BookOpen, ChevronRight, CircleHelp } from "lucide-react";
import type { Evidence, Incident, Service, Source } from "./types";

export const pageTitles: Record<string, string> = {
  Overview: "Genel durum",
  Incidents: "Arıza kayıtları",
  Infrastructure: "İzlenen sistemler",
  "Knowledge base": "Çözüm rehberleri",
  Approvals: "İşlem onayları",
  "Audit trail": "İşlem geçmişi",
};

const labels: Record<string, string> = {
  healthy: "Sağlıklı",
  down: "Yanıt alınamıyor",
  unknown: "Henüz bilinmiyor",
  open: "Açık",
  investigating: "İnceleniyor",
  resolved: "Çözüldü",
  critical: "Kritik",
  warning: "Uyarı",
  real: "Gerçek gözlem",
  simulation: "Simülasyon",
  pending: "Onay bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  executing: "Uygulanıyor",
  succeeded: "Başarılı",
  failed: "Başarısız",
  queued: "Sırada",
  running: "İnceleniyor",
  completed: "Tamamlandı",
  rules: "Kural tabanlı inceleme",
  openai: "Yapay zekâ incelemesi",
  lexical: "Kelime eşleşmesi",
  "qdrant-lexical-hash": "Kelime tabanlı vektör araması",
  availability: "erişim",
  cpu: "işlemci",
  memory: "bellek",
  disk: "disk",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
  runbook: "Çözüm rehberi",
};
export const labelFor = (value: string) =>
  labels[value] || value.replaceAll("_", " ");
export const serviceTitle = (id: string) =>
  id === "sample-api"
    ? "İş uygulaması"
    : id === "sample-postgres"
      ? "Uygulamanın veritabanı"
      : id;
export const incidentTitle = (incident: Incident) =>
  `${serviceTitle(incident.service_id)} · ${labelFor(incident.check)} sorunu`;

const guides: Record<
  string,
  { title: string; purpose: string; read: string; next: string }
> = {
  Overview: {
    title:
      "Burada, iş uygulaması ve veritabanı cevap veriyor mu diye kontrol ediyoruz.",
    purpose:
      "Bir şirketin uygulaması çalışsa bile veritabanı cevap vermezse işlemler tamamlanamayabilir. Bu yüzden iki servisi ayrı ayrı izliyoruz.",
    read: "Sağlıklı: son kontrol başarılı. Yanıt alınamıyor: son kontrol başarısız. Bilinmiyor: yeterli gözlem yok. Yeşil bir kart, son kontrolün sonucunu gösterir.",
    next: "Önce aşağıdaki iki servisi tanı. Sonra bir arıza kaydına tıklayıp sistemin hangi kanıtlara baktığını incele.",
  },
  Incidents: {
    title:
      "Burada, fark edilen sorunları takip edilebilir arıza kayıtlarına dönüştürüyoruz.",
    purpose:
      "Tek bir arıza onlarca alarm üretebilir. Aynı sorun için gelen bildirimleri bir kayıtta toplamak, ekibin aynı işi tekrar tekrar yapmasını önler.",
    read: "Açık: inceleme bekliyor. İnceleniyor: ele alındı. Çözüldü: toparlanma gözlendi veya operatör bir açıklamayla kapattı. Çözülmüş olması, nedenin kesin olarak bulunduğu anlamına gelmez.",
    next: "Bir satıra tıkla. Ne zaman başladığını, kaç alarmın birleştiğini ve inceleme raporunun dayandığı kanıtları göreceksin.",
  },
  Detail: {
    title: "Burada, “ne oldu?” sorusunu kayıtlı gözlemlerle cevaplıyoruz.",
    purpose:
      "Bir servisin cevap vermemesi bir gözlemdir. “Disk dolduğu için durdu” demek için ayrıca disk ve hata kaydı kanıtı gerekir.",
    read: "Rapordaki her bulgunun altında bir kanıt bağlantısı var. Gözlemin zamanı önemlidir: arıza sırasında alınan veriyle daha sonra alınan sağlıklı sonuç farklı olabilir.",
    next: "Önce bulguları oku, ardından bir kanıt bağlantısına tıkla. Belirsiz kalan noktaları kontrol et; inceleme sonucu tek başına işlem yetkisi vermez.",
  },
  Infrastructure: {
    title:
      "Burada, hangi servisi nasıl kontrol ettiğimizi ve ölçümlerin ne anlama geldiğini görüyoruz.",
    purpose:
      "Erişim kontrolü “cevap var mı?” sorusunu, kaynak ölçümleri “işlemci, bellek veya disk baskısı var mı?” sorusunu cevaplar. Bunlar birlikte değerlendirilir.",
    read: "Her kart kendi servisinin erişim sonucunu gösterir. Kaynak değerleri bu Linux laboratuvarına aittir; bilgisayarının Windows kullanımını veya PostgreSQL sürecinin kendi kaynaklarını ölçmez.",
    next: "“Nasıl kontrol ediliyor?” alanlarını aç. Kaynak ölçümlerindeki açıklamaları ve son kontrol zamanını incele.",
  },
  "Knowledge base": {
    title:
      "Burada, benzer sorunlar için kaydedilmiş çözüm rehberlerini ve geçmiş arızaları arıyoruz.",
    purpose:
      "IT ekipleri daha önce işe yarayan inceleme adımlarını tekrar kullanır. Bu kayıtlar, her sorunda sıfırdan araştırma yapmayı azaltır.",
    read: "Bir arama sonucu mevcut arızanın nedenini kanıtlamaz. Kaynak ve sürüm bilgisi, önerinin hangi belgeye dayandığını gösterir. Mevcut arama kelime eşleşmesine dayanır.",
    next: "Örneğin “veritabanı erişim” yazıp ara. Rehberdeki adımları oku ve bir geçmiş arıza kaydıyla karşılaştır. Kaynakların özgün metni İngilizce olabilir.",
  },
  Approvals: {
    title:
      "Burada, sisteme değişiklik yapacak bir işlemi uygulamadan önce inceliyoruz.",
    purpose:
      "Yanlış bir düzeltme çalışan sistemi de bozabilir. Bu yüzden inceleme ile müdahaleyi ayırıyor ve her işlem için açık insan onayı istiyoruz.",
    read: "Onay belirli bir işleme ve hedefe aittir, süreli ve tek kullanımlıdır. Onaylamak, işlemi hemen çalıştırmaz; uygulamak için ayrı düğme vardır.",
    next: "Hedefi ve yapılacak işlemi oku. Uygun değilse reddet. Müdahale modu kapalıysa onaylı işlemler de uygulanamaz.",
  },
  "Audit trail": {
    title:
      "Burada, sistemde kimin hangi işlemi ne zaman yaptığını takip ediyoruz.",
    purpose:
      "Bir sorun sonrasında “ne değişti, işlem başarılı oldu mu, kim onayladı?” sorularını cevaplamak için işlem geçmişi tutulur.",
    read: "Her satır bir işlemdir. Sistem, izleme bileşeni ve kullanıcı işlemleri ayrı kaydedilir. Ayrıntılarda işlemin sonucunu görebilirsin.",
    next: "Bir arıza açılma kaydını veya giriş işlemini bul. Sonra ayrıntıyı açıp hangi hedefle ilgili olduğunu incele.",
  },
};

export function PageGuide({ page }: { page: string }) {
  const guide = guides[page] || guides.Overview;
  return (
    <section className="learning-panel" aria-label="Bu ekranın açıklaması">
      <div className="learning-heading">
        <span className="learning-icon">
          <BookOpen size={18} />
        </span>
        <div>
          <span className="eyebrow">BU EKRAN NE İŞE YARIYOR?</span>
          <h2>{guide.title}</h2>
        </div>
      </div>
      <div className="learning-columns">
        <div>
          <h3>Neden önemli?</h3>
          <p>{guide.purpose}</p>
        </div>
        <div>
          <h3>Sonucu nasıl okumalıyım?</h3>
          <p>{guide.read}</p>
        </div>
        <div>
          <h3>Nereden başlamalıyım?</h3>
          <p>{guide.next}</p>
        </div>
      </div>
    </section>
  );
}

export function WorkflowGuide({
  navigate,
}: {
  navigate: (page: string) => void;
}) {
  const steps = [
    [
      "Infrastructure",
      "Servisi kontrol et",
      "Uygulama ve veritabanından yanıt alınıyor mu?",
    ],
    [
      "Incidents",
      "Arızayı takip et",
      "Başarısız kontroller bir arıza kaydında birleştirilir.",
    ],
    [
      "Incidents",
      "Kanıtları incele",
      "Kaydın içindeki gözlem ve hata kayıtları okunur.",
    ],
    [
      "Approvals",
      "Onayla ve doğrula",
      "Uygun işlem onayla uygulanır; toparlanma tekrar kontrol edilir.",
    ],
  ];
  return (
    <section className="workflow-guide" aria-label="Sistem nasıl çalışıyor">
      <div className="section-heading">
        <h2>Sistem nasıl çalışıyor?</h2>
        <span>Adımlara tıklayarak ilgili ekranı açabilirsin.</span>
      </div>
      <div className="workflow-steps">
        {steps.map(([page, title, text], index) => (
          <button key={title} onClick={() => navigate(page)}>
            <span className="step-number">{index + 1}</span>
            <strong>{title}</strong>
            <p>{text}</p>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function Glossary() {
  return (
    <details className="glossary">
      <summary>
        <CircleHelp size={15} /> Bu terimler ne demek?
      </summary>
      <dl>
        {[
          [
            "Servis",
            "Belirli bir işi yapan çalışan yazılım. Burada uygulama ve PostgreSQL veritabanı birer servis.",
          ],
          [
            "Veritabanı / PostgreSQL",
            "Veritabanı, uygulama verilerini düzenli şekilde saklayan bileşendir. PostgreSQL bir veritabanı yazılımıdır; bu laboratuvarda ona bağlanıp yanıt alabildiğimizi kontrol ediyoruz.",
          ],
          [
            "API",
            "Bir uygulamanın başka yazılımlardan istek aldığı arayüz. Örneğin panel, izleme sonuçlarını uygulamanın API’sinden alır.",
          ],
          [
            "Container ve sanal ortam",
            "Yazılımları kendi çalışma ortamlarında çalıştırmaya yarar. Buradaki Linux laboratuvarının ölçümleri, Windows bilgisayarının tamamına ait ölçümler değildir.",
          ],
          [
            "Sağlık kontrolü",
            "Servise belirli aralıklarla bakıp beklenen yanıtı verip vermediğini kontrol etmek.",
          ],
          [
            "Alarm ve arıza kaydı (incident)",
            "Alarm bir sorun bildirimidir. Arıza kaydı, sorunu incelemek ve sonucunu takip etmek için açılır; birçok alarm tek kayıtta birleşebilir.",
          ],
          [
            "Kanıt (evidence)",
            "Kaynağı ve zamanı belli olan ölçüm ya da hata kaydı. Bir bulgunun neye dayandığını gösterir.",
          ],
          [
            "Hata kaydı (log)",
            "Bir yazılımın çalışırken yaşanan olayları yazdığı kayıt. Her satır hata değildir; içeriği ve zamanı birlikte okunur.",
          ],
          [
            "Çözüm rehberi (runbook)",
            "Belirli bir sorun için hazırlanmış inceleme veya müdahale adımları. Bir belgeyi okumak, içindeki komutların otomatik çalıştırıldığı anlamına gelmez.",
          ],
          [
            "HTTP 200 / 500 / 503",
            "200 başarılı yanıt; 500 uygulama hatası; 503 hizmetin hazır olmaması. Tek başına hata kodu, sorunun bütün nedenini açıklamaz.",
          ],
          [
            "Gerçek gözlem / simülasyon",
            "Gerçek gözlem çalışan laboratuvardan alınır; kontrollü test arızasını da ölçebilir. Simülasyon, test amacıyla gönderilmiş örnek veridir.",
          ],
        ].map(([term, definition]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function ServiceExplanation({ service }: { service: Service }) {
  const database = service.id === "sample-postgres";
  return (
    <div className="service-explanation">
      <p>
        {database
          ? "Veritabanının görevi uygulama verilerini saklamaktır. Bu laboratuvarda bağlantı kurup basit bir sorguya yanıt alabildiğimizi kontrol ediyoruz."
          : "Bu servis uygulamanın istekleri karşılayan bölümüdür. İzleme yanıtını ve etkin bir test hatası olup olmadığını kontrol ediyoruz."}
      </p>
      <details>
        <summary>Nasıl kontrol ediliyor?</summary>
        <p>
          {database
            ? "Veritabanına bağlanıp SELECT 1 sorgusu gönderilir. Yanıt veya zamanında bağlantı alınamazsa erişim kontrolü başarısız sayılır. Bu, tek başına PostgreSQL sürecinin neden durduğunu kanıtlamaz."
            : "Laboratuvar uygulamasının izleme verisi okunur. Uygulamanın kendi durumu ile veritabanı bağlantısı ayrı izlenir. Uygulama ayakta olsa bile veritabanı yoksa kullanıcı işlemlerine hazır olmayabilir."}
        </p>
      </details>
    </div>
  );
}

export function ServiceObservation({ service }: { service: Service }) {
  return (
    <p className="service-observation">
      {!service.checked_at
        ? "Henüz bir kontrol sonucu alınmadı."
        : service.status === "healthy"
          ? "Son kontrolde beklenen yanıt alındı."
          : service.status === "down"
            ? "Son kontrolde beklenen yanıt alınamadı; arıza kayıtlarını incele."
            : "Bu servisin durumunu doğrulayacak yeterli veri alınamadı."}
    </p>
  );
}

export const metricDescriptions: Record<
  string,
  { title: string; text: string }
> = {
  cpu: {
    title: "İşlemci kullanımı",
    text: "Uygulama sürecinin işlemci kullanımını gösterir. Sürekli yüksek olması yavaşlamayı açıklamaya yardımcı olabilir; tek ölçüm arızanın nedenini kanıtlamaz.",
  },
  memory: {
    title: "Bellek kullanımı",
    text: "Linux sanal ortamında görülen RAM kullanımını gösterir. PostgreSQL sürecine özel veya Windows bilgisayarının RAM ölçümü değildir.",
  },
  disk: {
    title: "Disk doluluğu",
    text: "Uygulama container’ının gördüğü dosya sistemindeki doluluğu gösterir. Alan azalırsa yazma işlemleri aksayabilir; uygulama hatasıyla ilişki için ek kanıt gerekir.",
  },
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function explainEvidence(
  evidence: Evidence,
  incident: Incident,
): string {
  const payload = object(evidence.data);
  const body = payload.data ? object(payload.data) : payload;
  const observation = object(
    body.observation ||
      body[incident.service_id === "sample-api" ? "api" : "database"],
  );
  const name = serviceTitle(incident.service_id);
  if (incident.check !== "availability" && typeof body.value === "number") {
    return `Kaydedilen ${labelFor(incident.check)} değeri %${body.value}; alarm sınırı %${body.threshold ?? 90}. Bu ölçümün kapsamını ve zamanını kontrol et.`;
  }
  if (observation.fault === "http500")
    return "İş uygulamasında kontrollü HTTP 500 test hatası etkin olarak gözlendi. Uygulama istekleri bu hata nedeniyle başarısız olabilir.";
  if (observation.healthy === true)
    return `${name}: bu gözlemin alındığı anda başarılı yanıt görüldü. Arızanın önceki kanıtlarıyla zamanını karşılaştır.`;
  if (observation.healthy === false)
    return `${name}: bu gözlemin alındığı anda beklenen yanıt alınamadı. Hatanın nedenini belirlemek için başka kanıtlar da gerekir.`;
  return `${name} için ${labelFor(incident.check)} kontrolüne ilişkin bir kayıt saklandı. Kaynağı ve zamanı aşağıda; kesin neden bu kayıttan tek başına çıkarılamaz.`;
}

export const reportText = (text: string) =>
  ({
    "Root cause is not established by availability failure alone.":
      "Bir servisten yanıt alınamaması, arızanın kesin nedenini tek başına göstermez.",
    "Container/VM metrics do not establish Windows host resource usage.":
      "Bu ölçümler Linux laboratuvarına aittir; Windows bilgisayarının kaynak durumunu göstermez.",
    "Historical runbooks describe possibilities, not proof of this incident's cause.":
      "Geçmiş çözüm rehberleri olası nedenleri anlatır; bu arızanın nedenine ait kanıt yerine geçmez.",
    "Review timestamped evidence and the linked runbooks.":
      "Zamanı belli olan kanıtları ve ilgili çözüm rehberlerini karşılaştır.",
    "For PostgreSQL failures, check database container logs and storage.":
      "Veritabanı arızalarında PostgreSQL hata kayıtlarını ve depolama durumunu ayrıca kontrol et.",
    "For an injected HTTP fault, request clear-http-fault:v1 approval; otherwise investigate before changing the system.":
      "Kontrollü HTTP 500 test hatası için uygun işlem onayı iste. Diğer sorunlarda değişiklikten önce incelemeyi tamamla.",
    "Recovery observed by monitoring":
      "İzleme sistemi yeniden başarılı yanıt gördüğü için kayıt kapatıldı.",
  })[text] || text;

export function auditLabel(action: string) {
  const actions: Record<string, string> = {
    "backend.started": "Platform başlatıldı",
    "incident.created": "Arıza kaydı açıldı",
    "incident.resolved": "Arıza kaydı kapatıldı",
    "incident.investigating": "Arıza incelemeye alındı",
    "diagnosis.queued": "İnceleme sıraya alındı",
    "diagnosis.completed": "İnceleme tamamlandı",
    "diagnosis.failed": "İnceleme tamamlanamadı",
    "approval.requested": "İşlem için onay istendi",
    "approval.approved": "İşlem onaylandı",
    "approval.rejected": "İşlem reddedildi",
    "runbook.started": "Onaylı işlem başlatıldı",
    "runbook.succeeded": "İşlem ve sağlık kontrolü başarılı",
    "runbook.failed": "İşlem veya sağlık kontrolü başarısız",
    "auth.login": "Kullanıcı giriş yaptı",
    "auth.logout": "Kullanıcı çıkış yaptı",
    "auth.account_created": "Kullanıcı hesabı oluşturuldu",
    "auth.login_failed": "Giriş denemesi başarısız",
    "request.denied": "İşlem isteğine izin verilmedi",
  };
  return (
    actions[action] ||
    (action.startsWith("tool.") ? "İnceleme için veri toplandı" : action)
  );
}

export function knowledgeQuery(query: string): string {
  const aliases: Record<string, string> = {
    veritabanı: "postgres database",
    veritabanına: "postgres database",
    erişim: "availability",
    bağlantı: "connectivity connection",
    işlemci: "cpu",
    bellek: "memory",
    doluluk: "pressure disk",
    hata: "error",
    uygulama: "application",
    rehber: "troubleshooting",
  };
  return query
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,!?]/g, " ")
    .split(/\s+/)
    .map((word) => aliases[word] || word)
    .join(" ")
    .slice(0, 500);
}

export function sourceTitle(source: Source): string {
  const titles: Record<string, string> = {
    "runbook:postgres-unavailable":
      "Veritabanına erişilemiyor: inceleme rehberi",
    "runbook:http500": "Uygulama HTTP 500 hatası: inceleme rehberi",
    "runbook:resource-pressure": "İşlemci, bellek ve disk baskısını inceleme",
  };
  if (titles[source.id]) return titles[source.id];
  if (source.id.startsWith("incident:")) {
    const service = source.title.split(":")[0];
    return `Geçmiş arıza kaydı · ${serviceTitle(service)}`;
  }
  return source.title;
}

export function sourceSummary(source: Source): string {
  if (source.id === "runbook:postgres-unavailable")
    return "Bağlantı hatasının tek bir nedeni yoktur. Bu rehber servis durumu, hata kayıtları ve depolamayı birlikte kontrol etmeyi anlatır; doğrudan veri silmeyi önermez.";
  if (source.id === "runbook:http500")
    return "Önce hatanın kasıtlı test hatası mı, başka bir uygulama sorunu mu olduğunu ayır. Hazır düzeltme yalnızca doğrulanmış test hatasını temizler ve ardından sağlık kontrolü yapar.";
  if (source.id === "runbook:resource-pressure")
    return "Kaynak ölçümünün hangi ortama ait olduğunu ve baskının devam edip etmediğini incele. Yüksek bir yüzde, tek başına veritabanı arızasının nedenini kanıtlamaz.";
  if (source.id.startsWith("incident:"))
    return "Bu, sonucu kaydedilmiş önceki bir arızadır. Geçmişteki çözümü mevcut soruna uygulamadan önce belirtileri ve kanıtları karşılaştır.";
  return "Kayıtlı kaynak metnini ve sürümünü incele. Buradaki açıklamaları mevcut arızanın gözlemleriyle karşılaştır.";
}
