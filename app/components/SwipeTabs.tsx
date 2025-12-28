"use client";

import { useEffect, useMemo, useRef } from "react";

export type TabKey = "home" | "collection" | "profile";

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
  // Questo ref serve a capire se stiamo scorrendo "via codice" (click) o "a mano" (swipe)
  const isProgrammaticScroll = useRef(false);

  const index = useMemo(() => {
    if (tab === "home") return 0;
    if (tab === "collection") return 1;
    return 2;
  }, [tab]);

  // Quando cambi tab dai bottoni -> scrolla fluido
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Attiviamo il blocco: "Stiamo muovendo noi, ignora eventi scroll"
    isProgrammaticScroll.current = true;
    
    const w = el.clientWidth;
    el.scrollTo({ left: index * w, behavior: "smooth" });

    // Rilasciamo il blocco dopo un po' (tempo dell'animazione)
    const timeout = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);

    return () => clearTimeout(timeout);
  }, [index]);

  // Quando swipi a mano -> aggiorna tab
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      // Se il movimento è causato dal click sul bottone, NON fare nulla qui
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
      className={`
        relative min-h-screen overflow-x-auto overflow-y-hidden
        flex
        snap-x snap-mandatory
        scroll-smooth
        [-webkit-overflow-scrolling:touch]
      `}
    >
      {/* Nascondi scrollbar */}
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