import { buildCaseView, formatRecordTime } from "./observatory-data";
import type { RecordedCase } from "./observatory-data";

/** Every record value is text. No recorded URL, HTML or executable content is trusted. */
const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const originalJson = (value: unknown): string => {
  try {
    return escapeHtml(JSON.stringify(value ?? null, null, 2));
  } catch {
    return "Kaynak JSON verisi okunamadı.";
  }
};

const rawRecord = (title: string, value: unknown) =>
  value === null || value === undefined
    ? `<p class="missing">${escapeHtml(title)} bulunamadı.</p>`
    : `<details><summary>${escapeHtml(title)} · ayrıntıyı aç</summary><pre>${originalJson(value)}</pre></details>`;

/** Portable, read-only report. Opening the resulting document makes no requests. */
export function buildIncidentSummaryHtml(record: RecordedCase): string {
  const view = buildCaseView(record);
  const {
    caseIncident,
    caseReport,
    caseAudit,
    modelTools,
    outcome,
    casePhases,
  } = view;
  const metadata = record as RecordedCase & {
    scope?: unknown;
    approval_actor?: unknown;
  };
  const scope =
    typeof metadata.scope === "string" && metadata.scope.trim()
      ? metadata.scope
      : "Platform ve depolama kapsamı kayıtta belirtilmemiş.";
  const sourceKind =
    caseIncident.source_kind === "real"
      ? "Gerçek gözlem"
      : caseIncident.source_kind === "simulation"
        ? "Simülasyon"
        : "Kaynak türü belirtilmemiş";
  const statusLabels: Record<string, string> = {
    resolved: "Çözüldü",
    open: "Açık",
    investigating: "İnceleniyor",
  };
  const status = Object.hasOwn(statusLabels, caseIncident.status)
    ? statusLabels[caseIncident.status]
    : caseIncident.status;
  const evidence = caseIncident.evidence ?? [];
  const checked = record.checks.length
    ? `<ul class="compact">${record.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>`
    : '<p class="missing">Kaydedilmiş doğrulama kontrolü yok.</p>';
  const references = (ids: string[]) =>
    ids.length
      ? `<ul class="citations">${ids
          .map((id) => {
            const index = evidence.findIndex((item) => item.id === id);
            return index < 0
              ? `<li><code>${escapeHtml(id)}</code> — Bu belgeye eklenmiş kanıtta bulunamadı.</li>`
              : `<li><a href="#evidence-${index + 1}">Kanıt ${index + 1}</a> · <code>${escapeHtml(id)}</code></li>`;
          })
          .join("")}</ul>`
      : '<p class="muted">Bu bulguda kanıt kimliği belirtilmemiş.</p>';
  const report = caseReport
    ? `<div class="report-body">
        <p>${escapeHtml(caseReport.summary)}</p>
        <h3>Modelin bulguları ve dayanakları</h3>
        ${caseReport.findings.map((finding) => `<article class="finding"><p>${escapeHtml(finding.statement)}</p><p class="muted">Modelin güven ifadesi: ${escapeHtml(finding.confidence)}</p>${references(finding.evidence_ids)}</article>`).join("")}
        <h3>Modelin önerileri</h3>
        ${caseReport.recommendations.length ? `<ol>${caseReport.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : '<p class="muted">Öneri kaydedilmemiş.</p>'}
        <h3>Belirsizlikler</h3>
        ${caseReport.unknowns.length ? `<ul>${caseReport.unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="muted">Model belirsizlik belirtmedi. Bu, nedenin kesin olarak kanıtlandığı veya önerilerin doğru olduğu anlamına gelmez.</p>'}
        <h3>Rapordaki rehber kimlikleri</h3>
        ${caseReport.source_ids.length ? `<ul>${caseReport.source_ids.map((id) => `<li><code>${escapeHtml(id)}</code></li>`).join("")}</ul>` : '<p class="muted">Raporda çözüm rehberi kimliği yok.</p>'}
        <p class="boundary">Özgün rehber metni bu kayıtta yok. Yukarıdakiler model raporundaki kaynak kimlikleridir; arama sırasında okunmuş belgenin tam içeriği veya sürümü bu özetten doğrulanamaz.</p>
      </div>`
    : '<p class="missing">Tamamlanmış AI raporu yok. Bu kayıttan bir modelin ne bulduğu veya ne önerdiği gösterilemez.</p>';
  const tools = modelTools.length
    ? `<ol class="tools">${modelTools.map((tool) => `<li><strong>${escapeHtml(tool.title)}</strong><p>${escapeHtml(tool.description)}</p><p class="muted">${escapeHtml(formatRecordTime(tool.at))} · İşlem kimliği: <code>${escapeHtml(tool.id)}</code></p></li>`).join("")}</ol>`
    : '<p class="missing">Seçili AI çalışmasına ve bu arızaya bağlanabilen model araç çağrısı bulunamadı.</p>';
  const evidenceCards = evidence.length
    ? evidence
        .map(
          (item, index) =>
            `<article class="evidence" id="evidence-${index + 1}"><div class="eyebrow">KANIT ${index + 1}</div><h3>${escapeHtml(item.source)}</h3><p>Kimlik: <code>${escapeHtml(item.id)}</code><br>Toplama zamanı: ${escapeHtml(formatRecordTime(item.collected_at))}</p>${rawRecord("Özgün kanıt verisi", item.data)}</article>`,
        )
        .join("")
    : '<p class="missing">Bu özete eklenmiş kanıt kaydı yok.</p>';
  const actions = caseAudit.length
    ? `<div class="table-wrap"><table><thead><tr><th>Saat</th><th>İşlem</th><th>Aktör</th><th>Kimlik</th></tr></thead><tbody>${caseAudit.map((action) => `<tr><td>${escapeHtml(formatRecordTime(action.created_at))}</td><td>${escapeHtml(action.action)}</td><td>${escapeHtml(action.actor)}</td><td><code>${escapeHtml(action.id)}</code></td></tr>`).join("")}</tbody></table></div>`
    : '<p class="missing">İşlem geçmişi kaydedilmemiş.</p>';

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>AIOps · Olay özeti · ${escapeHtml(caseIncident.id)}</title>
<style>
  :root{color-scheme:dark;--bg:#111b29;--surface:#1b2939;--line:#34485d;--text:#e5edf6;--muted:#a6b9cb;--cyan:#8fd4d5;--amber:#e8c18a;--green:#90d4bc;--coral:#f2aa98}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.75 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:1050px;margin:auto;padding:48px 28px 70px}header{padding:32px;border:1px solid #45647a;border-radius:18px;background:linear-gradient(125deg,#192c42,#1b3645)}h1,h2,h3{line-height:1.3;overflow-wrap:anywhere}h1{font-size:clamp(29px,5vw,44px);letter-spacing:-.04em;margin:18px 0}h2{font-size:27px;margin:0 0 20px}h3{font-size:19px;margin:24px 0 10px}p{margin:10px 0}a{color:var(--cyan);text-underline-offset:4px}a:focus-visible,summary:focus-visible{outline:3px solid var(--amber);outline-offset:4px}.brand{font-size:16px;font-weight:750;letter-spacing:.12em}.eyebrow{color:var(--cyan);font-size:12px;letter-spacing:.1em;font-weight:650}.badge{display:inline-block;margin-top:15px;padding:6px 11px;border:1px solid #527783;border-radius:20px;color:#bedce8;font-size:12px}.intro{color:#cad9e6;max-width:780px}.meta{display:flex;flex-wrap:wrap;gap:8px 24px;color:var(--muted);font-size:14px;margin-top:22px}.meta code{font-size:13px}.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0 36px}.fact{background:var(--surface);padding:20px;border:1px solid var(--line);border-radius:12px}.fact small{display:block;color:var(--muted);font-size:12px;letter-spacing:.07em}.fact strong{display:block;font-size:21px;line-height:1.45;margin:10px 0}.fact p{font-size:14px;color:var(--muted)}.good{color:var(--green)}.bad{color:var(--coral)}.unknown{color:var(--amber)}section{margin-top:38px}.panel,.evidence{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:25px;margin:16px 0}.roles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.roles article{border:1px solid var(--line);border-radius:12px;padding:21px;background:#1a2b3b}.roles h3{margin-top:8px}.roles p{color:#c0cfdd;font-size:15px}.roles .eyebrow{color:var(--amber)}.timeline{list-style:none;padding:0;counter-reset:phase}.timeline>li{counter-increment:phase;border-left:2px solid #49657c;padding:0 0 28px 24px;margin-left:12px}.timeline>li:last-child{padding-bottom:0}.timeline h3{margin-top:5px}.timeline .eyebrow:before{content:counter(phase,decimal-leading-zero)" / ";color:var(--amber)}.muted{color:var(--muted);font-size:14px}.impact{padding:12px 16px;background:#243b4e;border-radius:7px;margin-top:12px;font-size:15px}.boundary{border-left:3px solid #cba569;padding:12px 17px;background:#342f2a;color:#ded3bf;font-size:15px;margin:20px 0}.missing{color:var(--amber);padding:12px 0}.finding{border-left:3px solid #6f9ed0;background:#243a52;padding:14px 18px;margin:16px 0;border-radius:0 7px 7px 0}.citations{font-size:14px;padding-left:20px}.tools{padding-left:23px}.tools>li{padding:8px 0 18px}.compact{font-size:14px}li{padding-left:3px;margin:8px 0}code,pre{font-family:ui-monospace,Consolas,monospace;font-size:.82em;overflow-wrap:anywhere}pre{white-space:pre-wrap;word-break:break-word;background:#12202e;border:1px solid var(--line);border-radius:7px;padding:17px;line-height:1.65}summary{color:var(--cyan);cursor:pointer;padding:12px 0;font-size:14px}details{margin-top:14px}table{width:100%;border-collapse:collapse;font-size:13px;text-align:left}th,td{padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}th{color:var(--muted);background:#162333}.table-wrap{overflow:auto}footer{margin-top:38px;padding-top:25px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}footer strong{color:var(--text)}
  @media(max-width:720px){main{padding:22px 16px 40px}header{padding:23px}.facts{grid-template-columns:repeat(2,minmax(0,1fr))}.roles{grid-template-columns:1fr}.panel,.evidence{padding:20px}h2{font-size:24px}.fact{padding:15px}.fact strong{font-size:18px}}
  @media(max-width:390px){body{font-size:16px}.facts{grid-template-columns:1fr}.meta{display:block}.meta>span{display:block;margin-top:6px}}
  @media print{:root{color-scheme:light;--bg:#fff;--surface:#fff;--line:#c5cdd5;--text:#152536;--muted:#435566;--cyan:#175e69;--amber:#76530d;--green:#206049;--coral:#943c32}body{font-size:10.5pt}main{max-width:none;padding:0}header{background:#f1f4f6;border-color:#9baebd;padding:20px}.intro,.roles p{color:#30495d}.badge{color:#30495d;border-color:#7d93a3}.fact,.panel,.evidence,.roles article,.finding,.impact,.boundary,th,pre{background:#fff;color:var(--text);box-shadow:none}h1{font-size:27pt}h2{font-size:19pt}h3{font-size:13pt}.facts{gap:8px;margin:18px 0}.fact{padding:12px}.fact strong{font-size:14pt}.panel,.evidence{padding:17px}.table-wrap{overflow:visible}a{color:#175e69;text-decoration:underline}header,.fact,.roles article,.timeline>li,.finding{break-inside:avoid}pre{font-size:8pt}summary{font-size:10pt}section{margin-top:24px}footer{font-size:9pt}@page{margin:16mm}
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">AIOPS / OLAY DOSYASI</div>
    <span class="badge">KAYITLI VAKA · CANLI İZLEME DEĞİL</span>
    <h1>${outcome.hasVerifiedRecovery ? "Bir arıza. Kanıttan doğrulanan sonuca." : "Bir arıza. Bilinenler ve eksik doğrulamalar."}</h1>
    <p class="intro">AIOps, uygulama kontrollerini bir arıza kaydında toplar. AI agent kanıtları yorumlar ve sonraki kontrolü önerir. Uygulamayı değiştiren işlem, yetkili onaydan sonra ayrı yürütücü tarafından yapılır; sonuç yeniden kontrol edilir.</p>
    <div class="meta"><span>Vaka: <code>${escapeHtml(caseIncident.id)}</code></span><span>${escapeHtml(view.caseDate)} · Türkiye saati</span><span>${escapeHtml(sourceKind)}</span></div>
    <p class="muted">Servis: ${escapeHtml(caseIncident.service_id)} · Kayıt durumu: ${escapeHtml(status)} · Kontrol: ${escapeHtml(caseIncident.check)}</p>
  </header>

  <div class="facts" aria-label="Doğrulanan sonuçlar">
    <article class="fact"><small>BAŞLANGIÇTA</small><strong class="${outcome.beforeStatus === 500 ? "bad" : "unknown"}">${outcome.beforeStatus === 500 ? "HTTP 500 doğrulandı" : "HTTP sonucu bilinmiyor"}</strong><p>${escapeHtml(casePhases[1].impact)}</p></article>
    <article class="fact"><small>AI KATKISI</small><strong>${modelTools.length} model araç çağrısı</strong><p>${caseReport ? "Tamamlanmış rapor ve ilişkili araç kayıtları aşağıda." : "Tamamlanmış AI raporu yok."}</p></article>
    <article class="fact"><small>MÜDAHALE</small><strong class="${outcome.hasSuccessfulApproval ? "good" : "unknown"}">${outcome.hasSuccessfulApproval ? "Doğrulanmış müdahale" : "Müdahale doğrulanamadı"}</strong><p>${outcome.hasSuccessfulApproval ? "Bu olaya bağlı sabit test hatası temizleme işlemi ve HTTP 200 kontrolü kayıtlı." : "Başarılı işlem ve HTTP kontrolü birlikte doğrulanamadı."}</p></article>
    <article class="fact"><small>SONUÇ</small><strong class="${outcome.hasVerifiedRecovery ? "good" : "unknown"}">${outcome.hasVerifiedRecovery ? "Toparlanma doğrulandı" : "Toparlanma doğrulanamadı"}</strong><p>${outcome.hasVerifiedRecovery ? "HTTP 200 ve ayrı sağlıklı izleme gözlemi birlikte mevcut." : outcome.afterStatus === 200 ? "İşlem sonrası HTTP 200 var; ilgili sağlıklı toparlanma gözlemi eksik." : "Başarılı HTTP yanıtı ve ilgili toparlanma kaydı gerekir."}</p></article>
  </div>

  <section aria-labelledby="roles-title"><div class="eyebrow">PROJENİN AMACI</div><h2 id="roles-title">Sorunu fark et, açıklamasını gör, sonucu kanıtla.</h2>
    <p>Çalışan bir uygulamaya erişemediğinde, ekip tek ekranda hangi kontrolün başarısız olduğunu, agent'ın hangi veriyi kullandığını ve müdahale sonrasında neyin doğrulandığını takip edebilir.</p>
    <div class="roles"><article><div class="eyebrow">01 / İZLEME</div><h3>Hatayı fark eder.</h3><p>Yanıtı kontrol eder, başarısız gözlemi kaydeder ve arıza kaydını oluşturur.</p></article><article><div class="eyebrow">02 / AI AGENT</div><h3>Kanıtı yorumlar.</h3><p>Kaydı ve rehberleri okur. Bulgusunu kaynak kimlikleriyle verir. Model önerisi tek başına bir müdahale değildir.</p></article><article><div class="eyebrow">03 / ONAY VE YÜRÜTME</div><h3>İşlemi uygular, yeniden kontrol eder.</h3><p>Yetkilendirilmiş yürütücü kapsamı belli işlemi uygular; izleme yeni gözlemle sonucu doğrular.</p></article></div>
  </section>

  <section aria-labelledby="story-title"><div class="eyebrow">OLAYIN AKIŞI</div><h2 id="story-title">Ne oldu, kim ne yaptı?</h2><ol class="timeline">${casePhases.map((item) => `<li><div class="eyebrow">${escapeHtml(item.actor)}</div><h3>${escapeHtml(item.heading)}</h3><p>${escapeHtml(item.description)}</p><p class="impact"><strong>Çalışan için anlamı:</strong> ${escapeHtml(item.impact)}</p><p class="muted">${escapeHtml(item.response)} · ${escapeHtml(formatRecordTime(item.at))}</p>${item.evidenceIds.length ? references(item.evidenceIds) : ""}</li>`).join("")}</ol></section>

  <section aria-labelledby="ai-title"><div class="eyebrow">ORİJİNAL MODEL ÇIKTISI</div><h2 id="ai-title">AI agent ne buldu?</h2><div class="panel"><p class="muted">Kayıttaki model: ${escapeHtml(view.caseModel)}. Aşağıdaki rapor kaydedilmiş model çıktısıdır; yeni bir model çağrısı yapılmaz.</p>${report}</div><div class="panel"><h3>Agent'ın çalışma izi</h3>${tools}<p class="muted">Yalnızca seçili model çalışmasına ve bu arızaya bağlı araç çağrıları sayıldı. Aynı zaman damgalı kayıtların kendi iç sırası kesin değildir.</p></div></section>

  <section aria-labelledby="proof-title"><div class="eyebrow">KANIT DEFTERİ</div><h2 id="proof-title">Sonucu hangi kayıtlar destekliyor?</h2>${evidenceCards}
    <div class="panel"><h3>Başlangıç, onay ve toparlanma</h3>${rawRecord("Arıza öncesi gözlem", caseIncident.story?.previous)}${rawRecord("Onay ve işlem kayıtları", caseIncident.story?.approvals?.length ? caseIncident.story.approvals : null)}${rawRecord("Toparlanma gözlemi", caseIncident.story?.recovery)}<h3>Kaydedilmiş kontrol ifadeleri</h3>${checked}<p class="muted">Bu kontrol ifadeleri kaynağın bir parçasıdır. Özetin başarı etiketleri, ilgili gözlem ve işlem kayıtlarının da bulunmasına bağlıdır.</p></div>
    <div class="panel"><h3>İşlem geçmişi</h3>${actions}<p class="muted">Saatler Türkiye saatidir. İşlem zamanı ile gözlem zamanı farklı olabilir. Aynı zaman damgalı kayıtların kesin iç sırası çıkarılamaz.</p></div>
  </section>

  <section class="panel" aria-labelledby="scope-title"><div class="eyebrow">KAPSAM VE SINIRLAR</div><h2 id="scope-title">Bu belge neyi gösteriyor?</h2><p>${escapeHtml(scope)}</p>${typeof metadata.approval_actor === "string" ? `<p class="muted">Kaynakta onay aktörünün tanımı: ${escapeHtml(metadata.approval_actor)}</p>` : '<p class="muted">Onay aktörünün ek açıklaması kayıtta yok.</p>'}<p>Bu dosya tek bir kaydın okunabilir özetidir. Genel AI doğruluğu, üretim hizmet seviyesi veya kazanılan çalışma süresi ölçümü değildir. Kaydedilmiş model önerileri, kesin kök neden kanıtı sayılmaz.</p>${outcome.durationSeconds !== null ? `<p class="muted">İlk hata gözleminden sağlıklı toparlanma gözlemine kadar kaydedilen aralık: ${escapeHtml(new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(outcome.durationSeconds))} saniye. Bu aralık AI yanıt süresi veya kazanılan zaman değildir.</p>` : '<p class="muted">Doğrulanmış gözlemlerden olay süresi hesaplanamadı.</p>'}</section>
  <footer><strong>AIOps Agent · taşınabilir olay özeti</strong><p>Bu belge kendi içeriğiyle açılır; JavaScript, dış ağ kaynağı, yeni AI çağrısı veya sisteme komut içermez. Tarayıcının Yazdır / PDF olarak kaydet seçeneğiyle paylaşabilirsin. Özgün JSON vaka kaydı teknik incelemenin kaynağı olarak korunmalıdır.</p></footer>
</main>
</body>
</html>`;
}

export function downloadRecordedSummary(record: RecordedCase): void {
  const url = URL.createObjectURL(
    new Blob([buildIncidentSummaryHtml(record)], {
      type: "text/html;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "aiops-olay-ozeti.html";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
