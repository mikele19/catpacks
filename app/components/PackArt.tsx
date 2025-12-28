"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

const POOL: {
  rarity: Rarity;
  name: string;
  value: number;
  image: string;
  chance: number;
}[] = [
  { rarity: "common", name: "Common Cat", value: 10, image: "/ui/cat-common.png", chance: 55 },
  { rarity: "rare", name: "Rare Cat", value: 30, image: "/ui/cat-rare.png", chance: 25 },
  { rarity: "epic", name: "Epic Cat", value: 80, image: "/ui/cat-epic.png", chance: 12 },
  { rarity: "legendary", name: "Legendary Cat", value: 200, image: "/ui/cat-legendary.png", chance: 6 },
  { rarity: "mythic", name: "Mythic Cat", value: 500, image: "/ui/cat-mythic.png", chance: 2 },
];

function pullCat() {
  const roll = Math.random() * 100;
  let acc = 0;

  for (const cat of POOL) {
    acc += cat.chance;
    if (roll <= acc) return cat;
  }

  return POOL[0];
}

export default function PackArt() {
  const [taps, setTaps] = useState(0);
  const [state, setState] = useState<"closed" | "opened" | "reveal">("closed");
  const [cat, setCat] = useState<null | typeof POOL[number]>(null);
  const [shakeDir, setShakeDir] = useState(1);

  const handleTap = () => {
    if (state !== "closed") return;

    setShakeDir((d) => -d); // alterna direzione
    setTaps((t) => t + 1);
  };

  useEffect(() => {
    if (taps === 3) {
      setState("opened");

      setTimeout(() => {
        setCat(pullCat());
        setState("reveal");
      }, 1000);
    }
  }, [taps]);

  const resetPack = () => {
    setTaps(0);
    setState("closed");
    setCat(null);
  };

  return (
    <div className="relative flex items-center justify-center h-[440px]">
      {/* CONTENITORE SCATOLA (dimensioni FISSE) */}
      <motion.div
        className="relative w-[240px] h-[300px]"
        onClick={handleTap}
        whileTap={{
          scale: 0.93,
          rotate: shakeDir * (2 + Math.random()),
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 18,
        }}
      >
        <img
          src={state === "closed" ? "/pack/box-closed.png" : "/pack/box-open.png"}
          className="absolute inset-0 w-full h-full object-contain select-none"
          draggable={false}
        />
      </motion.div>

      {/* FLASH */}
      <AnimatePresence>
        {state === "reveal" && (
          <motion.div
            initial={{ scale: 0, opacity: 0.85 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 bg-white rounded-full z-20"
          />
        )}
      </AnimatePresence>

      {/* CARD GATTO */}
      <AnimatePresence>
        {cat && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: -10 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute z-30 flex flex-col items-center rounded-2xl bg-white px-5 py-4 shadow-xl"
          >
            <img src={cat.image} className="w-[160px]" draggable={false} />

            <p className="mt-2 text-lg font-bold text-black">
              {cat.name}
            </p>

            <button
              onClick={resetPack}
              className="mt-3 rounded-xl bg-orange-500 px-6 py-2 font-semibold text-white active:scale-95"
            >
              Riscatta · {cat.value}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
