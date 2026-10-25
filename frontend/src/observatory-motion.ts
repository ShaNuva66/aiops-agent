import { useEffect, type RefObject } from "react";

/** One-time, small entrances below the viewport; reading content never floats. */
export function useGentleMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  motion: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = Array.from(
      root.querySelectorAll<HTMLElement>(
        ".obs-role-card,.obs-ai-report,.obs-tool-list,.obs-evidence-card,.obs-audit-panel",
      ),
    );
    if (!motion || !("IntersectionObserver" in window)) {
      cards.forEach((card) => {
        card.dataset.reveal = "visible";
      });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.reveal = "visible";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px 40px 0px", threshold: 0 },
    );
    cards.forEach((card, index) => {
      if (card.dataset.reveal === "visible") return;
      card.style.setProperty("--reveal-delay", `${(index % 3) * 65}ms`);
      if (card.getBoundingClientRect().top <= window.innerHeight + 40)
        card.dataset.reveal = "visible";
      else {
        card.dataset.reveal = "pending";
        observer.observe(card);
      }
    });
    return () => {
      observer.disconnect();
      cards.forEach((card) => {
        if (card.dataset.reveal === "pending") delete card.dataset.reveal;
      });
    };
  }, [rootRef, motion]);

  useEffect(() => {
    const bar = rootRef.current?.querySelector<HTMLElement>(
      ".obs-reading-progress > span",
    );
    if (!bar) return;
    let frame = 0;
    const paint = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [rootRef]);
}
