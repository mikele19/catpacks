"use client";

import type { TabKey } from "./SwipeTabs";

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
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4" // Padding bottom ridotto
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      
      {/* h-16 invece di h-20: Barra più sottile */}
      <div className="mx-auto max-w-md soft-ui bg-white/90 backdrop-blur-md flex items-center justify-around h-16 px-2 rounded-[30px]">
        
          {tabs.map((t) => {
            const active = tab === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="relative w-full h-full flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-200"
              >
                <div className={`text-xl leading-none transition-all duration-300 ${active ? "scale-110 -translate-y-1 grayscale-0" : "opacity-40 grayscale scale-100"}`}>
                  {t.icon}
                </div>

                <div className={`text-[9px] font-black tracking-widest uppercase transition-colors duration-300 ${active ? "text-gray-800" : "text-gray-400"}`}>
                  {t.label}
                </div>

                {active && (
                  <div className="absolute bottom-1.5 w-1 h-1 bg-gray-800 rounded-full" />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}