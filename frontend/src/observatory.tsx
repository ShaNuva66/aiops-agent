import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cpu,
  Database,
  Fingerprint,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  X,
} from "lucide-react";
import caseData from "./live-case.json";
import {
  caseIncident,
  caseReport,
  caseModel,
  caseDate,
  casePhases,
  modelTools,
  caseAudit,
  formatRecordTime,
  outcome,
} from "./observatory-data";
import { auditLabel, explainEvidence } from "./learning";
import "./observatory.css";
import "./observatory-readability.css";
import "./observatory-scenes.css";
import { SceneDeck } from "./scene-deck";

const navigation = [
  { id: "overview", text: "Operasyon merkezi", icon: LayoutDashboard },
  { id: "story", text: "Olayın hikâyesi", icon: Workflow },
  { id: "agent", text: "Agent’ın katkısı", icon: Sparkles },
  { id: "evidence", text: "Kanıt defteri", icon: Fingerprint },
];
const roles = [
  {
    icon: ScanLine,
    name: "İzleme sistemi",
    number: "01",
    title: "Sorunu fark eder.",
    text: "Uygulamanın yanıtını kontrol eder. Başarısız sonuçları bir arıza kaydında toplar ve ilk kanıtı saklar.",
    tag: "Kontrol + kayıt",
    who: "Otomatik izleme",
  },
  {
    icon: Bot,
    name: "AI agent",
    number: "02",
    title: "Kanıtları yorumlar.",
    text: "Hata anındaki veriyi ve çözüm rehberini okur. Bulgusunu kaynaklarıyla açıklar, sıradaki kontrolü önerir.",
    tag: "İnceleme + öneri",
    who: "gpt-4o-mini",
  },
  {
    icon: ShieldCheck,
    name: "Yetkili operatör",
    number: "03",
    title: "Müdahaleye karar verir.",
    text: "Sınırları belli işlemi onaylar. Yürütücü test hatasını temizler; sistem ardından yeniden kontrol edilir.",
    tag: "Onay + doğrulama",
    who: "İnsan yetkisi",
  },
];

function OrbitalSystem({ motion }: { motion: boolean }) {
  return (
    <div
      className="obs-orbit"
      aria-label="Uygulama, veritabanı ve agent ilişkisini anlatan görsel"
    >
      <div className="obs-orbit-ring ring-one" />
      <div className="obs-orbit-ring ring-two" />
      <div className="obs-orbit-ring ring-three" />
      <svg
        className="obs-orbit-path"
        viewBox="0 0 440 340"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M90 100 Q220 0 340 110 Q420 240 230 285 Q65 265 90 100Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
        <path
          d="M90 100L220 170L340 110M220 170L230 285"
          stroke="currentColor"
          strokeWidth="1"
        />
        {motion && (
          <circle r="3" fill="#d2b073">
            <animateMotion
              dur="8s"
              repeatCount="indefinite"
              path="M90 100 Q220 0 340 110 Q420 240 230 285 Q65 265 90 100Z"
            />
          </circle>
        )}
      </svg>
      <div className="obs-orbit-core">
        <span className="obs-core-halo" />
        <Cpu size={35} />
        <span>AIOPS AGENT</span>
        <small>Kanıta dayalı inceleme</small>
      </div>
      <div className="obs-orbit-satellite satellite-one">
        <Server size={20} />
        <span>Uygulama</span>
        <i />
      </div>
      <div className="obs-orbit-satellite satellite-two">
        <Database size={20} />
        <span>Veritabanı</span>
        <i />
      </div>
      <div className="obs-orbit-satellite satellite-three">
        <ShieldCheck size={20} />
        <span>İnsan onayı</span>
        <i />
      </div>
      <div className="obs-orbit-caption">
        <span />
        <span>
          GÖZLEMLE <b>·</b> ANLA <b>·</b> DOĞRULA
        </span>
      </div>
    </div>
  );
}

