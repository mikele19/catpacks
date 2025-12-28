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

function rarityGradient(r: Exclude<Rarity, "all">) {
  switch (r) {
    case "common": return "from-slate-400 to-slate-500"; // Modificato per visibilità
    case "rare": return "from-blue-400 to-blue-600";
    case "epic": return "from-purple-500 to-purple-700";
    case "legendary": return "from-yellow-400 to-orange-500";
    case "mythic": return "from-pink-500 via-red-500 to-yellow-500";
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

      const { data: catalog } = await supabase.from("cats_catalog").select("*").order("base_value", { ascending: true });
      const { data: inv } = await supabase.from("user_cats").select("*").eq("user_id", userData.user.id);

      const map: Record<string, Owned> = {};
      for (const row of inv ?? []) {
        map[row.cat_id] ??= { cat_id: row.cat_id, count: 0, latest_acquired_at: row.acquired_at };
        map[row.cat_id].count++;
      }

      setCats((catalog ?? []) as Cat[]);
      setOwnedMap(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return cats.filter(c => (!q || c.name.toLowerCase().includes(q)) && (rarity === "all" || c.rarity === rarity));
  }, [cats, query, rarity]);

  return (
    // MODIFICA: Rimosso bg-black/gradient, aggiunto text-black per leggere su giallo
    <div className="min-h-screen pb-28 text-black">
      <div className="max-w-md mx-auto px-5 pt-10">

        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm">Collezione</h1>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca un gatto…"
          // Input adattato per sfondo chiaro (sfondo bianco semitrasparente)
          className="mt-4 w-full rounded-xl bg-white/60 border border-black/10 px-4 py-3 font-bold outline-none placeholder:text-black/40 shadow-sm focus:bg-white transition"
        />

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {(["all", "common", "rare", "epic", "legendary", "mythic"] as Rarity[]).map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={`px-4 py-2 rounded-full font-black text-sm transition-all whitespace-nowrap
                ${rarity === r
                  ? "bg-black text-white scale-105 shadow-md"
                  : "bg-white/50 text-black/60 hover:bg-white/80"}
              `}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {loading ? (
            <div className="font-black text-black/50">Caricamento…</div>
          ) : (
            filtered.map((c) => {
              const owned = ownedMap[c.id];
              return (
                <button key={c.id} onClick={() => setSelected({ ...c, owned })}>
                  <div className={`rounded-2xl p-[3px] shadow-sm bg-gradient-to-br ${rarityGradient(c.rarity)}`}>
                    {/* Le card rimangono scure all'interno per far risaltare l'immagine */}
                    <div className="rounded-2xl bg-white overflow-hidden relative h-full">
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className={`h-40 w-full object-contain bg-gray-100 ${owned ? "" : "opacity-40 grayscale"}`}
                      />
                      <div className="p-3 bg-white text-left">
                        <div className="font-black leading-tight">{c.name}</div>
                        <div className="text-xs text-black/50 font-bold mt-1">Valore {c.base_value}</div>
                        {owned && (
                           <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-black px-2 py-1 rounded-full shadow-sm">
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

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-[150] flex items-end backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full rounded-t-3xl bg-white p-6 pb-12 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                 <div>
                    <h2 className="text-3xl font-black">{selected.name}</h2>
                    <div className={`text-sm font-black uppercase tracking-widest mt-1 text-${selected.rarity === 'common' ? 'gray-500' : selected.rarity === 'rare' ? 'blue-500' : 'purple-600'}`}>
                        {selected.rarity}
                    </div>
                 </div>
                 {selected.owned && (
                     <div className="text-right">
                         <div className="text-sm font-black text-black/40">POSSEDUTI</div>
                         <div className="text-2xl font-black">{selected.owned.count}</div>
                     </div>
                 )}
              </div>
              
              <div className="mt-6 flex justify-center bg-gray-50 rounded-2xl p-4">
                  <img src={selected.image_url} className="h-64 object-contain drop-shadow-md" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}