"use client";

import type { TabKey } from "./SwipeTabs";

// AGGIUNTO IL TAB FRIENDS (👥)
const tabs: { label: string; key: TabKey; icon: string }[] = [
  { label: "Home", key: "home", icon: "🏠" },
  { label: "Collezione", key: "collection", icon: "🃏" },
  { label: "Amici", key: "friends", icon: "👥" }, // <--- NUOVO
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
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      
      <div className="mx-auto max-w-md sticker bg-white/90 backdrop-blur-md shadow-2xl">
        {/* Cambiato grid-cols-3 in grid-cols-4 per farci stare il 4° bottone */}
        <div className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = tab === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="relative py-3 active:scale-[0.95] transition-transform"
              >
                <div className="flex flex-col items-center gap-1">
                  
                  <div className={`text-2xl leading-none transition-all ${active ? "scale-110 blur-none" : "opacity-40 grayscale scale-100"}`}>
                    {t.icon}
                  </div>

                  <div className={`text-[10px] font-black tracking-wide ${active ? "text-black" : "text-black/40"}`}>
                    {t.label}
                  </div>
                </div>

                {active && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-1.5 h-[3px] w-6 rounded-full bg-black" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}