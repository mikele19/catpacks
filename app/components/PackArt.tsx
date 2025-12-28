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

  const handleTap = () => {
    if (state !== "closed") return;
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
      {/* SCATOLA */}
      <motion.img
        src={state === "closed" ? "/pack/box-closed.png" : "/pack/box-open.png"}
        onClick={handleTap}
        className="w-[240px] select-none"
        animate={{ scale: state === "closed" && taps > 0 ? [1, 1.05, 1] : 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* FLASH */}
      <AnimatePresence>
        {state === "reveal" && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-white rounded-full z-20"
          />
        )}
      </AnimatePresence>

      {/* CARD GATTO */}
      <AnimatePresence>
        {cat && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.4 }}
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
