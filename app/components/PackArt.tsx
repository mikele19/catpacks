"use client";

import { motion } from "framer-motion";

export default function PackArt({
  state,
  onTap,
  shakeTrigger // Nuovo parametro
}: {
  state: "idle" | "charging" | "opening" | "reveal";
  onTap: () => void;
  shakeTrigger?: number; // Opzionale per compatibilità, ma noi lo useremo
}) {
  
  // Animazione scossa più forte e visibile
  const shake =
    state === "charging"
      ? { 
          rotate: [0, -5, 5, -5, 5, 0], // Rotazione più accentuata
          y: [0, -2, 2, -2, 2, 0],      // Saltello verticale
          scale: [1, 1.05, 1],          // Leggero ingrandimento all'impatto
        }
      : { rotate: 0, y: 0, scale: 1 };

  const pulse =
    state === "opening"
      ? { scale: [1, 1.1, 0.9] }
      : { scale: 1 };

  const packSrc =
    state === "opening" || state === "reveal"
      ? "/pack/box-open.png"
      : "/pack/box-closed.png";

  return (
    <motion.div
      // MODIFICA: Usiamo 'shakeTrigger' come key quando sta caricando.
      // Questo costringe React a "rifare" l'animazione ad ogni tap.
      key={state === "charging" ? shakeTrigger : "static"}
      
      animate={{ ...shake, ...pulse }}
      transition={{ duration: 0.2 }} // Animazione molto veloce (0.2s) per stare dietro ai click rapidi
      className="relative w-[230px] h-[300px] flex items-center justify-center cursor-pointer"
      onClick={onTap}
      whileTap={{ scale: 0.95 }} // Feedback visivo extra quando premi
    >
      <img
        src={packSrc}
        alt="Pack"
        draggable={false}
        className={`w-full h-full select-none object-contain ${
          state === "idle" ? "animate-pack-breathe" : ""
        }`}
      />
      
      <style jsx global>{`
        @keyframes packBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pack-breathe {
          animation: packBreathe 2.4s ease-in-out infinite;
        }
      `}</style>
    </motion.div>
  );
}