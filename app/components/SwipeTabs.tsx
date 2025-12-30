"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { ReactNode, useEffect, useState } from "react";

export type TabKey = "home" | "collection" | "friends" | "profile";

// L'ordine deve corrispondere a quello in AppShell
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

  // USA React.Children.toArray per sicurezza
  const childrenArray = React.Children.toArray(children);
  const pageContent = childrenArray[currentIndex];

  if (!pageContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white/90 p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-black text-red-500 mb-2">Errore Navigazione</h2>
          <p className="text-sm font-bold text-gray-600">
             Impossibile trovare la pagina: <span className="uppercase">{tab}</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">
             Controlla che FriendsScreen sia importato in AppShell.tsx
          </p>
        </div>
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