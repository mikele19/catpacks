"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { ReactNode, useEffect, useState } from "react";

// Definiamo le chiavi possibili
export type TabKey = "home" | "collection" | "friends" | "profile";

// ORDINE ESATTO: Deve coincidere con l'AppShell!
const order: TabKey[] = ["home", "collection", "friends", "profile"];

export default function SwipeTabs({
  tab,
  onTabChange,
  children,
}: {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  children: ReactNode[];
}) {
  const currentIndex = order.indexOf(tab);
  
  const [direction, setDirection] = useState(0);
  const [prevIndex, setPrevIndex] = useState(currentIndex);

  useEffect(() => {
    if (currentIndex > prevIndex) setDirection(1);
    else if (currentIndex < prevIndex) setDirection(-1);
    setPrevIndex(currentIndex);
  }, [currentIndex]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  // PROTEZIONE: Se la pagina non esiste, evita che tutto diventi bianco
  const pageContent = children[currentIndex];

  if (!pageContent) {
    return (
      <div className="h-full flex items-center justify-center font-bold text-red-500 bg-white/80 m-4 rounded-xl">
        Errore: Pagina "{tab}" non trovata o indice errato.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={tab}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full h-full absolute inset-0"
        >
          {pageContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}