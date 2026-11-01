import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  AudioLines,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSearch,
  FileText,
  LockKeyhole,
  Monitor,
  Pause,
  Play,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { introProof, introSlides } from "./intro-slides";
import type { IntroSlide } from "./intro-slides";
import {
  caseIncident,
  caseReport,
  modelTools,
  outcome,
} from "./observatory-data";
import { useVisualMotion } from "./visual-experience";
import "./intro-presentation.css";

export const introSeenKey = "aiops-intro-seen-v1";
const chapterLabels = [
  "Amaç",
  "Teknoloji",
  "Hata",
  "Tespit",
  "AI incelemesi",
  "Müdahale",
  "Doğrulama",
];
export function shouldShowIntro() {
  try {
    return sessionStorage.getItem(introSeenKey) !== "1";
  } catch {
    return true;
  }
}
export function rememberIntro() {
  try {
    sessionStorage.setItem(introSeenKey, "1");
  } catch {
    // The presentation also works without browser storage.
  }
}

function SceneNode({
  icon: Icon,
  title,
  detail,
  tone = "cyan",
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className={`intro-node intro-tone-${tone}`}>
      <span className="intro-node-icon">
        <Icon size={27} strokeWidth={1.6} />
      </span>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Connector() {
  return (
    <span className="intro-connector">
      <ArrowRight size={19} />
    </span>
  );
}

/** A visual retelling of stored records. No action or model request is bound here. */
function IntroScene({ id }: { id: IntroSlide["id"] }) {
  if (id === "purpose")
    return (
      <div className="intro-purpose">
        <div className="intro-radar">
          <span />
          <span />
          <span />
          <Activity size={48} strokeWidth={1.3} />
        </div>
        <div className="intro-purpose-line">
          <SceneNode icon={Activity} title="Fark et" detail="İzleme sistemi" />
          <Connector />
          <SceneNode
            icon={Bot}
            title="Anla"
            detail="AI incelemesi"
            tone="blue"
          />
          <Connector />
          <SceneNode
            icon={ShieldCheck}
            title="Doğrula"
            detail="Onay + kontrol"
            tone="amber"
          />
        </div>
        <p className="intro-scene-caption">
          Bir alarmdan, izlenebilir bir sonuca.
        </p>
      </div>
    );
  if (id === "stack")
    return (
      <div className="intro-stack">
        <SceneNode
          icon={Monitor}
          title="Gördüğün arayüz"
          detail="React + TypeScript"
        />
        <span className="intro-stack-link" />
        <SceneNode
          icon={Server}
          title="Kontrol ve kayıt"
          detail="Python + FastAPI"
          tone="blue"
        />
        <span className="intro-stack-link" />
        <div className="intro-stack-branches">
          <SceneNode
            icon={Database}
            title="Vaka verisi"
            detail={introProof.environment}
          />
          <SceneNode
            icon={Bot}
            title="AI incelemesi"
            detail={
              introProof.hasReport
                ? "OpenAI raporu kayıtlı"
                : "Rapor bulunamadı"
            }
            tone="blue"
          />
        </div>
      </div>
    );
  if (id === "failure")
    return (
      <div className="intro-browser-window">
        <div className="intro-browser-bar">
          <span />
          <span />
          <span />
          <code>sample-api</code>
        </div>
        <div className="intro-request">
          <Monitor size={23} />
          <span>Uygulamaya bir istek</span>
          <ArrowRight size={21} />
        </div>
        <div className="intro-http intro-tone-coral">
          <span>UYGULAMANIN YANITI</span>
          <strong>{outcome.beforeStatus ?? "?"}</strong>
          <span>
            {outcome.beforeStatus === 500
              ? "İstek başarısız"
              : "Sonuç bilinmiyor"}
          </span>
        </div>
        <p className="intro-scene-caption">
          <LockKeyhole size={16} />{" "}
          {outcome.beforeStatus === 500
            ? "Kontrollü laboratuvar hatası"
            : "Hata sonucu bilinmiyor"}
        </p>
      </div>
    );
  if (id === "detection")
    return (
      <div className="intro-detection">
        <div className="intro-signal">
          <Activity size={40} />
          <span className="intro-signal-line" />
        </div>
        <div className="intro-record">
          <span className="intro-record-label">
            <FileText size={19} />{" "}
            {introProof.detectionRecorded
              ? "ARIZA KAYDI OLUŞTU"
              : "AÇILIŞ KANITI EKSİK"}
          </span>
          <strong>
            {introProof.detectionRecorded
              ? "Uygulama yanıt vermiyor"
              : "Gözlem doğrulanamadı"}
          </strong>
          <code>#{caseIncident.id.slice(0, 8).toUpperCase()}</code>
          <div>
            {introProof.detectionRecorded ? (
              <Check size={18} />
            ) : (
              <CircleHelp size={18} />
            )}{" "}
            {introProof.detectionRecorded
              ? "Hata gözlemi kaydedildi"
              : "Hata gözlemi doğrulanamadı"}
          </div>
          <div>
            {introProof.detectionRecorded ? (
              <Check size={18} />
            ) : (
              <CircleHelp size={18} />
            )}{" "}
            {introProof.detectionRecorded
              ? "İlk kanıt saklandı"
              : "İlk kanıt doğrulanamadı"}
          </div>
          <div>
            <ArrowRight size={18} /> Sonraki aşama: inceleme
          </div>
        </div>
      </div>
    );
  if (id === "agent")
    return (
      <div className="intro-agent-scene">
        <div className="intro-agent-inputs">
          <SceneNode
            icon={FileSearch}
            title="Hata kanıtları"
            detail={
              introProof.hasEvidenceTool
                ? "Kanıt okuma aracı kayıtlı"
                : "Araç kaydı yok"
            }
          />
          <SceneNode
            icon={BookOpen}
            title="Çözüm rehberi"
            detail={
              introProof.hasGuideTool &&
              caseReport?.source_ids.includes("runbook:http500")
                ? "HTTP 500 rehberi"
                : "Kaynak bilinmiyor"
            }
            tone="amber"
          />
        </div>
        <div className="intro-agent-channel">
          <span />
          <span />
        </div>
        <div className="intro-agent-core">
          <Bot size={48} strokeWidth={1.3} />
          <strong>AI agent</strong>
          <span>{modelTools.length} kayıtlı araç çağrısı</span>
        </div>
        <div className="intro-agent-output">
          <FileText size={22} />
          <div>
            <strong>
              {caseReport ? "Kaynaklı inceleme raporu" : "Rapor bulunamadı"}
            </strong>
            <span>Bulgu + önerilen kontrol</span>
          </div>
        </div>
        <p className="intro-scene-caption">Bu aşama sistemi değiştirmedi.</p>
      </div>
    );
  if (id === "action")
    return (
      <div className="intro-action-scene">
        <div className="intro-approval-seal">
          {outcome.hasSuccessfulApproval ? (
            <ShieldCheck size={47} strokeWidth={1.4} />
          ) : (
            <CircleHelp size={47} strokeWidth={1.4} />
          )}
          <strong>
            {outcome.hasSuccessfulApproval
              ? "Yetkili onayı kayıtlı"
              : "Başarı doğrulanamadı"}
          </strong>
          <span>AI kendi kendine izin vermedi.</span>
        </div>
        <span className="intro-stack-link" />
        <div className="intro-fixed-action">
          <LockKeyhole size={24} />
          <div>
            <span>TEK HEDEF · SINIRLI İŞLEM</span>
            <strong>Test hatasını temizle</strong>
            <code>sample-api · clear-http-fault:v1</code>
          </div>
        </div>
        <div className="intro-action-result">
          {outcome.hasSuccessfulApproval ? (
            <CheckCircle2 size={20} />
          ) : (
            <CircleHelp size={20} />
          )}
          {outcome.hasSuccessfulApproval
            ? "Onaylı yürütücü işlemi tamamladı"
            : "İşlem sonucu bilinmiyor"}
        </div>
      </div>
    );
  return (
    <div className="intro-recovery-scene">
      <div
        className={`intro-response-change ${outcome.hasSuccessfulApproval ? "is-verified" : ""}`}
      >
        <span className="intro-old-response">
          {outcome.beforeStatus ?? "?"}
        </span>
        <ArrowRight size={32} />
        <strong>{outcome.afterStatus ?? "?"}</strong>
      </div>
      <div
        className={`intro-recovery-badge ${outcome.hasVerifiedRecovery ? "is-verified" : ""}`}
      >
        {outcome.hasVerifiedRecovery ? (
          <CheckCircle2 size={32} />
        ) : (
          <CircleHelp size={32} />
        )}
        <strong>
          {outcome.hasVerifiedRecovery
            ? "Düzelme doğrulandı"
            : "Sonuç doğrulanamadı"}
        </strong>
      </div>
      <div className="intro-verifications">
        <span>
          {outcome.hasSuccessfulApproval ? (
            <Check size={20} />
          ) : (
            <CircleHelp size={20} />
          )}
          {outcome.hasSuccessfulApproval
            ? "İşlem sonrası HTTP 200"
            : "HTTP kontrolü eksik"}
        </span>
        <span>
          {outcome.hasVerifiedRecovery ? (
            <Check size={20} />
          ) : (
            <CircleHelp size={20} />
          )}
          {outcome.hasVerifiedRecovery
            ? "Ayrı izleme gözlemi: sağlıklı"
            : "Toparlanma kaydı eksik"}
        </span>
      </div>
      <p className="intro-scene-caption">
        {outcome.hasVerifiedRecovery
          ? "“Düzeldi” demek için sonucu yeniden ölçtük."
          : "Sonucu doğrulayan ölçüm eksik."}
      </p>
    </div>
  );
}

export function IntroPresentation({
  open,
  onClose,
  onExplore,
}: {
  open: boolean;
  onClose: () => void;
  onExplore: (phaseId?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusSlide = useRef(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { motion, setMotion } = useVisualMotion();
  const slide = introSlides[index];
  const last = index === introSlides.length - 1;

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open) {
      setIndex(0);
      setPlaying(false);
      return;
    }
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!element.open) element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!motion) setPlaying(false);
  }, [motion]);

  useLayoutEffect(() => {
    if (!open) return;
    dialog.current?.scrollTo({ top: 0, behavior: "instant" });
    if (focusSlide.current) {
      heading.current?.focus({ preventScroll: true });
      focusSlide.current = false;
    }
  }, [open, index]);

  useEffect(() => {
    if (!open || !playing || !motion) return;
    const timer = window.setTimeout(() => {
      if (last) setPlaying(false);
      else setIndex((value) => value + 1);
    }, 11000);
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [open, playing, motion, index, last]);

  const select = (next: number) => {
    setPlaying(false);
    const bounded = Math.max(0, Math.min(next, introSlides.length - 1));
    focusSlide.current = bounded !== index;
    if (bounded === index) heading.current?.focus({ preventScroll: true });
    setIndex(bounded);
  };

  return createPortal(
    <dialog
      ref={dialog}
      className="intro-dialog"
      aria-labelledby="intro-title"
      data-motion={motion ? "on" : "off"}
      data-slide={slide.id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons = Array.from(
            dialog.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? [],
          );
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === heading.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          select(index + 1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          select(index - 1);
        }
        if (event.key === "Home") {
          event.preventDefault();
          select(0);
        }
        if (event.key === "End") {
          event.preventDefault();
          select(introSlides.length - 1);
        }
        event.stopPropagation();
      }}
    >
      {open && (
        <div className="intro-deck">
          <div className="intro-header">
            <span className="intro-brand">
              <AudioLines size={25} />
              <strong>AIOPS</strong>
              <span>PROJE SUNUMU</span>
            </span>
            <button className="intro-skip" onClick={onClose}>
              Sunumu geç <X size={19} />
            </button>
          </div>
          <nav className="intro-chapters" aria-label="Sunum bölümleri">
            {introSlides.map((item, position) => (
              <button
                key={item.id}
                aria-label={`${position + 1}. ${chapterLabels[position]}`}
                aria-current={position === index ? "step" : undefined}
                onClick={() => select(position)}
              >
                <span>{String(position + 1).padStart(2, "0")}</span>
                <span>{chapterLabels[position]}</span>
                <i />
              </button>
            ))}
          </nav>
          <div className="intro-stage" key={slide.id}>
            <div className="intro-copy">
              <p className="intro-eyebrow">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(introSlides.length).padStart(2, "0")} <span />{" "}
                {slide.actor}
              </p>
              <h1 id="intro-title" ref={heading} tabIndex={-1}>
                {slide.title}
              </h1>
              <p className="intro-description">{slide.description}</p>
              <dl className="intro-facts">
                {slide.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div
              className={`intro-visual intro-visual-${slide.id}`}
              aria-hidden="true"
            >
              <span className="intro-visual-grid" />
              <IntroScene id={slide.id} />
            </div>
          </div>
          <div className="intro-takeaway" role="note">
            <span>AKLINDA KALSIN</span>
            <p>{slide.takeaway}</p>
          </div>
          <div className="intro-footer">
            <div className="intro-playback">
              <button
                className="intro-icon-button"
                aria-label={`Hareket ${motion ? "açık" : "kapalı"}`}
                title={`Hareket ${motion ? "açık" : "kapalı"}`}
                aria-pressed={motion}
                onClick={() => setMotion(!motion)}
              >
                <Activity size={19} />
              </button>
              <button
                className="intro-autoplay"
                disabled={!motion}
                aria-pressed={playing}
                onClick={() => {
                  if (last) setIndex(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
                <span>{playing ? "Duraklat" : "Otomatik oynat"}</span>
              </button>
              <span className="intro-reading-note">
                {playing ? "11 saniyede bir slayt" : "Kendi hızında oku"}
              </span>
            </div>
            <div className="intro-paging">
              <button
                className="intro-icon-button"
                aria-label="Önceki slayt"
                disabled={index === 0}
                onClick={() => select(index - 1)}
              >
                <ChevronLeft size={21} />
              </button>
              {last ? (
                <button className="intro-next" onClick={() => onExplore()}>
                  Kanıtları sitede incele <ArrowRight size={19} />
                </button>
              ) : (
                <button
                  className="intro-next"
                  onClick={() => select(index + 1)}
                >
                  {index === 0 ? "Nasıl çalıştığını gör" : "Sonraki adım"}
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="intro-provenance">
            <span>
              Kayıtlı laboratuvar vakasının anlatımı · Canlı işlem başlatmaz.
            </span>
            {slide.phaseId && (
              <button onClick={() => onExplore(slide.phaseId)}>
                Sitede bu adımı incele <ArrowRight size={14} />
              </button>
            )}
            <span
              className="intro-announcement"
              role="status"
              aria-live={playing ? "off" : "polite"}
            >
              Slayt {index + 1} / {introSlides.length}: {slide.title}
            </span>
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
