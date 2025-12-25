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

function rarityRing(r: Exclude<Rarity, "all">) {
  switch (r) {
    case "common":
      return "border-black/12";
    case "rare":
      return "border-blue-400/25";
    case "epic":
      return "border-purple-400/25";
    case "legendary":
      return "border-yellow-500/25";
    case "mythic":
      return "border-fuchsia-500/25";
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

  const ownedCount = useMemo(
    () => Object.values(ownedMap).reduce((acc, o) => acc + o.count, 0),
    [ownedMap]
  );

  return (
    <div className="min-h-screen text-black pb-28">
      <div className="px-5 pt-5 max-w-md mx-auto">
        {/* header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-4xl font-black leading-none tracking-tight">Collezione</div>
            <div className="text-sm muted font-black mt-2">
              carte <span className="text-black">{ownedCount}</span>
            </div>
          </div>

          <div className="sticker px-3 py-2">
            <div className="text-[11px] muted font-black">uniche</div>
            <div className="font-black text-lg">{Object.keys(ownedMap).length}</div>
          </div>
        </div>

        {/* search */}
        <div className="mt-5 sticker p-0 overflow-hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un gatto…"
            className="w-full bg-transparent px-4 py-3 outline-none text-black placeholder:text-black/35 font-black"
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
                className={`shrink-0 px-4 py-2 text-[12px] font-black border-2 rounded-full ${
                  active ? "border-black/25 bg-white/70" : "border-black/12 bg-white/45 text-black/70"
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
            <div className="text-black/60 font-black">Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div className="text-black/55 font-black">Nessun risultato.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((c) => {
                const owned = ownedMap[c.id];
                const has = !!owned;

                return (
                  <button key={c.id} onClick={() => setSelected({ ...c, owned })} className="text-left">
                    <div className={`sticker overflow-hidden border-2 ${rarityRing(c.rarity)}`}>
                      <div className="relative">
                        <img
                          src={c.image_url}
                          alt={c.name}
                          loading="lazy"
                          decoding="async"
                          className={`h-40 w-full object-cover ${has ? "" : "opacity-25 grayscale"}`}
                        />

                        {has && (
                          <div className="absolute top-3 left-3 sticker px-2 py-1 text-[11px] font-black">
                            x{owned.count}
                          </div>
                        )}

                        <div className="absolute top-3 right-3 sticker px-2 py-1 text-[10px] font-black tracking-wider text-black/70">
                          {c.rarity.toUpperCase()}
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="font-black">{c.name}</div>
                        <div className="text-xs muted font-black mt-1">
                          valore <span className="text-black">{c.base_value}</span>
                        </div>

                        {!has && <div className="mt-2 text-[11px] muted font-black">non trovata</div>}
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
            className="fixed inset-0 z-[100] bg-black/40 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full max-w-md rounded-t-[28px] border-2 border-black/12 bg-white/90 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.25)]"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-black text-xl">{selected.name}</div>
                <button onClick={() => setSelected(null)} className="sticker px-4 py-2 font-black">
                  chiudi
                </button>
              </div>

              <div className={`mt-4 sticker overflow-hidden border-2 ${rarityRing(selected.rarity)}`}>
                <img
                  src={selected.image_url}
                  alt={selected.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-64 object-cover"
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="sticker p-3">
                  <div className="text-[11px] muted font-black">rarità</div>
                  <div className="font-black mt-1">{selected.rarity}</div>
                </div>
                <div className="sticker p-3">
                  <div className="text-[11px] muted font-black">valore</div>
                  <div className="font-black mt-1">{selected.base_value}</div>
                </div>
                <div className="sticker p-3">
                  <div className="text-[11px] muted font-black">poss.</div>
                  <div className="font-black mt-1">{selected.owned?.count ?? 0}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
