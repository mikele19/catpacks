"use client";

import { motion } from "framer-motion";

export default function PackArt({
  state,
  onTap, // Riceve il click per l'animazione "tap"
}: {
  // Accetta anche "reveal" per non rompere il tipo, ma visivamente lo tratta come aperto
  state: "idle" | "charging" | "opening" | "reveal";
  onTap: () => void;
}) {
  
  // Animazione vibrazione quando carichi
  const shake =
    state === "charging"
      ? { rotate: [0, -2, 2, -2, 2, 0], y: [0, -1, 1, -1, 1, 0] }
      : { rotate: 0, y: 0 };

  // Animazione pulsazione quando si apre
  const pulse =
    state === "opening"
      ? { scale: [1, 1.05, 0.95] }
      : { scale: 1 };

  // Sceglie l'immagine in base allo stato
  // Nota: Assicurati di avere queste immagini in /public/ui/
  // Se non le hai, usa dei placeholder o rimetti i tuoi percorsi
  const packSrc =
    state === "opening" || state === "reveal"
      ? "/pack/box-open.png"      // Usa il pacco aperto 3D
      : "/pack/box-closed.png";   // Usa il pacco chiuso 3D (anche per 'charging')
  return (
    <motion.div
      animate={{ ...shake, ...pulse }}
      transition={{ duration: 0.35 }}
      className="relative w-[230px] h-[300px] flex items-center justify-center"
      onClick={onTap} // Passa il click al genitore
    >
      <img
        src={packSrc}
        alt="Pack"
        draggable={false}
        className={`w-full h-full select-none object-contain ${
          state === "idle" ? "animate-pack-breathe" : ""
        }`}
      />
      
      {/* Animazione CSS per il respiro quando è fermo */}
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