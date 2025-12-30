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
    // Container esterno fisso
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      
      {/* MODIFICA QUI:
         - Tolto 'sticker'
         - Aggiunto 'soft-ui' per bordi e ombre 3D
         - Aggiunto 'bg-white/90' per l'effetto materiale
         - Aggiunto 'backdrop-blur-md' per l'effetto vetro
      */}
      <div className="mx-auto max-w-md soft-ui bg-white/90 backdrop-blur-md flex items-center justify-around h-20 px-2 rounded-[40px]">
        
          {tabs.map((t) => {
            const active = tab === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="relative w-full h-full flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform duration-200"
              >
                
                {/* Icona */}
                <div className={`text-2xl leading-none transition-all duration-300 ${active ? "scale-110 -translate-y-1 grayscale-0" : "opacity-40 grayscale scale-100"}`}>
                  {t.icon}
                </div>

                {/* Testo */}
                <div className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-300 ${active ? "text-gray-800" : "text-gray-400"}`}>
                  {t.label}
                </div>

                {/* Indicatore Attivo (Pillola sotto) */}
                {active && (
                  <div className="absolute bottom-2 w-1.5 h-1.5 bg-gray-800 rounded-full" />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}