import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { introSlides } from "./intro-slides";
import {
  filmChapters,
  filmDuration,
  formatFilmTime,
  locateFilmTime,
} from "./intro-film";
import { IntroFilmScene } from "./intro-film-scene";
import { useVisualMotion } from "./visual-experience";
import "./intro-presentation.css";

export const introSeenKey = "aiops-intro-seen-v2";
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
    /* Presentation works without optional browser storage. */
  }
}

/** One clock controls subtitles, causal scene state and seeking; no lab request. */
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
  const [speed, setSpeed] = useState(1);
  const { motion, setMotion } = useVisualMotion();
  const frame = locateFilmTime(filmChapters, elapsed);
  const chapter = filmChapters[frame.chapterIndex];
  const cue = chapter.cues[frame.cueIndex];
  const slide = introSlides[frame.chapterIndex];
  const finished = elapsed >= filmDuration;
  const last = frame.chapterIndex === filmChapters.length - 1;

  const seek = (seconds: number, focus = false) => {
    const next = Math.max(0, Math.min(filmDuration, seconds));
    cancelAnimationFrame(animationFrame.current);
    setPlaying(false);
    position.current = next;
    setElapsed(next);
    focusScene.current =
      focus &&
      locateFilmTime(filmChapters, next).chapterIndex !== frame.chapterIndex;
    if (focus && !focusScene.current)
      heading.current?.focus({ preventScroll: true });
  };
  const selectChapter = (index: number) => {
    seek(
      filmChapters[Math.max(0, Math.min(index, filmChapters.length - 1))].start,
      true,
    );
  };
  const togglePlay = () => {
    if (!motion || document.hidden) return;
    if (playing) cancelAnimationFrame(animationFrame.current);
    if (finished) {
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
    const startedAt = performance.now();
    const startedPosition = position.current;
    let lastPaint = 0;
    const paint = (now: number) => {
      if (now - lastPaint >= 32) {
        lastPaint = now;
        const next = Math.min(
          filmDuration,
          startedPosition + ((now - startedAt) / 1000) * speed,
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
  }, [open, playing, motion, speed]);

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
            dialog.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input:not(:disabled),select:not(:disabled),summary",
            ) ?? [],
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
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
        const editing = (event.target as HTMLElement).matches(
          "input,select,summary",
        );
        if (!editing) {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            seek(position.current + 5);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            seek(position.current - 5);
          }
          if (event.key === "Home") {
            event.preventDefault();
            seek(0, true);
          }
          if (event.key === "End") {
            event.preventDefault();
            seek(filmDuration, true);
          }
          if (
            event.key.toLowerCase() === "k" ||
            (event.code === "Space" &&
              !(event.target as HTMLElement).closest("button"))
          ) {
            event.preventDefault();
            togglePlay();
          }
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
              <span>PROJE FİLMİ</span>
            </span>
            <div className="intro-header-actions">
              <span className="intro-film-badge">
                <i /> Kayıtlı vaka · Görsel anlatım
              </span>
              <button className="intro-skip" onClick={onClose}>
                Filmi geç <X size={19} />
              </button>
            </div>
          </div>
          <nav className="intro-chapters" aria-label="Film sahneleri">
            {filmChapters.map((item, index) => (
              <button
                key={item.id}
                aria-label={`${index + 1}. ${chapterLabels[index]}`}
                aria-current={index === frame.chapterIndex ? "step" : undefined}
                onClick={() => selectChapter(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{chapterLabels[index]}</span>
                <i
                  style={
                    {
                      "--chapter-progress": `${index < frame.chapterIndex ? 100 : index === frame.chapterIndex ? frame.progress * 100 : 0}%`,
                    } as React.CSSProperties
                  }
                />
              </button>
            ))}
          </nav>
          <div className="intro-scene-heading">
            <div>
              <span className="intro-eyebrow">
                SAHNE {frame.chapterIndex + 1} / {filmChapters.length} <span />{" "}
                {chapterLabels[frame.chapterIndex]}
              </span>
              <h1 id="intro-title" ref={heading} tabIndex={-1}>
                {chapter.title}
              </h1>
            </div>
            <span className="intro-actor">{slide.actor}</span>
          </div>
          <div className="intro-screen">
            <IntroFilmScene
              id={chapter.id}
              progress={frame.progress}
              playing={playing}
              motion={motion}
            />
          </div>
          <div
            className="intro-caption"
            role="group"
            aria-label="Sahnenin açıklaması"
          >
            <div className="intro-caption-label">
              <span>{String(frame.cueIndex + 1).padStart(2, "0")}</span>
              <strong>{cue.label}</strong>
            </div>
            <p>{cue.text}</p>
            <div className="intro-cue-steps" aria-label="Bu sahnenin adımları">
              {chapter.cues.map((item, index) => (
                <button
                  key={item.at}
                  aria-label={`${index + 1}. anlatım: ${item.label}`}
                  aria-current={index === frame.cueIndex ? "step" : undefined}
                  onClick={() => seek(chapter.start + item.at)}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
          <div className="intro-player">
            <div className="intro-timeline">
              <output aria-label="Geçen anlatım süresi" aria-live="off">
                {formatFilmTime(elapsed)}
              </output>
              <input
                type="range"
                aria-label="Film zaman çizelgesi"
                aria-valuetext={`${formatFilmTime(elapsed)} / ${formatFilmTime(filmDuration)} · ${chapterLabels[frame.chapterIndex]} · ${cue.label}`}
                min={0}
                max={filmDuration}
                step={0.1}
                value={elapsed}
                onChange={(event) => seek(Number(event.currentTarget.value))}
                style={
                  {
                    "--film-progress": `${(elapsed / filmDuration) * 100}%`,
                  } as React.CSSProperties
                }
              />
              <span>{formatFilmTime(filmDuration)}</span>
            </div>
            <div className="intro-transport">
              <div className="intro-video-controls">
                <button
                  className="intro-icon-button"
                  aria-label="10 saniye geri sar"
                  title="10 saniye geri sar"
                  onClick={() => seek(position.current - 10)}
                  disabled={elapsed === 0}
                >
                  <RotateCcw size={19} />
                  <small>10</small>
                </button>
                <button
                  className="intro-play"
                  disabled={!motion}
                  aria-label={
                    playing
                      ? "Filmi duraklat"
                      : finished
                        ? "Filmi baştan oynat"
                        : "Filmi oynat"
                  }
                  onClick={togglePlay}
                >
                  {playing ? (
                    <Pause size={23} fill="currentColor" />
                  ) : (
                    <Play size={23} fill="currentColor" />
                  )}
                </button>
                <button
                  className="intro-icon-button"
                  aria-label="10 saniye ileri sar"
                  title="10 saniye ileri sar"
                  onClick={() => seek(position.current + 10)}
                  disabled={finished}
                >
                  <RotateCw size={19} />
                  <small>10</small>
                </button>
                <label className="intro-speed">
                  <span>Hız</span>
                  <select
                    aria-label="Oynatma hızı"
                    value={speed}
                    onChange={(event) =>
                      setSpeed(Number(event.currentTarget.value))
                    }
                  >
                    {[0.75, 1, 1.25, 1.5].map((value) => (
                      <option value={value} key={value}>
                        {value}×
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="intro-motion"
                  aria-label={`Hareket ${motion ? "açık" : "kapalı"}`}
                  aria-pressed={motion}
                  onClick={() => setMotion(!motion)}
                >
                  <Activity size={17} />
                  <span>Hareket {motion ? "açık" : "kapalı"}</span>
                </button>
              </div>
              <div className="intro-paging">
                <button
                  className="intro-icon-button"
                  aria-label="Önceki sahne"
                  title="Önceki sahne"
                  disabled={frame.chapterIndex === 0}
                  onClick={() => selectChapter(frame.chapterIndex - 1)}
                >
                  <ChevronLeft size={21} />
                </button>
                {last ? (
                  <button className="intro-next" onClick={() => onExplore()}>
                    Kanıtları incele <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    className="intro-next"
                    onClick={() => selectChapter(frame.chapterIndex + 1)}
                  >
                    Sonraki sahne <ChevronRight size={19} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="intro-provenance">
            <span>
              {motion
                ? "Süre anlatıma aittir"
                : "Hareket kapalı · Anlatım adımlarını seçebilirsin"}{" "}
              · Canlı işlem başlatmaz.
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
              {chapter.title} {cue.text}
            </span>
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
