"use client";

import type { TabKey } from "./SwipeTabs";

const tabs: { label: string; key: TabKey }[] = [
  { label: "Home", key: "home" },
  { label: "Collezione", key: "collection" },
  { label: "Profilo", key: "profile" },
];

function Icon({ src, active }: { src: string; active: boolean }) {
  return (
    <img
      src={src}
      alt=""
      className={`h-6 w-6 transition ${
        active ? "opacity-100" : "opacity-50"
      }`}
      draggable={false}
    />
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
      <div className="mx-auto max-w-md sticker bg-white/80">
        <div className="grid grid-cols-3">
          {tabs.map((t) => {
            const active = tab === t.key;
            const iconName =
              t.key === "home" ? "home" : t.key === "collection" ? "collection" : "profile";

            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative py-3 active:scale-[0.99] transition"
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon
  src={
    t.key === "home"
      ? "/ui/icon-home.svg"
      : t.key === "collection"
      ? "/ui/icon-collection.svg"
      : "/ui/icon-profile.svg"
  }
  active={active}
/>

                  <div className={`text-[11px] font-black ${active ? "text-black" : "text-black/50"}`}>
                    {t.label}
                  </div>
                </div>

                {active && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-2 h-[3px] w-10 rounded-full bg-black/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
