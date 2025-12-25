"use client";

import { motion } from "framer-motion";

export default function PackArt({
  state,
}: {
  state: "idle" | "charging" | "opening";
}) {
  const shake =
    state === "charging"
      ? { rotate: [0, -2, 2, -2, 2, 0], y: [0, -1, 1, -1, 1, 0] }
      : { rotate: 0, y: 0 };

  return (
    <motion.div
      animate={shake}
      transition={{ duration: 0.35 }}
      className="relative w-[210px] h-[270px]"
    >
      {/* soft glow */}
      <div className="absolute inset-0 rounded-[40px] blur-2xl opacity-60 bg-gradient-to-b from-blue-500/30 via-purple-500/20 to-fuchsia-500/10" />

      {/* pack */}
      <div className="absolute inset-0 rounded-[40px] bg-white/8 border border-white/15 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        {/* top foil */}
        <div className="absolute -top-20 left-0 right-0 h-40 rotate-[-10deg] bg-gradient-to-r from-white/10 via-white/20 to-white/5 blur-sm" />
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/18 to-transparent" />

        {/* art stripes */}
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -left-10 top-12 h-40 w-40 rounded-full bg-blue-500/12 blur-xl" />
          <div className="absolute right-0 bottom-10 h-44 w-44 rounded-full bg-purple-500/10 blur-xl" />
          <div className="absolute left-12 bottom-10 h-36 w-36 rounded-full bg-fuchsia-500/8 blur-xl" />
        </div>

        {/* logo */}
        <div className="absolute top-5 left-0 right-0 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/8 border border-white/10">
            <span className="text-[11px] tracking-[0.35em] text-white/80 font-semibold">
              CATPACKS
            </span>
          </div>
        </div>

        {/* icon mark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-60 bg-gradient-to-br from-blue-400/35 to-fuchsia-400/25 rounded-full" />
            <svg
              width="110"
              height="110"
              viewBox="0 0 110 110"
              className="relative drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
            >
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="rgba(255,255,255,0.95)" />
                  <stop offset="1" stopColor="rgba(255,255,255,0.35)" />
                </linearGradient>
              </defs>
              <path
                d="M35 48c0-16 14-28 20-28s20 12 20 28c0 14-8 26-20 26S35 62 35 48Z"
                fill="url(#g)"
                opacity="0.9"
              />
              <path
                d="M30 45c-6-7-5-18 3-23 5 1 9 6 10 12"
                stroke="rgba(255,255,255,0.65)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M80 45c6-7 5-18-3-23-5 1-9 6-10 12"
                stroke="rgba(255,255,255,0.65)"
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
        </div>

        {/* bottom label */}
        <div className="absolute bottom-5 left-0 right-0 text-center">
          <div className="text-white font-black text-lg tracking-wide">
            BUSTINA
          </div>
          <div className="text-white/60 text-xs mt-1">
            {state === "opening"
              ? "Apertura..."
              : state === "charging"
              ? "Tocca per caricare"
              : "Pronta"}
          </div>
        </div>

        {/* tear line */}
        <div className="absolute top-14 left-6 right-6 h-[1px] bg-white/10" />
      </div>
    </motion.div>
  );
}