export function Observatory() {
  const [active, setActive] = useState("overview");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [technical, setTechnical] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [motion, setMotion] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [focusEvidence, setFocusEvidence] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastStep = casePhases.length - 1;
  const navigate = (id: string) => {
    setActive(id);
    setMobileMenu(false);
    document.getElementById(`obs-${id}`)?.scrollIntoView({
      behavior: motion ? "smooth" : "instant",
      block: "start",
    });
  };
  useEffect(() => {
    if (!playing) return;
    timerRef.current = setTimeout(() => {
      if (step >= lastStep - 1) {
        setStep(lastStep);
        setPlaying(false);
      } else setStep((value) => value + 1);
    }, 8000);
    return () => clearTimeout(timerRef.current);
  }, [playing, step, lastStep]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (media.matches) {
        setMotion(false);
        setPlaying(false);
      }
    };
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id.replace("obs-", ""));
      },
      { rootMargin: "-15% 0px -45% 0px", threshold: [0, 0.15, 0.4] },
    );
    navigation.forEach(({ id }) => {
      const element = document.getElementById(`obs-${id}`);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  const selectStep = (index: number) => {
    setPlaying(false);
    setStep(index);
  };
  const startReplay = () => {
    setStep(0);
    setPlaying(true);
    navigate("story");
  };
  const showProof = (id?: string) => {
    setFocusEvidence(id || null);
    navigate("evidence");
    requestAnimationFrame(() =>
      document
        .getElementById(id ? `obs-evidence-${id}` : "obs-record-proof")
        ?.scrollIntoView({
          behavior: motion ? "smooth" : "instant",
          block: "center",
        }),
    );
  };
  const downloadCase = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(caseData, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aiops-gercek-vaka.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div
      className="observatory"
      data-motion={motion ? "on" : "off"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMobileMenu(false);
          document
            .querySelector<HTMLButtonElement>(".obs-mobile-menu")
            ?.focus();
        }
      }}
    >
      <a className="obs-skip-link" href="#obs-overview">
        İçeriğe geç
      </a>
      <aside className={`obs-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <a className="obs-brand" href="?case=1" aria-label="AIOps başlangıç">
          <span className="obs-logo-mark">
            <AudioLines size={25} />
          </span>
          <span>
            AIOPS<span className="obs-brand-sub">OBSERVATORY</span>
          </span>
        </a>
        <div className="obs-workspace">
          <span className="obs-workspace-icon">A</span>
          <div>
            <strong>Operasyon laboratuvarı</strong>
            <small>Kanıtlar üzerinden keşfet</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="obs-nav-label">ÇALIŞMA ALANI</span>
        <nav className="obs-nav" aria-label="Operasyon bölümleri">
          {navigation.map(({ id, text, icon: Icon }) => (
            <button
              key={id}
              data-active={active === id}
              aria-current={active === id ? "location" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{text}</span>
              {id === "story" && <small>01</small>}
            </button>
          ))}
        </nav>
        <div className="obs-sidebar-explainer">
          <span>
            <CircleHelp size={17} /> İlk kez mi bakıyorsun?
          </span>
          <p>
            Teknik bilgin olmasa da adımları izle. Her adımda ne olduğunu
            birlikte görelim.
          </p>
          <button onClick={startReplay}>
            Olayı birlikte incele <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="obs-sidebar-foot">
          <span className="obs-side-status">
            <i /> Kanıtlı vaka arşivi
          </span>
          <small>Yerel laboratuvar · v0.1</small>
          <a href="?dashboard=1">
            Operatör paneline geç <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="obs-shell">
        <header className="obs-topbar">
          <div className="obs-breadcrumb">
            <button
              className="obs-mobile-menu"
              aria-label={mobileMenu ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileMenu}
              onClick={() => {
                setMobileMenu(!mobileMenu);
                if (!mobileMenu)
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLButtonElement>(".obs-nav button")
                      ?.focus(),
                  );
              }}
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>Çalışma alanı</span>
            <ChevronRight size={13} />
            <strong>Operasyon merkezi</strong>
          </div>
          <div className="obs-topbar-right">
            <span className="obs-recorded-pill">
              <span /> KAYITLI GERÇEK VAKA
            </span>
            <button
              className="obs-motion-toggle"
              aria-label={`Hareket ${motion ? "açık" : "kapalı"}`}
              aria-pressed={motion}
              onClick={() => {
                setMotion(!motion);
                setPlaying(false);
              }}
            >
              <Activity size={15} />
              <span>Hareket {motion ? "açık" : "kapalı"}</span>
            </button>
            <span className="obs-avatar">AO</span>
          </div>
        </header>
        <main className="obs-content">
          <section
            id="obs-overview"
            className="obs-hero"
            aria-labelledby="obs-main-title"
          >
            <div className="obs-hero-copy">
              <span className="obs-eyebrow">
                <span /> TEKNOLOJİYİ ANLAŞILIR KIL
              </span>
              <h1 id="obs-main-title">
                Sorunu gör.
                <br />
                Nedenini anla.
                <br />
                <em>Kontrol sende.</em>
              </h1>
              <p className="obs-hero-description">
                Uygulama çalışmıyorsa nereden başlarsın? AIOps sorunu fark eder,
                AI kanıtları inceler, yetkili kişi müdahaleyi onaylar. Sonunda
                gerçekten düzeldi mi, birlikte görürüz.
              </p>
              <div className="obs-hero-actions">
                <button className="obs-button primary" onClick={startReplay}>
                  <Play size={16} fill="currentColor" /> Gerçek olayı izle{" "}
                  <ArrowRight size={17} />
                </button>
                <button
                  className="obs-button secondary"
                  onClick={() => navigate("agent")}
                >
                  AI ne yaptı? <ArrowUpRight size={17} />
                </button>
              </div>
              <p className="obs-hero-note">
                <LockKeyhole size={13} /> Bu sayfa kayıtlı olayı anlatır.
                Sisteme müdahale etmez.
              </p>
            </div>
            <div
              className="obs-hero-visual"
              onPointerMove={(event) => {
                if (!motion || event.pointerType !== "mouse") return;
                const box = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty(
                  "--orbit-tilt-x",
                  `${(0.5 - (event.clientY - box.top) / box.height) * 20}deg`,
                );
                event.currentTarget.style.setProperty(
                  "--orbit-tilt-y",
                  `${((event.clientX - box.left) / box.width - 0.5) * 28}deg`,
                );
              }}
              onPointerLeave={(event) => {
                event.currentTarget.style.removeProperty("--orbit-tilt-x");
                event.currentTarget.style.removeProperty("--orbit-tilt-y");
              }}
            >
              <div className="obs-visual-label">
                <span>OPERASYONUN GÖRÜNMEYEN TARAFI</span>
                <span>01 / 01</span>
              </div>
              <OrbitalSystem motion={motion} />
              <div className="obs-hero-outcome">
                <div>
                  <CheckCheck size={20} />
                  <span>
                    <strong>Toparlanma doğrulandı</strong>
                    <small>Gerçek HTTP 500 → HTTP 200</small>
                  </span>
                </div>
                <span className="obs-outcome-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </div>
          </section>

          <section
            className="obs-summary-strip"
            aria-label="Vakanın doğrulanan sonuçları"
          >
            <div className="obs-summary-item">
              <span className="obs-summary-icon fault">
                <Activity size={20} />
              </span>
              <div>
                <small>BAŞLANGIÇTA</small>
                <strong className="obs-summary-number">
                  HTTP {outcome.beforeStatus || "—"}
                  <span>Uygulama hata verdi</span>
                </strong>
              </div>
            </div>
            <div className="obs-summary-item">
              <span className="obs-summary-icon">
                <Bot size={20} />
              </span>
              <div>
                <small>AI KATKISI</small>
                <strong className="obs-summary-number">
                  {outcome.modelToolCount} araç
                  <span>Kanıt ve rehber incelemesi</span>
                </strong>
              </div>
            </div>
            <div className="obs-summary-item">
              <span className="obs-summary-icon">
                <ShieldCheck size={20} />
              </span>
              <div>
                <small>MÜDAHALE</small>
                <strong className="obs-summary-number">
                  Onaylı<span>Tek hedef, tek işlem</span>
                </strong>
              </div>
            </div>
            <div className="obs-summary-item">
              <span className="obs-summary-icon healthy">
                <CheckCheck size={20} />
              </span>
              <div>
                <small>İŞLEM SONRASI</small>
                <strong className="obs-summary-number">
                  HTTP {outcome.afterStatus || "—"}
                  <span>Başarılı yanıt doğrulandı</span>
                </strong>
              </div>
            </div>
          </section>

          <section
            id="obs-story"
            className="obs-story-section"
            aria-labelledby="obs-story-title"
          >
            <div className="obs-section-heading">
              <div>
                <span className="obs-section-kicker">01 / OLAYIN HİKÂYESİ</span>
                <h2 id="obs-story-title">Bir arıza. Baştan sona, açıkça.</h2>
                <p>
                  Bir uygulama hatasının nasıl fark edildiğini ve nasıl
                  çözüldüğünü izle.
                </p>
              </div>
              <div className="obs-view-toggle" aria-label="Anlatım düzeyi">
                <button
                  aria-pressed={!technical}
                  onClick={() => setTechnical(false)}
                >
                  Sade anlatım
                </button>
                <button
                  aria-pressed={technical}
                  onClick={() => setTechnical(true)}
                >
                  <Terminal size={14} /> Teknik görünüm
                </button>
              </div>
            </div>
            <div className="obs-case-panel">
              <div className="obs-playback-bar">
                <div>
                  <span className="obs-case-symbol">
                    <GitBranch size={18} />
                  </span>
                  <div>
                    <strong>İş uygulaması yanıt vermiyor</strong>
                    <small>
                      Vaka #{caseIncident.id.slice(0, 8).toUpperCase()}{" "}
                      <span>·</span> {caseDate}
                    </small>
                  </div>
                </div>
                <div className="obs-playback-controls">
                  <span>
                    ADIM {step + 1} / {casePhases.length}
                  </span>
                  <button
                    aria-label="Baştan başlat"
                    onClick={() => {
                      setStep(0);
                      setPlaying(false);
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    aria-label="Önceki adım"
                    disabled={step === 0}
                    onClick={() => selectStep(step - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="obs-play-button"
                    aria-label={
                      playing ? "Anlatımı duraklat" : "Anlatımı oynat"
                    }
                    onClick={() => {
                      if (step === lastStep) setStep(0);
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                  </button>
                  <button
                    aria-label="Sonraki adım"
                    disabled={step === lastStep}
                    onClick={() => selectStep(step + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <ol className="obs-stage-tabs" aria-label="Olay adımları">
                {casePhases.map((item, index) => (
                  <li key={item.id}>
                    <button
                      className={
                        step === index
                          ? "active"
                          : index < step
                            ? "complete"
                            : ""
                      }
                      aria-current={step === index ? "step" : undefined}
                      onClick={() => selectStep(index)}
                    >
                      <span>
                        {index < step ? (
                          <Check size={14} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <strong>{item.short}</strong>
                    </button>
                  </li>
                ))}
              </ol>
              <SceneDeck
                active={step}
                motion={motion}
                technical={technical}
                onSelect={selectStep}
                onPause={() => setPlaying(false)}
                onProof={showProof}
              />
              <div className="obs-case-footnote">
                <LockKeyhole size={13} />
                <span>
                  Geçmiş bir gerçek testin tekrarı. Oynatmak yeni arıza, AI
                  çağrısı veya müdahale başlatmaz.
                </span>
                <span>{casePhases.length} ADIM</span>
              </div>
            </div>
          </section>

          <section
            className="obs-responsibilities"
            aria-label="Sistemde kim ne yapıyor"
          >
            <div className="obs-section-heading">
              <div>
                <span className="obs-section-kicker">SORUMLULUKLAR NET</span>
                <h2>Akıllı sistem. Karar insanda.</h2>
              </div>
              <p>Her adımın bir sahibi, her bulgunun bir dayanağı var.</p>
            </div>
            <div className="obs-agency-grid">
              {roles.map(({ icon: Icon, ...role }) => (
                <article className="obs-role-card" key={role.name}>
                  <div className="obs-role-top">
                    <span className="obs-role-icon">
                      <Icon size={23} />
                    </span>
                    <span>{role.number}</span>
                  </div>
                  <small>{role.name}</small>
                  <h3>{role.title}</h3>
                  <p>{role.text}</p>
                  <div className="obs-role-tags">
                    <span>{role.tag}</span>
                    <small>{role.who}</small>
                  </div>
                </article>
              ))}
            </div>
            <p className="obs-caveat">
              <CircleHelp size={15} /> Bu kayıtta operatör adımlarını,
              kullanıcının yetkilendirdiği test yürütücüsü API üzerinden yaptı.
              Agent kendi kendine onay vermedi.
            </p>
          </section>

          <section
            id="obs-agent"
            className="obs-ai-section"
            aria-labelledby="obs-ai-title"
          >
            <div className="obs-section-heading">
              <div>
                <span className="obs-section-kicker">
                  02 / YAPAY ZEKÂNIN KATKISI
                </span>
                <h2 id="obs-ai-title">
                  Hatanın izini okudu.
                  <br />
                  Sonraki kontrolü önerdi.
                </h2>
              </div>
              <span className="obs-model-label">
                <Sparkles size={16} />
                {caseModel}
                <span>GERÇEK MODEL YANITI</span>
              </span>
            </div>
            <div className="obs-ai-layout">
              <div className="obs-ai-report">
                <div className="obs-report-title">
                  <span className="obs-role-icon">
                    <Bot size={22} />
                  </span>
                  <div>
                    <strong>Agent’ın inceleme raporu</strong>
                    <small>Kaydedilmiş özgün model çıktısı</small>
                  </div>
                  <span className="obs-report-check">
                    <Check size={14} /> Tamamlandı
                  </span>
                </div>
                <p className="obs-ai-summary">
                  {caseReport?.summary ||
                    "Bu vaka için tamamlanmış model raporu bulunamadı."}
                </p>
                <div className="obs-report-label">BULGU & DAYANAK</div>
                {caseReport?.findings.map((finding, index) => (
                  <article className="obs-finding" key={index}>
                    <span>
                      <CheckCheck size={17} />
                    </span>
                    <div>
                      <p>{finding.statement}</p>
                      <div>
                        {finding.evidence_ids.map((id, n) => (
                          <button key={id} onClick={() => showProof(id)}>
                            Kanıt {String(n + 1).padStart(2, "0")}{" "}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
                <div className="obs-ai-recommendations">
                  <h3>Bir sonraki adım için ne önerdi?</h3>
                  <ol>
                    {caseReport?.recommendations.map(
                      (recommendation, index) => (
                        <li key={index}>
                          <span>{index + 1}</span>
                          {recommendation}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
                <p className="obs-confidence-note">
                  <CircleHelp size={15} />
                  {caseReport?.unknowns.length
                    ? caseReport.unknowns.join(" ")
                    : "Model belirsizlik belirtmedi. Bu, nedenin kesin olarak kanıtlandığı anlamına gelmez; öneri insan değerlendirmesi gerektirir."}
                </p>
              </div>
              <aside className="obs-tool-list">
                <div className="obs-tool-list-heading">
                  <Terminal size={17} />
                  <h3>Agent’ın çalışma izi</h3>
                </div>
                <p>Raporu yazmadan önce hangi araçları kullandı?</p>
                {modelTools.map((tool, index) => (
                  <div className="obs-tool-row" key={tool.id}>
                    <span className="obs-tool-icon">{index + 1}</span>
                    <div>
                      <h4>{tool.title}</h4>
                      <p>{tool.description}</p>
                      {technical && (
                        <small>
                          {formatRecordTime(tool.at)} · {tool.id.slice(0, 8)}
                        </small>
                      )}
                      <span>
                        <Check size={12} /> Kayıt mevcut
                      </span>
                    </div>
                  </div>
                ))}
                <div className="obs-tool-boundary">
                  <ShieldCheck size={21} />
                  <h4>Öneri, müdahale değildir.</h4>
                  <p>
                    AI veriyi okudu. Test hatasını temizleme işlemini, onaydan
                    sonra ayrı yürütücü uyguladı.
                  </p>
                </div>
                <span className="obs-tool-footnote">
                  Aynı zaman damgasını taşıyan çağrıların kendi iç sırası kesin
                  değildir.
                </span>
              </aside>
            </div>
          </section>

          <section
            id="obs-evidence"
            className="obs-evidence-section"
            aria-labelledby="obs-evidence-title"
          >
            <div className="obs-section-heading">
              <div>
                <span className="obs-section-kicker">03 / ŞEFFAF KAYIT</span>
                <h2 id="obs-evidence-title">Sözümüzün arkasında veri var.</h2>
                <p>
                  Her iddiayı kaynağına kadar takip et. Teknik ayrıntılar,
                  ihtiyaç duyduğunda burada.
                </p>
              </div>
              <button className="obs-button outline" onClick={downloadCase}>
                <ArrowDownToLine size={16} /> Vaka kaydını indir
              </button>
            </div>
            <div className="obs-evidence-grid">
              {caseIncident.evidence?.map((evidence, index) => (
                <article
                  className={`obs-evidence-card ${focusEvidence === evidence.id ? "highlighted" : ""}`}
                  key={evidence.id}
                  id={`obs-evidence-${evidence.id}`}
                >
                  <div className="obs-evidence-top">
                    <span>
                      <Fingerprint size={18} /> KANIT{" "}
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <CheckCircle2 size={13} /> Kayıtlı
                    </span>
                  </div>
                  <h3>
                    {evidence.source === "collector"
                      ? "Hatanın ilk gözlemi"
                      : "İnceleme sırasında yeni kontrol"}
                  </h3>
                  <p>{explainEvidence(evidence, caseIncident)}</p>
                  <div className="obs-evidence-meta">
                    <span>{formatRecordTime(evidence.collected_at)}</span>
                    <code>{evidence.id.slice(0, 8)}</code>
                  </div>
                  <details className="obs-raw-data" open={technical}>
                    <summary>
                      Ham teknik veriyi göster <ChevronRight size={14} />
                    </summary>
                    <pre>{JSON.stringify(evidence.data, null, 2)}</pre>
                  </details>
                </article>
              ))}
            </div>
            <div className="obs-audit-panel" id="obs-record-proof">
              <div className="obs-audit-heading">
                <div>
                  <ShieldCheck size={19} />
                  <h3>Başlangıçtan sonuca, doğrulama kayıtları.</h3>
                </div>
                <span>{outcome.checkCount} kontrol geçti</span>
              </div>
              <div className="obs-verification-grid">
                <div>
                  <small>İLK KONTROL</small>
                  <strong>HTTP 200 → HTTP 500</strong>
                  <p>
                    Başarılı başlangıçtan sonra kontrollü test hatasının yanıtı
                    doğrulandı.
                  </p>
                </div>
                <div>
                  <small>UYGULANAN İŞLEM</small>
                  <strong>clear-http-fault:v1</strong>
                  <p>
                    İlgili arıza için onaylanan sabit işlem, test hatasını
                    temizledi.
                  </p>
                </div>
                <div>
                  <small>SON KONTROL</small>
                  <strong>HTTP 200 · Başarılı</strong>
                  <p>
                    İşlemden sonra yanıt alındı; ayrı izleme gözlemi arızayı
                    kapattı.
                  </p>
                </div>
              </div>
              <details className="obs-raw-data">
                <summary>
                  Başlangıç, onay ve toparlanmanın özgün kayıtları{" "}
                  <ChevronRight size={14} />
                </summary>
                <pre>
                  {JSON.stringify(
                    {
                      previous: caseIncident.story?.previous,
                      approvals: caseIncident.story?.approvals,
                      recovery: caseIncident.story?.recovery,
                      checks: caseData.checks,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
            <div className="obs-audit-panel" id="case-action-proof">
              <div className="obs-audit-heading">
                <div>
                  <GitBranch size={19} />
                  <h3>Ne yapıldığının izi burada.</h3>
                </div>
                <span>{caseAudit.length} işlem kaydı</span>
              </div>
              <details>
                <summary>
                  İşlem geçmişini aç <ChevronRight size={15} />
                </summary>
                <ol className="obs-audit-list">
                  {caseAudit.map((action) => (
                    <li className="obs-audit-row" key={action.id}>
                      <time className="obs-audit-time">
                        {formatRecordTime(action.created_at)}
                      </time>
                      <strong>{auditLabel(action.action)}</strong>
                      <span>
                        {action.actor === "operator"
                          ? "Yetkili test yürütücüsü"
                          : action.actor === "executor"
                            ? "İşlem yürütücüsü"
                            : action.actor === "monitoring"
                              ? "İzleme sistemi"
                              : "İnceleme sistemi"}
                      </span>
                      {technical && <code>{action.id.slice(0, 8)}</code>}
                    </li>
                  ))}
                </ol>
              </details>
              <p className="obs-caveat">
                İşlem zamanları kaydetme anını gösterir. Aynı zamanlı kayıtların
                iç sırası garanti edilmez.
              </p>
            </div>
          </section>
          <footer className="obs-footer">
            <div>
              <AudioLines size={20} />
              <strong>AIOPS</strong>
              <span>Karmaşık sistemler. Anlaşılır operasyonlar.</span>
            </div>
            <span>
              Kaynak: gerçek HTTP testi · Windows / SQLite · {caseDate}
            </span>
            <p>
              Bu sunum tek bir tamamlanmış vaka kaydıdır. Canlı izleme, kurumsal
              hizmet garantisi veya genel AI doğruluk ölçümü değildir.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
