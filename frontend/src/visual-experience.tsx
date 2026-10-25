import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ArrowUpLeft, Sparkles } from "lucide-react";
import "./visual-experience.css";

const MotionContext = createContext<{
  motion: boolean;
  setMotion: Dispatch<SetStateAction<boolean>>;
} | null>(null);
export function useVisualMotion() {
  const value = useContext(MotionContext);
  if (!value) throw new Error("Visual motion provider missing");
  return value;
}

/** Decorative pointer feedback. Native cursor, clicks and form editing are untouched. */
function PointerLight({ motion }: { motion: boolean }) {
  const pointer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = pointer.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element) return;
    let frame = 0;
    let visible = false;
    let x = 0,
      y = 0,
      targetX = 0,
      targetY = 0;
    let card: HTMLElement | null = null;
    const clearCard = () => {
      if (card) {
        delete card.dataset.pointerLit;
        card.classList.remove("ve-spot-surface");
        card = null;
      }
    };
    const hide = () => {
      visible = false;
      element.style.opacity = "0";
      cancelAnimationFrame(frame);
      frame = 0;
      clearCard();
    };
    const paint = () => {
      frame = 0;
      if (!visible) return;
      x += (targetX - x) * 0.26;
      y += (targetY - y) * 0.26;
      element.style.transform = `translate3d(${x - 120}px,${y - 120}px,0)`;
      if (Math.abs(x - targetX) + Math.abs(y - targetY) > 0.25)
        frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (
        !motion ||
        !fine.matches ||
        reduced.matches ||
        event.pointerType !== "mouse"
      ) {
        hide();
        return;
      }
      const target = event.target as Element;
      if (target.closest("input,textarea,select,[data-cursor-ignore]")) {
        hide();
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        x = targetX;
        y = targetY;
        visible = true;
      }
      element.style.opacity = "1";
      element.dataset.interactive = String(
        Boolean(target.closest("button,a,summary")),
      );
      const next = target.closest<HTMLElement>(
        ".obs-role-card,.obs-evidence-card,.obs-ai-report,.obs-audit-panel,.panel,.stat,.service-card",
      );
      if (next !== card) {
        clearCard();
        card = next;
        if (card) {
          card.classList.add("ve-spot-surface");
          card.dataset.pointerLit = "true";
        }
      }
      if (card) {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
      }
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const out = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Tab") hide();
    };
    const visibility = () => {
      if (document.hidden) hide();
    };
    if (!motion) hide();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", out, { passive: true });
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    fine.addEventListener("change", hide);
    reduced.addEventListener("change", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", out);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
      fine.removeEventListener("change", hide);
      reduced.removeEventListener("change", hide);
    };
  }, [motion]);
  return (
    <div ref={pointer} className="ve-pointer" aria-hidden="true">
      <span className="ve-pointer-aura" />
      <span className="ve-pointer-ring" />
    </div>
  );
}

export function VisualExperience({ children }: { children: ReactNode }) {
  const [motion, setMotion] = useState(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    try {
      return localStorage.getItem("aiops-motion-v1") !== "off";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("aiops-motion-v1", motion ? "on" : "off");
    } catch {
      /* visual preference is optional */
    }
  }, [motion]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      if (media.matches) setMotion(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const operator =
    new URLSearchParams(window.location.search).get("dashboard") === "1";
  return (
    <MotionContext.Provider value={{ motion, setMotion }}>
      <div className="visual-experience" data-motion={motion ? "on" : "off"}>
        {children}
        <PointerLight motion={motion} />
        {operator && (
          <div className="ve-controls">
            <a href="?case=1">
              <ArrowUpLeft size={15} /> Sunuma dön
            </a>
            <button aria-pressed={motion} onClick={() => setMotion(!motion)}>
              <Sparkles size={15} /> Efektler {motion ? "açık" : "kapalı"}
            </button>
          </div>
        )}
      </div>
    </MotionContext.Provider>
  );
}
