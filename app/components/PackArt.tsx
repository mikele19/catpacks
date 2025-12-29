"use client";

import { motion } from "framer-motion";

export default function PackArt({
  state,
  onTap,
  shakeTrigger,
  customImage
}: {
  state: "idle" | "charging" | "opening" | "reveal";
  onTap: () => void;
  shakeTrigger?: number;
  customImage?: string;
}) {
  
  // Animazione Scossa
  const shake =
    state === "charging"
      ? { 
          rotate: [0, -5, 5, -5, 5, 0],
          y: [0, -2, 2, -2, 2, 0],
          scale: [1, 1.05, 1],
        }
      : { rotate: 0, y: 0, scale: 1 };

  // Animazione Pulsazione (durante il flash)
  const pulse =
    state === "opening"
      ? { scale: [1, 1.15, 0.9] } // Pulsazione più forte prima del "Boom"
      : { scale: 1 };

  // MODIFICA: Non mostriamo mai "box-open.png".
  // Rimaniamo sulla cassa chiusa finché non appare il gatto sopra.
  const packSrc = customImage || "/pack/box-closed.png";

  return (
    <motion.div
      key={state === "charging" ? shakeTrigger : "static"}
      animate={{ ...shake, ...pulse }}
      transition={{ duration: 0.2 }}
      className="relative w-[230px] h-[300px] flex items-center justify-center cursor-pointer"
      onClick={onTap}
      whileTap={{ scale: 0.95 }}
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