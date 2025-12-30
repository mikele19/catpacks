"use client";

import { useEffect, useMemo, useRef } from "react";

export type TabKey = "home" | "collection" | "friends" | "profile";

export default function SwipeTabs({
  tab,
  onTabChange,
  children,
}: {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  children: React.ReactNode[];
})
 {
  const ref = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef(false);

  const index = useMemo(() => {
    if (tab === "home") return 0;
    if (tab === "collection") return 1;
    return 2;
  }, [tab]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    isProgrammaticScroll.current = true;
    const w = el.clientWidth;
    el.scrollTo({ left: index * w, behavior: "smooth" });

    const timeout = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);

    return () => clearTimeout(timeout);
  }, [index]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (isProgrammaticScroll.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        const i = Math.round(el.scrollLeft / w);
        const next: TabKey = i === 0 ? "home" : i === 1 ? "collection" : "profile";
        if (next !== tab) onTabChange(next);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onTabChange, tab]);

  return (
    <div
      ref={ref}
      // MODIFICA CRUCIALE: fixed inset-0 blocca la pagina.
      // overflow-y-hidden impedisce lo scroll verticale generale.
      className={`
        fixed inset-0 h-[100dvh] w-full
        overflow-x-auto overflow-y-hidden
        flex
        snap-x snap-mandatory
        scroll-smooth
        overscroll-y-none
        [-webkit-overflow-scrolling:touch]
      `}
    >
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {children.map((child, i) => (
        // Ogni sezione è alta esattamente quanto lo schermo (h-full) e larga quanto lo schermo
        <section
          key={i}
          className="w-screen h-full flex-shrink-0 snap-start overflow-hidden relative"
        >
          {child}
        </section>
      ))}
    </div>
  );
}