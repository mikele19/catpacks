"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";

export type TabKey = "home" | "collection" | "profile";

export default function SwipeTabs({
  tab,
  setTab,
  children,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  children: React.ReactNode[];
}) {
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  const index = useMemo(() => {
    if (tab === "home") return 0;
    if (tab === "collection") return 1;
    return 2;
  }, [tab]);

  // misuro viewport
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // quando cambio tab (da bottom nav), scrollo “a scatto”
  useEffect(() => {
    if (!width) return;
    animate(x, -index * width, { type: "spring", stiffness: 260, damping: 30 });
  }, [index, width, x]);

  const onDragEnd = (_: any, info: any) => {
    if (!width) return;

    const offset = info.offset.x; // quanto hai trascinato
    const velocity = info.velocity.x;

    // soglie swipe
    const swipePower = Math.abs(offset) * (Math.abs(velocity) / 800);
    const threshold = 120;

    let nextIndex = index;

    // swipe verso sinistra -> vai avanti
    if (offset < -threshold || (offset < -60 && swipePower > 40)) nextIndex = Math.min(2, index + 1);
    // swipe verso destra -> vai indietro
    if (offset > threshold || (offset > 60 && swipePower > 40)) nextIndex = Math.max(0, index - 1);

    const nextTab: TabKey = nextIndex === 0 ? "home" : nextIndex === 1 ? "collection" : "profile";
    setTab(nextTab);

    animate(x, -nextIndex * width, { type: "spring", stiffness: 260, damping: 30 });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <motion.div
        className="flex"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -2 * width, right: 0 }}
        dragElastic={0.08}
        onDragEnd={onDragEnd}
      >
        {children.map((child, i) => (
          <div key={i} className="min-h-screen w-screen flex-shrink-0">
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
