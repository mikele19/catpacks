"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { ReactNode, useEffect, useState } from "react";

export type TabKey = "home" | "collection" | "friends" | "profile";

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
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      zIndex: 0, // Entra dietro
    }),
    center: {
      x: 0,
      opacity: 1,
      zIndex: 10, // La pagina attiva sta DAVANTI
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      zIndex: 0, // Esce dietro
    }),
  };

  const childrenArray = React.Children.toArray(children);
  const pageContent = childrenArray[currentIndex];

  if (!pageContent) return null;

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
          className="w-full h-full absolute inset-0 bg-transparent" // bg-transparent per sicurezza
        >
          {pageContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}