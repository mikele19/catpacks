"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";

type Rarity = "all" | "common" | "rare" | "epic" | "legendary" | "mythic";

type Cat = {
  id: string;
  name: string;
  rarity: Exclude<Rarity, "all">;
  image_url: string;
  base_value: number;
};

type Owned = {
  cat_id: string;
  count: number;
  latest_acquired_at: string;
};

/* 🔥 COLORI CALDI */
function rarityGradient(r: Exclude<Rarity, "all">) {
  switch (r) {
    case "common":
      return "from-red-600 to-red-700";
    case "rare":
      return "from-orange-500 to-red-600";
    case "epic":
      return "from-fuchsia-600 to-purple-700";
    case "legendary":
      return "from-yellow-400 to-orange-500";
    case "mythic":
      return "from-pink-500 via-fuchsia-600 to-purple-700";
  }
}

export default function CollectionScreen() {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [ownedMap, setOwnedMap] = useState<Record<string, Owned>>({});
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity>("all");
  const [selected, setSelected] = useState<(Cat & { owned?: Owned }) | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: catalog } = await supabase
        .from("cats_catalog")
        .select("id,name,rarity,image_url,base_value")
        .order("base_value", { ascending: true });

      const { data: inv } = await supabase
        .from("user_cats")
        .select("cat_id, acquired_at")
        .eq("user_id", userData.user.id);

      const map: Record<string, Owned> = {};
      for (const row of inv ?? []) {
        map[row.cat_id] ??= {
          cat_id: row.cat_id,
          count: 0,
          latest_acquired_at: row.acquired_at,
        };
        map[row.cat_id].count++;
      }

      setCats((catalog ?? []) as Cat[]);
      setOwnedMap(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return cats.filter(
      (c) =>
        (!q || c.name.toLowerCase().includes(q)) &&
        (rarity === "all" || c.rarity === rarity)
    );
  }, [cats, query, rarity]);

  return (
    <div className="min-h-screen pb-28 text-white bg-gradient-to-b from-black via-[#120000] to-black">
      <div className="max-w-md mx-auto px-5 pt-6">

        {/* HEADER */}
        <h1 className="text-4xl font-black tracking-tight">Collezione</h1>

        {/* SEARCH */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca un gatto…"
          className="mt-4 w-full rounded-xl bg-black/40 border border-red-600/40 px-4 py-3 font-bold outline-none"
        />

        {/* FILTRI */}
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {(["all", "common", "rare", "epic", "legendary", "mythic"] as Rarity[]).map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={`px-4 py-2 rounded-full font-black text-sm
                ${rarity === r
                  ? "bg-red-600 text-white"
                  : "bg-black/40 border border-red-600/30 text-white/70"}
              `}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {loading ? (
            <div>Caricamento…</div>
          ) : (
            filtered.map((c) => {
              const owned = ownedMap[c.id];
              return (
                <button key={c.id} onClick={() => setSelected({ ...c, owned })}>
                  <div
                    className={`rounded-2xl p-[2px] bg-gradient-to-br ${rarityGradient(
                      c.rarity
                    )}`}
                  >
                    <div className="rounded-2xl bg-black overflow-hidden">
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className={`h-40 w-full object-cover ${
                          owned ? "" : "opacity-25 grayscale"
                        }`}
                      />

                      <div className="p-3">
                        <div className="font-black">{c.name}</div>
                        <div className="text-xs text-white/70">
                          Valore {c.base_value}
                        </div>
                        {owned && (
                          <div className="mt-1 text-sm font-black text-yellow-400">
                            x{owned.count}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full rounded-t-3xl bg-black border-t border-red-600 p-5"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black">{selected.name}</h2>
              <img
                src={selected.image_url}
                className="mt-4 rounded-xl w-full h-64 object-cover"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
