"use client";

import type { TabKey } from "./SwipeTabs";

const tabs: { label: string; key: TabKey }[] = [
  { label: "Home", key: "home" },
  { label: "Collezione", key: "collection" },
  { label: "Profilo", key: "profile" },
];

function Icon({ name, active }: { name: "home" | "collection" | "profile"; active: boolean }) {
  const common = `stroke-[2.5] ${active ? "stroke-white" : "stroke-white/55"}`;
  if (name === "home") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" className={common} fill="none">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M7 10.8V20h10v-9.2" />
      </svg>
    );
  }
  if (name === "collection") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" className={common} fill="none">
        <path d="M7 7h14v14H7z" />
        <path d="M3 3h14v14" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className={common} fill="none">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4.5 20c1.8-4.2 13.2-4.2 15 0" />
    </svg>
  );
}

export default function BottomNav({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-md sketch-card">
        <div className="grid grid-cols-3">
          {tabs.map((t) => {
            const active = tab === t.key;
            const iconName = t.key === "home" ? "home" : t.key === "collection" ? "collection" : "profile";
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative py-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon name={iconName} active={active} />
                  <div className={`text-[11px] font-extrabold ${active ? "text-white" : "text-white/60"}`}>
                    {t.label}
                  </div>
                </div>

                {active && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-2 h-[3px] w-10 rounded-full bg-white/80" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
