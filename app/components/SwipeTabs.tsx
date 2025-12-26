"use client";

import { useEffect, useMemo, useRef } from "react";

export type TabKey = "home" | "collection" | "profile";

export default function SwipeTabs({
  tab,
  setTab,
  children,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  children: React.ReactNode[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const index = useMemo(() => {
    if (tab === "home") return 0;
    if (tab === "collection") return 1;
    return 2;
  }, [tab]);

  // quando cambi tab dalla bottom bar -> scrolla in modo fluido
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: index * w, behavior: "smooth" });
  }, [index]);

  // quando swipi -> aggiorna tab in base allo “snap”
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        const i = Math.round(el.scrollLeft / w);
        const next: TabKey = i === 0 ? "home" : i === 1 ? "collection" : "profile";
        if (next !== tab) setTab(next);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [setTab, tab]);

  return (
    <div
      ref={ref}
      className="
        relative min-h-screen overflow-x-auto overflow-y-hidden
        flex
        snap-x snap-mandatory
        scroll-smooth
        [-webkit-overflow-scrolling:touch]
      "
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* hide scrollbar (webkit) */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {children.map((child, i) => (
        <section
          key={i}
          className="w-screen flex-shrink-0 snap-start min-h-screen"
        >
          {child}
        </section>
      ))}
    </div>
  );
}
