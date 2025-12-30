"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { ReactNode, useEffect, useState } from "react";

// AGGIUNTO "friends"
export type TabKey = "home" | "collection" | "friends" | "profile";

// ORDINE ESATTO DELLE TABS (Deve corrispondere ai figli in AppShell)
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
  // Trova l'indice della tab attiva (es: home=0, collection=1, friends=2, profile=3)
  const currentIndex = order.indexOf(tab);
  
  // Stato per la direzione dello swipe
  const [direction, setDirection] = useState(0);
  const [prevIndex, setPrevIndex] = useState(currentIndex);

  useEffect(() => {
    if (currentIndex > prevIndex) {
      setDirection(1); // Vai a destra
    } else if (currentIndex < prevIndex) {
      setDirection(-1); // Vai a sinistra
    }
    setPrevIndex(currentIndex);
  }, [currentIndex]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

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
          {/* Mostra il figlio corrispondente all'indice */}
          {children[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}