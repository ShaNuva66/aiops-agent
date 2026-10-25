import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  CheckCircle2,
  Database,
  Fingerprint,
  Monitor,
  MoveHorizontal,
  Radio,
  Server,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { casePhases, formatRecordTime } from "./observatory-data";

type Props = {
  active: number;
  motion: boolean;
  technical: boolean;
  onSelect: (index: number) => void;
  onPause: () => void;
  onProof: (id?: string) => void;
};

function SystemNode({
  icon: Icon,
  name,
  text,
  state,
}: {
  icon: LucideIcon;
  name: string;
  text: string;
  state: string;
}) {
  return (
    <div className={`obs-system-node ${state}`}>
      <div className="obs-node-icon">
        <Icon size={30} />
        <i />
      </div>
      <strong>{name}</strong>
      <span className="obs-node-status">{text}</span>
    </div>
  );
}

/** Native horizontal scrolling with a transformed inner surface: snap geometry stays flat. */
export function SceneDeck(props: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const scrollSelected = useRef<number | null>(null);
  const programmaticTarget = useRef<number | null>(null);
  const frame = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const suppressClick = useRef(false);
  const lastIndex = casePhases.length - 1;

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (scrollSelected.current === props.active) {
      scrollSelected.current = null;
      return;
    }
    programmaticTarget.current = props.active;
    rail.scrollTo({
      left: props.active * rail.clientWidth,
      behavior: props.motion ? "smooth" : "instant",
    });
  }, [props.active, props.motion]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const surfaces = Array.from(
      rail.querySelectorAll<HTMLElement>(".obs-scene-surface"),
    );
    const paint = () => {
      const width = rail.clientWidth || 1;
      const position = rail.scrollLeft / width;
      surfaces.forEach((surface, index) => {
        const distance = Math.max(-2, Math.min(2, index - position));
        surface.style.setProperty("--scene-angle", `${distance * -24}deg`);
        surface.style.setProperty(
          "--scene-depth",
          `${-Math.min(1, Math.abs(distance)) * 85}px`,
        );
        surface.style.setProperty(
          "--scene-scale",
          `${1 - Math.min(1, Math.abs(distance)) * 0.05}`,
        );
      });
    };
    const settle = () => {
      const width = rail.clientWidth || 1;
      const nearest = Math.max(
        0,
        Math.min(lastIndex, Math.round(rail.scrollLeft / width)),
      );
      if (programmaticTarget.current !== null) {
        if (Math.abs(rail.scrollLeft - programmaticTarget.current * width) > 3)
          return;
        programmaticTarget.current = null;
      }
      if (nearest !== propsRef.current.active) {
        scrollSelected.current = nearest;
        propsRef.current.onSelect(nearest);
      }
    };
    const scroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(paint);
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 150);
    };
    const input = () => {
      programmaticTarget.current = null;
      propsRef.current.onPause();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        input();
        if (event.shiftKey && !event.deltaX) {
          event.preventDefault();
          rail.scrollBy({
            left: event.deltaY * (event.deltaMode === 1 ? 20 : 1),
            behavior: "instant",
          });
        }
      }
    };
    let drag: { id: number; x: number; left: number; started: boolean } | null =
      null;
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        input();
        return;
      }
      if (
        event.button !== 0 ||
        (event.target as Element).closest("button,a,summary,input")
      )
        return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        left: rail.scrollLeft,
        started: false,
      };
    };
    const move = (event: PointerEvent) => {
      if (!drag) return;
      const delta = event.clientX - drag.x;
      if (!drag.started && Math.abs(delta) < 8) return;
      if (!drag.started) {
        drag.started = true;
        input();
        rail.classList.add("is-dragging");
        rail.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      rail.scrollLeft = drag.left - delta;
    };
    const up = () => {
      if (drag?.started) {
        const pointerId = drag.id;
        if (rail.hasPointerCapture(pointerId))
          rail.releasePointerCapture(pointerId);
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
        rail.classList.remove("is-dragging");
        const nearest = Math.max(
          0,
          Math.min(
            lastIndex,
            Math.round(rail.scrollLeft / (rail.clientWidth || 1)),
          ),
        );
        rail.scrollTo({
          left: nearest * rail.clientWidth,
          behavior: propsRef.current.motion ? "smooth" : "instant",
        });
      }
      drag = null;
    };
    rail.addEventListener("scroll", scroll, { passive: true });
    rail.addEventListener("scrollend", settle);
    rail.addEventListener("wheel", wheel, { passive: false });
    rail.addEventListener("pointerdown", down);
    rail.addEventListener("pointermove", move);
    rail.addEventListener("pointerup", up);
    rail.addEventListener("pointercancel", up);
    const resize = new ResizeObserver(() => {
      programmaticTarget.current = null;
      rail.scrollTo({
        left: propsRef.current.active * rail.clientWidth,
        behavior: "instant",
      });
      paint();
    });
    resize.observe(rail);
    paint();
    return () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settleTimer.current);
      resize.disconnect();
      rail.removeEventListener("scroll", scroll);
      rail.removeEventListener("scrollend", settle);
      rail.removeEventListener("wheel", wheel);
      rail.removeEventListener("pointerdown", down);
      rail.removeEventListener("pointermove", move);
      rail.removeEventListener("pointerup", up);
      rail.removeEventListener("pointercancel", up);
    };
  }, [lastIndex]);

  return (
    <div className="obs-cinematic-deck">
      <div className="obs-scene-instructions" id="obs-scene-instructions">
        <span>
          <MoveHorizontal size={20} />
          <strong>3D olay sahnelerini keşfet</strong>
        </span>
        <span>Sağa / sola sürükle · Parmakla kaydır · Oklarla ilerle</span>
      </div>
      <div
        ref={railRef}
        className="obs-scene-rail"
        tabIndex={0}
        role="region"
        aria-roledescription="yatay sahne galerisi"
        aria-label="Üç boyutlu olay sahneleri"
        aria-describedby="obs-scene-instructions"
        onFocusCapture={props.onPause}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            props.onSelect(
              Math.max(
                0,
                Math.min(
                  lastIndex,
                  props.active + (event.key === "ArrowRight" ? 1 : -1),
                ),
              ),
            );
          }
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {casePhases.map((phase, index) => (
          <div
            className="obs-scene-slide"
            key={phase.id}
            aria-hidden={index !== props.active}
            inert={index !== props.active}
            data-active={index === props.active}
          >
            <div className="obs-scene-surface">
              <div className="obs-scene-chapter" aria-hidden="true">
                SAHNE <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{phase.title}</span>
              </div>
              <div className="obs-stage-body">
                <div className="obs-topology">
                  <div className="obs-topology-header">
                    <span>
                      <Radio size={16} /> O ADIMDA SİSTEMİN DURUMU
                    </span>
                    <small>Görsel tekrar</small>
                  </div>
                  <div className="obs-network">
                    <SystemNode
                      icon={Monitor}
                      name="Çalışan"
                      text={
                        phase.app === "fault"
                          ? "İşlemi tamamlayamıyor"
                          : "Uygulamayı kullanıyor"
                      }
                      state="healthy"
                    />
                    <div className={`obs-connector ${phase.app}`}>
                      <span />
                      <ArrowRight size={18} />
                    </div>
                    <SystemNode
                      icon={Server}
                      name="İş uygulaması"
                      text={
                        phase.app === "fault"
                          ? "Hata veriyor"
                          : phase.app === "checking"
                            ? "Kontrol ediliyor"
                            : "Yanıt veriyor"
                      }
                      state={phase.app}
                    />
                    <div className={`obs-connector ${phase.database}`}>
                      <span />
                      <ArrowRight size={18} />
                    </div>
                    <SystemNode
                      icon={Database}
                      name="Veritabanı"
                      text={
                        phase.database === "healthy"
                          ? "Bağlantı sağlıklı"
                          : "Kontrol ediliyor"
                      }
                      state={phase.database}
                    />
                  </div>
                  <div className="obs-http-result" data-tone={phase.tone}>
                    <span>
                      {phase.tone === "fault" ? (
                        <Activity size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      <strong>{phase.response}</strong>
                    </span>
                    <small>
                      {phase.app === "fault"
                        ? "Kullanıcının isteği başarısız"
                        : "Kontrol sonucuna göre"}
                    </small>
                  </div>
                  <div className="obs-topology-legend">
                    <span>
                      <i /> Sağlıklı yanıt
                    </span>
                    <span>
                      <i /> Hata gözlemi
                    </span>
                    <span>Veritabanı bu vakada durmadı.</span>
                  </div>
                </div>
                <div className="obs-event-explanation">
                  <div className="obs-step-meta">
                    <span className="obs-step-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="obs-role-tag">{phase.actor}</span>
                  </div>
                  <h3>{phase.heading}</h3>
                  <p className="obs-stage-description">{phase.description}</p>
                  <div className="obs-human-impact">
                    <span>
                      <Monitor size={17} /> ÇALIŞAN İÇİN ANLAMI
                    </span>
                    <p>{phase.impact}</p>
                  </div>
                  {props.technical && (
                    <div className="obs-step-technical">
                      <code>{phase.response}</code>
                      <small>Kayıt zamanı: {formatRecordTime(phase.at)}</small>
                      <small>{phase.proof}</small>
                    </div>
                  )}
                  <button
                    className="obs-proof-link"
                    onClick={() => props.onProof(phase.evidenceIds[0])}
                  >
                    <Fingerprint size={18} /> Bu adımın kanıtını gör{" "}
                    <ArrowUpRight size={17} />
                  </button>
                  <div className="obs-next-hint">
                    {index < lastIndex ? (
                      <button onClick={() => props.onSelect(index + 1)}>
                        Sırada: {casePhases[index + 1].title}{" "}
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <span>
                        <CheckCheck size={18} /> Olay, sağlıklı kontrolle
                        kapandı.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="obs-scene-announcement" role="status">
        Sahne {props.active + 1} / {casePhases.length}:{" "}
        {casePhases[props.active].title}
      </p>
    </div>
  );
}
