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

function rarityAccent(r: Exclude<Rarity, "all">) {
  switch (r) {
    case "common":
      return "from-white/18 to-white/4";
    case "rare":
      return "from-blue-400/30 to-blue-500/6";
    case "epic":
      return "from-purple-400/30 to-purple-500/6";
    case "legendary":
      return "from-yellow-300/34 to-yellow-500/8";
    case "mythic":
      return "from-fuchsia-400/34 to-rose-500/10";
  }
}

function rarityPill(r: Rarity) {
  switch (r) {
    case "all":
      return "Tutti";
    case "common":
      return "Common";
    case "rare":
      return "Rare";
    case "epic":
      return "Epic";
    case "legendary":
      return "Legendary";
    case "mythic":
      return "Mythic";
  }
}

export default function CollectionScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [ownedMap, setOwnedMap] = useState<Record<string, Owned>>({});
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity>("all");
  const [selected, setSelected] = useState<(Cat & { owned?: Owned }) | null>(null);

  // load data
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // catalog
      const { data: catalog, error: catErr } = await supabase
        .from("cats_catalog")
        .select("id,name,rarity,image_url,base_value")
        .order("base_value", { ascending: true });

      if (catErr) {
        console.error(catErr);
        setLoading(false);
        return;
      }
      setCats((catalog ?? []) as Cat[]);

      // inventory: prendo tutte le righe e raggruppo client-side (semplice)
      const { data: inv, error: invErr } = await supabase
        .from("user_cats")
        .select("cat_id, acquired_at")
        .eq("user_id", user.id);

      if (invErr) {
        console.error(invErr);
        setLoading(false);
        return;
      }

      const map: Record<string, Owned> = {};
      for (const row of inv ?? []) {
        const id = row.cat_id as string;
        if (!map[id]) {
          map[id] = { cat_id: id, count: 1, latest_acquired_at: row.acquired_at as string };
        } else {
          map[id].count += 1;
          if ((row.acquired_at as string) > map[id].latest_acquired_at) {
            map[id].latest_acquired_at = row.acquired_at as string;
          }
        }
      }
      setOwnedMap(map);

      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cats.filter((c) => {
      const byQ = !q || c.name.toLowerCase().includes(q);
      const byR = rarity === "all" || c.rarity === rarity;
      return byQ && byR;
    });
  }, [cats, query, rarity]);

  const ownedCount = useMemo(() => {
    return Object.values(ownedMap).reduce((acc, o) => acc + o.count, 0);
  }, [ownedMap]);

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative overflow-hidden">
      {/* soft background */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="absolute -bottom-52 right-0 h-[560px] w-[560px] rounded-full bg-fuchsia-500/10 blur-[90px]" />

      <div className="relative px-5 pt-5 max-w-md mx-auto">
        {/* header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-3xl font-black tracking-tight">Collezione</div>
            <div className="text-sm text-white/60 mt-2">
              Carte totali: <span className="text-white/85 font-bold">{ownedCount}</span>
            </div>
          </div>

          <div className="rounded-2xl px-3 py-2 bg-white/6 border border-white/10 backdrop-blur-2xl">
            <div className="text-[11px] text-white/60 font-semibold">Owned</div>
            <div className="font-black text-lg">{Object.keys(ownedMap).length}</div>
          </div>
        </div>

        {/* search */}
        <div className="mt-5 rounded-2xl bg-white/6 border border-white/10 backdrop-blur-2xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un gatto..."
            className="w-full bg-transparent px-4 py-3 outline-none text-white placeholder:text-white/35"
          />
        </div>

        {/* rarity pills */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["all", "common", "rare", "epic", "legendary", "mythic"] as Rarity[]).map((r) => {
            const active = rarity === r;
            return (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-extrabold border ${
                  active ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {rarityPill(r)}
              </button>
            );
          })}
        </div>

        {/* grid */}
        <div className="mt-5">
          {loading ? (
            <div className="text-white/70">Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div className="text-white/60">Nessun risultato.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((c) => {
                const owned = ownedMap[c.id];
                const has = !!owned;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected({ ...c, owned })}
                    className="text-left"
                  >
                    <div className={`rounded-[22px] p-[2px] bg-gradient-to-br ${rarityAccent(c.rarity)}`}>
                      <div className="rounded-[22px] bg-black/70 border border-white/10 overflow-hidden">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/6 to-transparent" />
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className={`h-40 w-full object-cover ${has ? "" : "opacity-25 grayscale"}`}
                          />

                          {has && (
                            <div className="absolute top-3 left-3 rounded-full bg-black/55 border border-white/10 px-2 py-1 text-[11px] font-black">
                              x{owned.count}
                            </div>
                          )}

                          <div className="absolute top-3 right-3 rounded-full bg-black/55 border border-white/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                            {c.rarity}
                          </div>
                        </div>

                        <div className="p-3">
                          <div className="font-black">{c.name}</div>
                          <div className="text-xs text-white/60 mt-1">
                            Valore: <span className="text-white/85 font-bold">{c.base_value}</span>
                          </div>

                          {!has && (
                            <div className="mt-2 text-[11px] text-white/45">
                              Non trovata
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full max-w-md rounded-t-[28px] bg-black/80 border border-white/10 p-5"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-black text-xl">{selected.name}</div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full px-3 py-2 bg-white/6 border border-white/10 text-sm font-black"
                >
                  Chiudi
                </button>
              </div>

              <div className="mt-4 rounded-[22px] overflow-hidden border border-white/10">
                <img src={selected.image_url} alt={selected.name} className="w-full h-64 object-cover" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/6 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 font-semibold">Rarità</div>
                  <div className="font-black mt-1">{selected.rarity}</div>
                </div>
                <div className="rounded-2xl bg-white/6 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 font-semibold">Valore</div>
                  <div className="font-black mt-1">{selected.base_value}</div>
                </div>
                <div className="rounded-2xl bg-white/6 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 font-semibold">Possedute</div>
                  <div className="font-black mt-1">{selected.owned?.count ?? 0}</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-white/55">
                Tip: più duplicati = più valuta nel futuro marketplace.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
