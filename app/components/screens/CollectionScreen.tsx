"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";

type Rarity = "all" | "common" | "rare" | "epic" | "legendary" | "mythic";

type Cat = {
  id: string; // ID del tipo di gatto (es. "cat_01")
  name: string;
  rarity: Exclude<Rarity, "all">;
  image_url: string;
  base_value: number;
};

// Modifica: Ora teniamo traccia degli ID univoci delle righe nel DB per poterle cancellare
type Owned = {
  cat_id: string;
  count: number;
  row_ids: string[]; // Lista degli ID univoci nel database (per venderne uno specifico)
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

// Aggiungi setCredits alle props per aggiornare i soldi nella barra in alto
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
  
  // Gatto selezionato nel modale
  const [selected, setSelected] = useState<(Cat & { owned?: Owned }) | null>(null);
  
  // Stato per il caricamento della vendita
  const [isSelling, setIsSelling] = useState(false);

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // 1. Catalogo
    const { data: catalog } = await supabase
      .from("cats_catalog")
      .select("*")
      .order("base_value", { ascending: true });

    // 2. Inventario (Prendiamo anche l'ID della riga per poter cancellare)
    const { data: inv } = await supabase
      .from("user_cats")
      .select("id, cat_id") // <--- Importante: prendiamo l'ID univoco della riga
      .eq("user_id", userData.user.id);

    const map: Record<string, Owned> = {};
    for (const row of inv ?? []) {
      map[row.cat_id] ??= { cat_id: row.cat_id, count: 0, row_ids: [] };
      map[row.cat_id].count++;
      map[row.cat_id].row_ids.push(row.id); // Salviamo l'ID riga
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

  // --- FUNZIONE VENDITA ---
  const handleSell = async () => {
    if (!selected || !selected.owned || selected.owned.count <= 0 || isSelling) return;
    setIsSelling(true);

    try {
      // 1. Prendi un ID riga da cancellare (l'ultimo della lista)
      const rowIdToDelete = selected.owned.row_ids[selected.owned.row_ids.length - 1];
      const sellPrice = selected.base_value;

      // 2. Cancella dal DB
      const { error } = await supabase
        .from("user_cats")
        .delete()
        .eq("id", rowIdToDelete);

      if (error) throw error;

      // 3. Aggiungi soldi all'utente (DB)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         // Recupera crediti attuali prima di sommare (per sicurezza)
         const { data: profile } = await supabase.from("users_profile").select("credits").eq("user_id", user.id).single();
         const newCredits = (profile?.credits || 0) + sellPrice;
         
         await supabase.from("users_profile").update({ credits: newCredits }).eq("user_id", user.id);
         
         // 4. Aggiorna UI Locale (Credits in alto)
         if (setCredits) setCredits(newCredits);
      }

      // 5. Aggiorna Stato Locale (Rimuovi gatto dalla mappa)
      const newOwnedMap = { ...ownedMap };
      const currentOwned = newOwnedMap[selected.id];
      
      if (currentOwned) {
        currentOwned.count--;
        currentOwned.row_ids.pop();
        
        // Se finiscono, rimuovi l'oggetto o lascialo a 0
        if (currentOwned.count === 0) {
           delete newOwnedMap[selected.id];
           setSelected(null); // Chiudi modale se non ne hai più
        } else {
           // Aggiorna il modale con il nuovo conteggio
           setSelected({ ...selected, owned: { ...currentOwned } }); 
        }
      }
      setOwnedMap(newOwnedMap);

    } catch (err) {
      console.error("Errore vendita:", err);
      alert("Impossibile vendere il gatto.");
    } finally {
      setIsSelling(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return cats.filter(c => (!q || c.name.toLowerCase().includes(q)) && (rarity === "all" || c.rarity === rarity));
  }, [cats, query, rarity]);

  return (
    <div className="h-full w-full overflow-y-auto text-black">
      <div className="max-w-md mx-auto px-5 pt-10 pb-32">

        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm">Collezione</h1>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca un gatto…"
          className="mt-4 w-full rounded-xl bg-white/60 border border-black/10 px-4 py-3 font-bold outline-none placeholder:text-black/40 shadow-sm focus:bg-white transition"
        />

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
            <div className="font-black text-black/50 col-span-2 text-center py-10">Caricamento gatti...</div>
          ) : (
            filtered.map((c) => {
              const owned = ownedMap[c.id];
              return (
                <button 
                  key={c.id} 
                  onClick={() => owned ? setSelected({ ...c, owned }) : null}
                  className={`relative transition-transform ${!owned ? 'opacity-80' : 'active:scale-95'}`}
                >
                  <div className={`rounded-2xl p-[3px] shadow-sm bg-gradient-to-br ${rarityGradient(c.rarity)}`}>
                    <div className="rounded-2xl bg-white overflow-hidden relative h-full">
                      <div className="relative h-40 w-full bg-gray-50 overflow-hidden flex items-center justify-center">
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className={`h-full w-full object-contain transition-all duration-500
                            ${owned 
                              ? "scale-100 blur-0 grayscale-0 opacity-100" 
                              : "scale-110 blur-[8px] grayscale opacity-40"
                            }
                          `}
                        />
                        {!owned && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <span className="text-4xl drop-shadow-md">🔒</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white text-left relative z-20">
                        <div className={`font-black leading-tight truncate ${!owned ? "text-black/40" : ""}`}>
                          {owned ? c.name : "???"}
                        </div>
                        <div className="text-xs text-black/50 font-bold mt-1">Valore {c.base_value}</div>
                        {owned && owned.count > 0 && (
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

      {/* --- MODALE CENTRATO NUOVO --- */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
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
              
              {/* Tasto CHIUDI (X) */}
              <button 
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 transition-colors z-20"
              >
                ✕
              </button>

              {/* Contenuto Gatto */}
              <div className="mt-4 relative w-full flex justify-center mb-4">
                 {/* Aura colorata dietro */}
                 <div className={`absolute inset-0 blur-3xl opacity-20 bg-gradient-to-tr ${rarityGradient(selected.rarity)} rounded-full transform scale-75`}></div>
                 
                 <img 
                    src={selected.image_url} 
                    alt={selected.name} 
                    className="w-48 h-48 object-contain relative z-10 drop-shadow-xl" 
                 />
              </div>

              <div className="text-center w-full">
                <h3 className="text-3xl font-black text-gray-900 uppercase leading-none">{selected.name}</h3>
                
                <div className="flex items-center justify-center gap-2 mt-2">
                    <div className={`px-3 py-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-[0.2em] opacity-70 border-gray-400 text-gray-500`}>
                      {selected.rarity}
                    </div>
                    {selected.owned && selected.owned.count > 1 && (
                        <div className="bg-yellow-100 text-yellow-800 text-xs font-black px-2 py-1 rounded-md border border-yellow-300">
                             Posseduti: {selected.owned.count}
                        </div>
                    )}
                </div>
              </div>

              {/* BOTTONE VENDI */}
              <div className="w-full mt-8">
                 <button
                    onClick={handleSell}
                    disabled={isSelling}
                    className="w-full py-4 rounded-2xl bg-green-100 border-b-4 border-green-500 active:border-b-0 active:translate-y-1 text-green-800 font-black text-xl flex items-center justify-center gap-2 transition-all hover:bg-green-200 disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4"
                 >
                    {isSelling ? (
                        <span>VENDITA...</span>
                    ) : (
                        <>
                          <span>VENDI PER</span>
                          <div className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-lg border border-green-200">
                             <img src="/ui/coin.png" className="w-5 h-5 object-contain" />
                             <span>{selected.base_value}</span>
                          </div>
                        </>
                    )}
                 </button>
                 <p className="text-center text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                    L'azione è irreversibile
                 </p>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}