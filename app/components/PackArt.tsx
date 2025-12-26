"use client";

import { motion } from "framer-motion";

export default function PackArt({
  state,
}: {
  state: "idle" | "charging" | "opening";
}) {
  const shake =
    state === "charging"
      ? { rotate: [0, -1.2, 1.2, -1.2, 1.2, 0], y: [0, -0.5, 0.5, -0.5, 0.5, 0] }
      : { rotate: 0, y: 0 };

  const pulse =
    state === "opening"
      ? { scale: [1, 1.04, 0.98] }
      : { scale: 1 };

  const packSrc =
    state === "opening"
      ? "/ui/pack-open.svg"
      : state === "charging"
      ? "/ui/pack-cracked.svg"
      : "/ui/pack-closed.svg";

  return (
    <motion.div
      animate={{ ...shake, ...pulse }}
      transition={{ duration: 0.35 }}
      className="relative w-[230px] h-[300px]"
    >
      <img
        src={packSrc}
        alt="Pack"
        draggable={false}
        className={`w-full h-full select-none ${
          state === "idle" ? "animate-pack-breathe" : ""
        }`}
      />
    </motion.div>
  );
}
