"use client";

import type { TabKey } from "./SwipeTabs";

const tabs: { label: string; key: TabKey; icon: string }[] = [
  { label: "Home", key: "home", icon: "🏠" },
  { label: "Collezione", key: "collection", icon: "🃏" },
  { label: "Amici", key: "friends", icon: "👥" }, // 4 TAB
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
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* soft-ui per l'effetto cuscinetto + griglia a 4 colonne */}
      <div className="mx-auto max-w-md soft-ui bg-white/90 backdrop-blur-md shadow-2xl rounded-[40px] px-2 h-20 flex items-center">
        
        <div className="grid grid-cols-4 w-full">
          {tabs.map((t) => {
            const active = tab === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="relative py-3 active:scale-[0.95] transition-transform flex flex-col items-center justify-center gap-1"
              >
                <div className={`text-2xl leading-none transition-all duration-300 ${active ? "scale-110 -translate-y-1 grayscale-0" : "opacity-40 grayscale scale-100"}`}>
                  {t.icon}
                </div>

                <div className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-300 ${active ? "text-gray-900" : "text-gray-400"}`}>
                  {t.label}
                </div>

                {active && (
                  <div className="absolute bottom-0 h-[3px] w-5 rounded-full bg-gray-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}