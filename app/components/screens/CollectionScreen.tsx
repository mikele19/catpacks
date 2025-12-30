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
  row_ids: string[];
};

function rarityGradient(r: Exclude<Rarity, "all">) {
  switch (r) {
    case "common": return "from-slate-400 to-slate-500";
    case "rare": return "from-blue-400 to-blue-600";
    case "epic": return "from-purple-500 to-purple-700";
    case "legendary": return "from-yellow-400 to-orange-500";
    case "mythic": return "from-pink-500 via-red-500 to-yellow-500";
  }
}

// Punteggio per l'ordinamento (più alto = più in alto nella lista)
const RARITY_SCORE: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5
};

export default function CollectionScreen({ 
  isActive, 
  setCredits 
}: { 
  isActive?: boolean;
  setCredits?: (val: number | ((prev: number) => number)) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [ownedMap, setOwnedMap] = useState<Record<string, Owned>>({});
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity>("all");
  
  const [selected, setSelected] = useState<(Cat & { owned?: Owned }) | null>(null);
  const [isSelling, setIsSelling] = useState(false);

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // 1. Catalogo
    const { data: catalog } = await supabase
      .from("cats_catalog")
      .select("*");

    // 2. Inventario
    const { data: inv } = await supabase
      .from("user_cats")
      .select("id, cat_id")
      .eq("user_id", userData.user.id);

    const map: Record<string, Owned> = {};
    for (const row of inv ?? []) {
      map[row.cat_id] ??= { cat_id: row.cat_id, count: 0, row_ids: [] };
      map[row.cat_id].count++;
      map[row.cat_id].row_ids.push(row.id);
    }

    setCats((catalog ?? []) as Cat[]);
    setOwnedMap(map);
    setLoading(false);
  };

  useEffect(() => {
    if (isActive) fetchData();
  }, [isActive]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSell = async () => {
    if (!selected || !selected.owned || selected.owned.count <= 0 || isSelling) return;
    setIsSelling(true);

    try {
      const rowIdToDelete = selected.owned.row_ids[selected.owned.row_ids.length - 1];
      const sellPrice = selected.base_value;

      const { error, count } = await supabase
        .from("user_cats")
        .delete({ count: 'exact' })
        .eq("id", rowIdToDelete);

      if (error) throw error;
      if (count === 0) throw new Error("Errore: Il gatto non è stato cancellato dal database.");

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         const { data: profile } = await supabase.from("users_profile").select("credits").eq("user_id", user.id).single();
         const newCredits = (profile?.credits || 0) + sellPrice;
         await supabase.from("users_profile").update({ credits: newCredits }).eq("user_id", user.id);
         if (setCredits) setCredits(newCredits);
      }

      const newOwnedMap = { ...ownedMap };
      const currentOwned = newOwnedMap[selected.id];
      
      if (currentOwned) {
        currentOwned.count--;
        currentOwned.row_ids.pop();
        if (currentOwned.count === 0) {
           delete newOwnedMap[selected.id];
           setSelected(null);
        } else {
           setSelected({ ...selected, owned: { ...currentOwned } }); 
        }
      }
      setOwnedMap(newOwnedMap);

    } catch (err) {
      console.error("Errore vendita:", err);
      alert("Impossibile vendere il gatto.");
      fetchData();
    } finally {
      setIsSelling(false);
    }
  };

  // --- LOGICA DI ORDINAMENTO AGGIORNATA ---
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    
    // 1. Filtra
    let list = cats.filter(c => 
      (!q || c.name.toLowerCase().includes(q)) && 
      (rarity === "all" || c.rarity === rarity)
    );

    // 2. Ordina
    list.sort((a, b) => {
      // A. Controlla Rarità (DECRESCENTE: Mitici prima, Comuni dopo)
      const scoreA = RARITY_SCORE[a.rarity] || 0;
      const scoreB = RARITY_SCORE[b.rarity] || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // <--- MODIFICA QUI (B - A = Decrescente)
      }

      // B. A parità di rarità, metti prima quelli POSSEDUTI
      const ownedA = ownedMap[a.id] ? 1 : 0;
      const ownedB = ownedMap[b.id] ? 1 : 0;

      if (ownedA !== ownedB) {
        return ownedB - ownedA; // 1 (Posseduto) prima di 0 (Non posseduto)
      }

      // C. Ordine alfabetico
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [cats, query, rarity, ownedMap]);

  return (
    <div className="h-full w-full overflow-y-auto text-black">
      <div className="max-w-md mx-auto px-5 pt-10 pb-32">

        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm text-center mb-6">Collezione</h1>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca un gatto…"
          className="w-full rounded-xl bg-white/80 border-2 border-white px-4 py-3 font-bold outline-none placeholder:text-gray-400 shadow-sm focus:bg-white transition"
        />

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(["all", "common", "rare", "epic", "legendary", "mythic"] as Rarity[]).map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border-2
                ${rarity === r
                  ? "bg-black text-white border-black scale-105 shadow-md"
                  : "bg-white/50 text-gray-500 border-transparent hover:bg-white"}
              `}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {loading ? (
            <div className="font-black text-black/50 col-span-2 text-center py-10">Caricamento gatti...</div>
          ) : (
            filtered.map((c) => {
              const owned = ownedMap[c.id];
              return (
                <button 
                  key={c.id} 
                  onClick={() => owned ? setSelected({ ...c, owned }) : null}
                  className={`relative transition-transform ${!owned ? 'opacity-70 grayscale' : 'active:scale-95'}`}
                >
                  <div className={`rounded-3xl p-[4px] shadow-sm bg-gradient-to-br ${rarityGradient(c.rarity)}`}>
                    <div className="rounded-[20px] bg-white overflow-hidden relative h-full">
                      <div className="relative h-36 w-full bg-gray-50 flex items-center justify-center">
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className={`h-28 w-28 object-contain transition-all duration-500 drop-shadow-md
                            ${owned ? "scale-100 blur-0" : "scale-90 blur-[6px] opacity-50"}
                          `}
                        />
                        {!owned && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 opacity-60">
                            <span className="text-3xl">🔒</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white text-center relative z-20">
                        <div className={`font-black leading-tight truncate text-sm uppercase ${!owned ? "text-gray-400" : "text-gray-800"}`}>
                          {owned ? c.name : "???"}
                        </div>
                        {owned && owned.count > 0 && (
                           <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="bg-white w-full max-w-sm rounded-[40px] p-6 relative flex flex-col items-center shadow-2xl"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              
              <button 
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 transition-colors z-20"
              >
                ✕
              </button>

              <div className="mt-6 mb-4 relative w-full flex justify-center">
                 <div className={`absolute inset-0 blur-3xl opacity-30 bg-gradient-to-tr ${rarityGradient(selected.rarity)} rounded-full transform scale-75`}></div>
                 <img src={selected.image_url} alt={selected.name} className="w-40 h-40 object-contain relative z-10 drop-shadow-xl" />
              </div>

              <h3 className="text-2xl font-black text-gray-900 uppercase">{selected.name}</h3>
              
              <div className="flex items-center justify-center gap-2 mt-2 mb-6">
                  <div className="px-3 py-1 rounded-lg border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-400">
                    {selected.rarity}
                  </div>
              </div>

              <button
                onClick={handleSell}
                disabled={isSelling}
                className="w-full py-4 rounded-2xl bg-green-100 border-b-4 border-green-500 active:border-b-0 active:translate-y-1 text-green-800 font-black text-lg flex items-center justify-center gap-2 transition-all hover:bg-green-200 disabled:opacity-50 disabled:grayscale"
              >
                {isSelling ? "VENDITA..." : (
                    <>
                      <span>VENDI PER</span>
                      <div className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-lg border border-green-200">
                         <img src="/ui/coin.png" className="w-5 h-5 object-contain" />
                         <span>{selected.base_value}</span>
                      </div>
                    </>
                )}
              </button>
              
              <p className="text-center text-[9px] font-bold text-gray-300 mt-3 uppercase tracking-wider">
                Non rimborsabile
              </p>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}