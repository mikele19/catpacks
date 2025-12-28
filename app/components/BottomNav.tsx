"use client";

import type { TabKey } from "./SwipeTabs";

// Definizione dei tab con le EMOJI
const tabs: { label: string; key: TabKey; icon: string }[] = [
  { label: "Home", key: "home", icon: "🏠" },
  { label: "Collezione", key: "collection", icon: "🃏" },
  { label: "Profilo", key: "profile", icon: "👤" },
];

export default function BottomNav({
  tab,
  onTabChange,
}: {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
})
 {
  return (
    // Ho spostato il commento qui sopra, fuori dal return JSX per evitare errori
    // z-[100] assicura che il menu sia SOPRA a tutto
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4">
      
      <div className="mx-auto max-w-md sticker bg-white/90 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-3">
          {tabs.map((t) => {
            const active = tab === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="relative py-3 active:scale-[0.95] transition-transform"
              >
                <div className="flex flex-col items-center gap-1">
                  
                  {/* Emoji al posto dell'immagine */}
                  <div className={`text-2xl leading-none transition-all ${active ? "scale-110 blur-none" : "opacity-40 grayscale scale-100"}`}>
                    {t.icon}
                  </div>

                  <div className={`text-[11px] font-black tracking-wide ${active ? "text-black" : "text-black/40"}`}>
                    {t.label}
                  </div>
                </div>

                {/* Indicatore attivo */}
                {active && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-1.5 h-[3px] w-8 rounded-full bg-black" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}