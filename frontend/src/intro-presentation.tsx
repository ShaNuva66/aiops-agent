import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  MousePointer2,
  Sparkles,
  X,
} from "lucide-react";
import { introSlides } from "./intro-slides";
import { filmChapters, filmDuration, locateFilmTime } from "./intro-film";
import { IntroFilmScene } from "./intro-film-scene";
import { useVisualMotion } from "./visual-experience";
import "./intro-presentation.css";

const chapterLabels = [
  "Amaç",
  "Sistemin parçaları",
  "Hata",
  "Tespit",
  "AI incelemesi",
  "Onaylı işlem",
  "Sonuç",
];

/** Full-viewport introduction: the site opens into a read-only animated explanation. */
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
  const position = useRef(0);
  const animationFrame = useRef(0);
  const focusScene = useRef(false);
  const generation = useRef(0);
  const targetPosition = useRef(0);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    at: number;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gestureCount, setGestureCount] = useState(0);
  const { motion, setMotion } = useVisualMotion();
  const frame = locateFilmTime(filmChapters, elapsed);
  const chapter = filmChapters[frame.chapterIndex];
  const cue = chapter.cues[frame.cueIndex];
  const slide = introSlides[frame.chapterIndex];
  const first = frame.chapterIndex === 0 && frame.cueIndex === 0;
  const stepNumber =
    filmChapters
      .slice(0, frame.chapterIndex)
      .reduce((count, item) => count + item.cues.length, 0) +
    frame.cueIndex +
    1;
  const stepCount = filmChapters.reduce(
    (count, item) => count + item.cues.length,
    0,
  );
  const last =
    frame.chapterIndex === filmChapters.length - 1 &&
    frame.cueIndex === chapter.cues.length - 1;

  const stopAnimation = () => {
    generation.current++;
    cancelAnimationFrame(animationFrame.current);
    setPlaying(false);
  };
  const chooseCue = (chapterIndex: number, cueIndex: number, focus = false) => {
    const target = filmChapters[chapterIndex];
    const from = target.start + target.cues[cueIndex].at;
    const to = Math.min(
      filmDuration,
      from + (target.duration / target.cues.length) * 0.96,
    );
    stopAnimation();
    targetPosition.current = to;
    focusScene.current =
      focus &&
      chapterIndex !==
        locateFilmTime(filmChapters, position.current).chapterIndex;
    position.current = motion && !document.hidden ? from : to;
    setElapsed(position.current);
    if (focus && !focusScene.current)
      heading.current?.focus({ preventScroll: true });
    if (!motion || document.hidden) return;
    const revision = generation.current;
    const startedAt = performance.now();
    setPlaying(true);
    const paint = (now: number) => {
      if (revision !== generation.current) return;
      const progress = Math.min(1, Math.max(0, (now - startedAt) / 1400));
      position.current = from + (to - from) * progress;
      setElapsed(position.current);
      if (progress < 1) animationFrame.current = requestAnimationFrame(paint);
      else {
        animationFrame.current = 0;
        setPlaying(false);
      }
    };
    animationFrame.current = requestAnimationFrame(paint);
  };
  const nextCue = () => {
    const current = locateFilmTime(filmChapters, position.current);
    if (current.cueIndex < filmChapters[current.chapterIndex].cues.length - 1)
      chooseCue(current.chapterIndex, current.cueIndex + 1);
    else if (current.chapterIndex < filmChapters.length - 1)
      chooseCue(current.chapterIndex + 1, 0, true);
  };
  const previousCue = () => {
    if (frame.cueIndex > 0) chooseCue(frame.chapterIndex, frame.cueIndex - 1);
    else if (frame.chapterIndex > 0)
      chooseCue(
        frame.chapterIndex - 1,
        filmChapters[frame.chapterIndex - 1].cues.length - 1,
        true,
      );
  };
  const isControl = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "button,a,input,select,textarea,summary,[role='button'],[contenteditable='true'],[data-no-advance]",
      ),
    );
  const selectedText = () => window.getSelection()?.isCollapsed === false;
  const beginGesture = (event: PointerEvent<HTMLDialogElement>) => {
    gesture.current = null;
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      isControl(event.target) ||
      selectedText()
    )
      return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
    };
  };
  const finishGesture = (event: PointerEvent<HTMLDialogElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (
      !start ||
      start.id !== event.pointerId ||
      event.button !== 0 ||
      isControl(event.target) ||
      selectedText()
    )
      return;
    if (
      performance.now() - start.at > 700 ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
    )
      return;
    if (!last) {
      dialog.current?.style.setProperty("--tap-x", `${event.clientX}px`);
      dialog.current?.style.setProperty("--tap-y", `${event.clientY}px`);
      setGestureCount((count) => count + 1);
      nextCue();
    }
  };

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open) {
      gesture.current = null;
      setGestureCount(0);
      position.current = 0;
      targetPosition.current = 0;
      setElapsed(0);
      setPlaying(false);
      return;
    }
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!element.open) element.showModal();
    heading.current?.focus({ preventScroll: true });
    chooseCue(0, 0);
    return () => {
      generation.current++;
      cancelAnimationFrame(animationFrame.current);
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!motion) {
      stopAnimation();
      position.current = targetPosition.current;
      setElapsed(position.current);
    }
  }, [motion]);

  useLayoutEffect(() => {
    if (!open) return;
    dialog.current?.scrollTo({ top: 0, behavior: "instant" });
    if (focusScene.current) {
      heading.current?.focus({ preventScroll: true });
      focusScene.current = false;
    }
  }, [open, frame.chapterIndex]);

  useEffect(() => {
    if (!open) return;
    const pauseWhenHidden = () => {
      if (document.hidden) {
        gesture.current = null;
        stopAnimation();
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [open]);

  return createPortal(
    <dialog
      ref={dialog}
      className="intro-dialog"
      aria-labelledby="intro-title"
      aria-describedby="intro-click-hint"
      data-motion={motion ? "on" : "off"}
      data-playing={playing && motion ? "true" : "false"}
      data-slide={chapter.id}
      data-cue={frame.cueIndex}
      data-final={last ? "true" : "false"}
      onPointerDown={beginGesture}
      onPointerUp={finishGesture}
      onPointerCancel={() => {
        gesture.current = null;
      }}
      onPointerLeave={() => {
        gesture.current = null;
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const controls = Array.from(
            dialog.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? [],
          );
          const firstControl = controls[0],
            lastControl = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === firstControl ||
              document.activeElement === heading.current)
          ) {
            event.preventDefault();
            lastControl?.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement === lastControl
          ) {
            event.preventDefault();
            firstControl?.focus();
          }
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          nextCue();
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          previousCue();
        }
        if (
          (event.code === "Space" || event.key === "Enter") &&
          !(event.target as HTMLElement).closest(
            "button,a,input,select,textarea,summary",
          )
        ) {
          event.preventDefault();
          nextCue();
        }
        event.stopPropagation();
      }}
    >
      {open && (
        <div className="intro-experience">
          <div className="intro-ambient" aria-hidden="true">
            <span />
            <span />
            <i />
          </div>
          <div className="intro-header">
            <span className="intro-brand">
              <AudioLines size={29} />
              <strong>AIOPS</strong>
              <span>BİR ARIZANIN HİKÂYESİ</span>
            </span>
            <div className="intro-header-actions">
              <button
                className="intro-motion"
                aria-label={`Hareket ${motion ? "açık" : "kapalı"}`}
                aria-pressed={motion}
                onClick={() => setMotion(!motion)}
              >
                <Activity size={17} />
                <span>Hareket {motion ? "açık" : "kapalı"}</span>
              </button>
              <button className="intro-skip" onClick={onClose}>
                Siteye geç <X size={18} />
              </button>
            </div>
          </div>
          <div className="intro-stage">
            <div className="intro-copy">
              <span className="intro-eyebrow">
                <i /> {slide.eyebrow}
              </span>
              <h1 id="intro-title" ref={heading} tabIndex={-1}>
                {chapter.title}
              </h1>
              <div className="intro-explanation">
                <div className="intro-explanation-heading">
                  <span>{cue.label}</span>
                  <small>
                    {frame.cueIndex + 1} / {chapter.cues.length}
                  </small>
                </div>
                <p key={`${chapter.id}-${frame.cueIndex}`}>{cue.text}</p>
                <div
                  className="intro-cue-steps"
                  aria-label="Bu bölümün açıklamaları"
                >
                  {chapter.cues.map((item, index) => (
                    <button
                      key={item.at}
                      aria-label={`${index + 1}. açıklama: ${item.label}`}
                      aria-current={
                        frame.cueIndex === index ? "step" : undefined
                      }
                      data-complete={index < frame.cueIndex}
                      title={item.label}
                      onClick={() => chooseCue(frame.chapterIndex, index)}
                    >
                      <span className="intro-cue-number" aria-hidden="true">
                        {index < frame.cueIndex ? (
                          <Check size={12} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="intro-cue-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <span className="intro-role">
                <Sparkles size={16} />
                <span>
                  <small>Bu bölümün sorumlusu</small>
                  {slide.actor}
                </span>
              </span>
              {slide.phaseId && (
                <button
                  className="intro-proof-link"
                  onClick={() => onExplore(slide.phaseId)}
                >
                  Bu adımın kaydını incele <ArrowRight size={15} />
                </button>
              )}
            </div>
            <div className="intro-scene">
              <div className="intro-scene-heading">
                <span>
                  <i /> Sürecin görseli
                </span>
                <span>
                  ADIM <b>{String(stepNumber).padStart(2, "0")}</b> /{" "}
                  {stepCount}
                </span>
              </div>
              <IntroFilmScene
                id={chapter.id}
                progress={frame.progress}
                playing={playing}
                motion={motion}
              />
              <dl
                className="intro-scene-facts"
                aria-label="Bu bölümün kayıt özeti"
              >
                {slide.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="intro-bottom">
            <nav className="intro-chapters" aria-label="Anlatım bölümleri">
              {filmChapters.map((item, index) => (
                <button
                  key={item.id}
                  aria-label={`${index + 1}. ${chapterLabels[index]}`}
                  aria-current={
                    index === frame.chapterIndex ? "step" : undefined
                  }
                  data-complete={index < frame.chapterIndex}
                  title={`${chapterLabels[index]}${index < frame.chapterIndex ? " · Önceki bölüm" : index === frame.chapterIndex ? " · Geçerli bölüm" : ""}`}
                  onClick={() => chooseCue(index, 0, true)}
                >
                  <span aria-hidden="true">
                    {index < frame.chapterIndex ? (
                      <Check size={14} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <strong>{chapterLabels[index]}</strong>
                  <i
                    style={
                      {
                        "--chapter-progress": `${index < frame.chapterIndex ? 100 : index === frame.chapterIndex ? frame.progress * 100 : 0}%`,
                      } as CSSProperties
                    }
                  />
                </button>
              ))}
            </nav>
            <div className="intro-bottom-row">
              <div className="intro-context">
                <span>
                  <i /> Kayıtlı laboratuvar vakası
                </span>
                <small>Hata → inceleme → onay → doğrulama</small>
              </div>
              <div className="intro-navigation">
                <span className="intro-click-hint" id="intro-click-hint">
                  <MousePointer2 size={18} />
                  <span>
                    <b className="intro-mouse-label">
                      {last
                        ? "Anlatım tamamlandı"
                        : "Sol tıkla, adımlar canlansın"}
                    </b>
                    <b className="intro-touch-label">
                      {last ? "Anlatım tamamlandı" : "Dokun, adımlar canlansın"}
                    </b>
                    {!last && (
                      <small>Boşluk / sağ ok ile de ilerleyebilirsin</small>
                    )}
                  </span>
                </span>
                <button
                  className="intro-back"
                  aria-label="Önceki açıklama"
                  disabled={first}
                  onClick={previousCue}
                >
                  <ArrowLeft size={19} />
                </button>
                {last && (
                  <button className="intro-next" onClick={onClose}>
                    Platformu keşfet
                    <ArrowRight size={19} />
                  </button>
                )}
              </div>
            </div>
          </div>
          {motion && gestureCount > 0 && (
            <span
              key={gestureCount}
              className="intro-click-feedback"
              aria-hidden="true"
            />
          )}
          <span className="intro-announcement" role="status" aria-live="polite">
            {chapter.title} {cue.text}
          </span>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
