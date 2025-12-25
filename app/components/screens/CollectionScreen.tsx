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

function rarityOutline(r: Exclude<Rarity, "all">) {
  switch (r) {
    case "common":
      return "border-white/18";
    case "rare":
      return "border-blue-300/30";
    case "epic":
      return "border-purple-300/30";
    case "legendary":
      return "border-yellow-200/35";
    case "mythic":
      return "border-fuchsia-200/35";
  }
}

export default function CollectionScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [ownedMap, setOwnedMap] = useState<Record<string, Owned>>({});
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity>("all");
  const [selected, setSelected] = useState<(Cat & { owned?: Owned }) | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

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

  const ownedCount = useMemo(() => Object.values(ownedMap).reduce((acc, o) => acc + o.count, 0), [ownedMap]);

  return (
    <div className="min-h-screen text-white pb-28">
      <div className="px-5 pt-5 max-w-md mx-auto">
        {/* header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-3xl font-black sketch-title">Collezione</div>
            <div className="text-sm text-white/60 mt-2">
              Totale carte: <span className="font-black text-white/80">{ownedCount}</span>
            </div>
          </div>

          <div className="sketch-chip px-3 py-2">
            <div className="text-[11px] text-white/60 font-semibold">Uniche</div>
            <div className="font-black text-lg">{Object.keys(ownedMap).length}</div>
          </div>
        </div>

        {/* search (no blur) */}
        <div className="mt-5 sketch-card p-0 overflow-hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un gatto..."
            className="w-full bg-transparent px-4 py-3 outline-none text-white placeholder:text-white/35"
          />
        </div>

        {/* rarity pills (sketch) */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["all", "common", "rare", "epic", "legendary", "mythic"] as Rarity[]).map((r) => {
            const active = rarity === r;
            return (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className={`shrink-0 px-4 py-2 text-[12px] font-extrabold border-2 rounded-full ${
                  active ? "border-white/25 bg-white/10 text-white" : "border-white/12 bg-white/5 text-white/70"
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
                  <button key={c.id} onClick={() => setSelected({ ...c, owned })} className="text-left">
                    <div className={`sketch-card overflow-hidden border-2 ${rarityOutline(c.rarity)}`}>
                      <div className="relative">
                        <img
                          src={c.image_url}
                          alt={c.name}
                          loading="lazy"
                          decoding="async"
                          className={`h-40 w-full object-cover ${has ? "" : "opacity-25 grayscale"}`}
                        />

                        {has && (
                          <div className="absolute top-3 left-3 border-2 border-white/15 bg-black/60 rounded-full px-2 py-1 text-[11px] font-black">
                            x{owned.count}
                          </div>
                        )}

                        <div className="absolute top-3 right-3 border-2 border-white/15 bg-black/60 rounded-full px-2 py-1 text-[10px] font-extrabold tracking-wider text-white/80">
                          {c.rarity.toUpperCase()}
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="font-black">{c.name}</div>
                        <div className="text-xs text-white/60 mt-1">
                          Valore: <span className="text-white/80 font-black">{c.base_value}</span>
                        </div>

                        {!has && <div className="mt-2 text-[11px] text-white/45">Non trovata</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal (lightweight) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full max-w-md rounded-t-[28px] border-2 border-white/12 bg-black/85 p-5"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-black text-xl">{selected.name}</div>
                <button onClick={() => setSelected(null)} className="sketch-btn px-4 py-2 font-black">
                  Chiudi
                </button>
              </div>

              <div className={`mt-4 sketch-card overflow-hidden border-2 ${rarityOutline(selected.rarity)}`}>
                <img
                  src={selected.image_url}
                  alt={selected.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-64 object-cover"
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="sketch-chip p-3">
                  <div className="text-[11px] text-white/60 font-semibold">Rarità</div>
                  <div className="font-black mt-1">{selected.rarity}</div>
                </div>
                <div className="sketch-chip p-3">
                  <div className="text-[11px] text-white/60 font-semibold">Valore</div>
                  <div className="font-black mt-1">{selected.base_value}</div>
                </div>
                <div className="sketch-chip p-3">
                  <div className="text-[11px] text-white/60 font-semibold">Possedute</div>
                  <div className="font-black mt-1">{selected.owned?.count ?? 0}</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-white/55">
                UI sketch = zero blur = più fluida su telefono.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
