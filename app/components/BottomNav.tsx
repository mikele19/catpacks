"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { label: "Home", path: "/" },
  { label: "Collezione", path: "/collection" },
  { label: "Profilo", path: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur border-t border-white/10">
      <div className="mx-auto max-w-md grid grid-cols-3">
        {items.map((it) => {
          const active = pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => router.push(it.path)}
              className={`py-3 text-sm font-extrabold ${
                active ? "text-white" : "text-white/50"
              }`}
            >
              {it.label}
              {active && <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-blue-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}