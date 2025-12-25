"use client";

import { motion } from "framer-motion";

export default function PackArt({
  state,
}: {
  state: "idle" | "charging" | "opening";
}) {
  const shake =
    state === "charging"
      ? { rotate: [0, -1.2, 1.2, -1.2, 1.2, 0], y: [0, -0.5, 0.5, -0.5, 0.5, 0] }
      : { rotate: 0, y: 0 };

  const pulse =
    state === "opening"
      ? { scale: [1, 1.02, 1] }
      : { scale: 1 };

  return (
    <motion.div
      animate={{ ...shake, ...pulse }}
      transition={{ duration: 0.35 }}
      className="relative w-[230px] h-[300px]"
    >
      {/* PACK - no blur/backdrop: paper sticker */}
      <div className="absolute inset-0 rounded-[42px] bg-white/85 border-2 border-black/15 overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        {/* subtle paper grain */}
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />

        {/* soft painted gradients (no blur) */}
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div className="absolute -left-10 top-16 h-40 w-40 rounded-full bg-blue-500/10" />
          <div className="absolute right-[-30px] bottom-12 h-44 w-44 rounded-full bg-purple-500/10" />
          <div className="absolute left-10 bottom-10 h-36 w-36 rounded-full bg-fuchsia-500/8" />
        </div>

        {/* top label */}
        <div className="absolute top-5 left-0 right-0 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1 bg-white/70 border-2 border-black/10 shadow-[1px_2px_0_rgba(0,0,0,0.12)]">
            <span className="text-[11px] tracking-[0.35em] text-black/70 font-black">
              CATPACKS
            </span>
          </div>
        </div>

        {/* tear line */}
        <div className="absolute top-16 left-7 right-7 h-[2px] bg-black/8" />

        {/* icon mark (handmade) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 110 110" className="opacity-90">
            <path
              d="M35 48c0-16 14-28 20-28s20 12 20 28c0 14-8 26-20 26S35 62 35 48Z"
              fill="rgba(0,0,0,0.08)"
            />
            <path
              d="M30 45c-6-7-5-18 3-23 5 1 9 6 10 12"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M80 45c6-7 5-18-3-23-5 1-9 6-10 12"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="45" cy="54" r="4" fill="rgba(0,0,0,0.35)" />
            <circle cx="65" cy="54" r="4" fill="rgba(0,0,0,0.35)" />
            <path
              d="M50 62c4 4 6 4 10 0"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* bottom label */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <div className="text-black font-black text-xl tracking-wide">
            BUSTINA
          </div>
          <div className="text-black/55 text-xs mt-1 font-black">
            {state === "opening"
              ? "Apertura…"
              : state === "charging"
              ? "Tap tap tap…"
              : "Pronta"}
          </div>
        </div>

        {/* tiny corner scribbles */}
        <div className="absolute bottom-4 left-5 text-[10px] text-black/35 font-black rotate-[-2deg]">
          #catpacks
        </div>
        <div className="absolute bottom-4 right-5 text-[10px] text-black/35 font-black rotate-[2deg]">
          2025
        </div>
      </div>
    </motion.div>
  );
}
