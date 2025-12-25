"use client";

import { motion } from "framer-motion";
import type { TabKey } from "./SwipeTabs";

const tabs: { label: string; key: TabKey }[] = [
  { label: "Home", key: "home" },
  { label: "Collezione", key: "collection" },
  { label: "Profilo", key: "profile" },
];

export default function BottomNav({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-md rounded-[24px] bg-black/40 border border-white/10 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
        <div className="relative grid grid-cols-3">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative py-4"
              >
                <div
                  className={`text-[12px] font-extrabold tracking-wide ${
                    active ? "text-white" : "text-white/50"
                  }`}
                >
                  {t.label}
                </div>

                {active && (
                  <motion.div
                    layoutId="tab"
                    className="absolute left-1/2 -translate-x-1/2 bottom-2 h-1 w-10 rounded-full bg-gradient-to-r from-blue-500 to-fuchsia-500"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
