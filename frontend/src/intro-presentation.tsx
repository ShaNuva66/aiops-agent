import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Pause,
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
  const wasOpen = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { motion, setMotion } = useVisualMotion();
  const frame = locateFilmTime(filmChapters, elapsed);
  const chapter = filmChapters[frame.chapterIndex];
  const cue = chapter.cues[frame.cueIndex];
  const slide = introSlides[frame.chapterIndex];
  const first = frame.chapterIndex === 0 && frame.cueIndex === 0;
  const last =
    frame.chapterIndex === filmChapters.length - 1 &&
    frame.cueIndex === chapter.cues.length - 1;

  const seek = (seconds: number, focus = false) => {
    const next = Math.max(0, Math.min(filmDuration, seconds));
    cancelAnimationFrame(animationFrame.current);
    setPlaying(false);
    position.current = next;
    focusScene.current =
      focus &&
      locateFilmTime(filmChapters, next).chapterIndex !== frame.chapterIndex;
    setElapsed(next);
    if (focus && !focusScene.current)
      heading.current?.focus({ preventScroll: true });
  };
  const chooseCue = (chapterIndex: number, cueIndex: number, focus = false) => {
    const target = filmChapters[chapterIndex];
    // A paused explanation shows the useful state within the selected step.
    seek(
      target.start +
        target.cues[cueIndex].at +
        (target.duration / target.cues.length) * 0.7,
      focus,
    );
  };
  const nextCue = () => {
    if (last) {
      onClose();
      return;
    }
    if (frame.cueIndex < chapter.cues.length - 1)
      chooseCue(frame.chapterIndex, frame.cueIndex + 1);
    else chooseCue(frame.chapterIndex + 1, 0, true);
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
  const toggleAnimation = () => {
    if (!motion || document.hidden) return;
    if (playing) cancelAnimationFrame(animationFrame.current);
    if (elapsed >= filmDuration) {
      position.current = 0;
      setElapsed(0);
    }
    setPlaying((value) => !value);
  };

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open) {
      position.current = 0;
      setElapsed(0);
      setPlaying(false);
      return;
    }
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!element.open) element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(animationFrame.current);
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open && !wasOpen.current) setPlaying(motion && !document.hidden);
    if (!open || !motion) setPlaying(false);
    wasOpen.current = open;
  }, [open, motion]);

  useLayoutEffect(() => {
    if (!open) return;
    dialog.current?.scrollTo({ top: 0, behavior: "instant" });
    if (focusScene.current) {
      heading.current?.focus({ preventScroll: true });
      focusScene.current = false;
    }
  }, [open, frame.chapterIndex]);

  useEffect(() => {
    if (!open || !playing || !motion || document.hidden) return;
    const startedAt = performance.now(),
      startedPosition = position.current;
    let lastPaint = 0;
    const paint = (now: number) => {
      if (now - lastPaint >= 32) {
        lastPaint = now;
        const next = Math.min(
          filmDuration,
          startedPosition + (now - startedAt) / 1000,
        );
        position.current = next;
        setElapsed(next);
        if (next >= filmDuration) {
          setPlaying(false);
          return;
        }
      }
      animationFrame.current = requestAnimationFrame(paint);
    };
    animationFrame.current = requestAnimationFrame(paint);
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      cancelAnimationFrame(animationFrame.current);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [open, playing, motion]);

  return createPortal(
    <dialog
      ref={dialog}
      className="intro-dialog"
      aria-labelledby="intro-title"
      data-motion={motion ? "on" : "off"}
      data-playing={playing && motion ? "true" : "false"}
      data-slide={chapter.id}
      data-cue={frame.cueIndex}
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
          if (!last) nextCue();
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          previousCue();
        }
        if (
          event.key.toLowerCase() === "k" ||
          (event.code === "Space" &&
            !(event.target as HTMLElement).closest("button"))
        ) {
          event.preventDefault();
          toggleAnimation();
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
              <span>OPERASYONU BİRLİKTE GÖRELİM</span>
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
                <i /> {String(frame.chapterIndex + 1).padStart(2, "0")} /{" "}
                {chapterLabels[frame.chapterIndex]}
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
                <p>{cue.text}</p>
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
                      onClick={() => chooseCue(frame.chapterIndex, index)}
                    >
                      <i />
                    </button>
                  ))}
                </div>
              </div>
              <span className="intro-role">
                <Sparkles size={16} /> {slide.actor}
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
              <IntroFilmScene
                id={chapter.id}
                progress={frame.progress}
                playing={playing}
                motion={motion}
              />
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
                  onClick={() => chooseCue(index, 0, true)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
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
                  <i /> Kayıtlı gerçek vaka
                </span>
                <small>Bu açılış, kaydedilmiş süreci anlatır.</small>
              </div>
              <div className="intro-navigation">
                <button
                  className="intro-pause"
                  disabled={!motion}
                  onClick={toggleAnimation}
                  aria-label={
                    playing ? "Animasyonu duraklat" : "Animasyona devam et"
                  }
                >
                  {playing ? <Pause size={17} /> : <Activity size={17} />}
                  <span>{playing ? "Duraklat" : "Devam ettir"}</span>
                </button>
                <button
                  className="intro-back"
                  aria-label="Önceki açıklama"
                  disabled={first}
                  onClick={previousCue}
                >
                  <ArrowLeft size={19} />
                </button>
                <button className="intro-next" onClick={nextCue}>
                  {last ? "Platformu keşfet" : "Sonraki adım"}
                  <ArrowRight size={19} />
                </button>
              </div>
            </div>
          </div>
          <span
            className="intro-announcement"
            role="status"
            aria-live={playing ? "off" : "polite"}
          >
            {chapter.title} {cue.text}
          </span>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
