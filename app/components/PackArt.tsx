"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PackArt() {
  const [taps, setTaps] = useState(0);
  const [state, setState] = useState<
    "closed" | "opened" | "reveal"
  >("closed");

  // handle tap
  const handleTap = () => {
    if (state !== "closed") return;

    setTaps((t) => t + 1);
  };

  // when taps reach 3 → open
  useEffect(() => {
    if (taps === 3) {
      setState("opened");

      setTimeout(() => {
        setState("reveal");
      }, 1000);
    }
  }, [taps]);

  return (
    <div className="relative flex items-center justify-center h-[400px]">
      {/* SCATOLA */}
      <motion.img
        src={
          state === "closed"
            ? "/pack/box-closed.png"
            : "/pack/box-open.png"
        }
        onClick={handleTap}
        className="w-[240px] select-none"
        animate={{
          scale:
            state === "closed" && taps > 0
              ? [1, 1.05, 1]
              : 1,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* FLASH */}
      <AnimatePresence>
        {state === "reveal" && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 bg-white rounded-full z-20"
          />
        )}
      </AnimatePresence>

      {/* GATTO */}
      <AnimatePresence>
        {state === "reveal" && (
          <motion.img
            src="/cats/cat-legendary.png"
            initial={{ scale: 0.2, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute z-30 w-[180px]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
