"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";

export default function FriendsScreen() {
  const [friends, setFriends] = useState<any[]>([]);
  const [myCode, setMyCode] = useState("...");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // STATI PER IL POPUP AMICO
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendCats, setFriendCats] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. CARICA IL TUO CODICE AMICO
    const { data: myProfile } = await supabase
        .from("users_profile")
        .select("friend_code")
        .eq("user_id", user.id)
        .single();
    
    if (myProfile?.friend_code) {
        setMyCode(myProfile.friend_code);
    }

    // 2. Trova amici
    const { data: relations } = await supabase
      .from("user_friends")
      .select("friend_id")
      .eq("user_id", user.id);

    const friendIds = relations?.map(r => r.friend_id) || [];

    if (friendIds.length > 0) {
      // 3. Scarica profili amici
      const { data: profiles } = await supabase
        .from("users_profile")
        .select("user_id, email, level, xp")
        .in("user_id", friendIds);

      // 4. Unisci dati
      const friendsWithData = await Promise.all(friendIds.map(async (fid) => {
          const profile = profiles?.find(p => p.user_id === fid);
          
          const { count } = await supabase
              .from("user_cats")
              .select("*", { count: 'exact', head: true })
              .eq("user_id", fid);
          
          if (!profile) {
             return { user_id: fid, email: null, level: 1, xp: 0, cat_count: count || 0 };
          }
          return { ...profile, cat_count: count || 0 };
      }));
      
      setFriends(friendsWithData);
    } else {
      setFriends([]);
    }
    setLoading(false);
  };

  const openFriendCollection = async (friend: any) => {
    setSelectedFriend(friend);
    setLoadingCats(true);
    setFriendCats([]);

    try {
        const { data: inventory } = await supabase
            .from("user_cats")
            .select("cat_id")
            .eq("user_id", friend.user_id);

        if (inventory && inventory.length > 0) {
            const counts: Record<string, number> = {};
            inventory.forEach((item: any) => {
                counts[item.cat_id] = (counts[item.cat_id] || 0) + 1;
            });

            const catIds = Object.keys(counts);
            const { data: catalog } = await supabase
                .from("cats_catalog")
                .select("*")
                .in("id", catIds);
            
            const merged = catalog?.map(cat => ({
                ...cat,
                count: counts[cat.id]
            })).sort((a, b) => b.base_value - a.base_value);

            setFriendCats(merged || []);
        }
    } catch (e) {
        console.error("Errore collezione", e);
    } finally {
        setLoadingCats(false);
    }
  };

  const removeFriend = async () => {
    if (!selectedFriend) return;
    const confirmDelete = window.confirm(`Rimuovere ${selectedFriend.email?.split('@')[0]}?`);
    if (!confirmDelete) return;

    setRemoving(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    try {
        const res = await fetch("/api/remove-friend", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ friendId: selectedFriend.user_id })
        });
        const json = await res.json();
        if (json.success) {
            alert("Amico rimosso.");
            setSelectedFriend(null);
            loadFriends();
        } else {
            alert("Errore: " + json.error);
        }
    } catch (err: any) {
        alert("Errore tecnico: " + err.message);
    } finally {
        setRemoving(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(myCode);
    alert(`Codice ${myCode} copiato!`);
  };

  const addFriend = async () => {
    if (!inputCode) return;
    setAdding(true);

    let codeClean = inputCode.trim();
    if (codeClean.includes("invite=")) {
        codeClean = codeClean.split("invite=")[1];
    }
    
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/add-friend", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ friendCode: codeClean })
    });

    const json = await res.json();
    setAdding(false);

    if (json.success) {
      alert("Amico aggiunto!");
      setInputCode("");
      loadFriends(); 
    } else {
      alert("Errore: " + json.error);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto text-black pb-32">
      <div className="px-5 pt-8 max-w-md mx-auto"> 
        <h1 className="text-4xl font-black mb-4 text-center drop-shadow-sm">Amici</h1> 

        {/* BOX CODICE AMICO */}
        <div className="soft-ui bg-yellow-100 border-2 border-yellow-300 p-4 rounded-3xl mb-4 text-center relative overflow-hidden">
            <div className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-1">Il tuo Codice</div> 
            <div className="text-3xl font-black text-yellow-900 tracking-widest mb-3 font-mono">
                {myCode}
            </div>
            <button 
                onClick={copyInviteLink}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-black text-xs uppercase px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all w-full"
            >
                Copia Codice 📋
            </button>
        </div>

        {/* BOX AGGIUNGI AMICO - CORRETTO */}
        <div className="soft-ui bg-white/90 p-3 rounded-3xl mb-6">
            <h3 className="font-black text-sm mb-2 px-1">Aggiungi Amico</h3>
            <div className="flex gap-2 items-center w-full">
                {/* Input che si adatta ma non esplode */}
                <input 
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Esempio: 123-456"
                    className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-3 font-bold text-sm text-center uppercase tracking-wider outline-none focus:bg-white border-2 border-transparent focus:border-black/10 transition placeholder:normal-case placeholder:text-gray-400"
                />
                
                {/* Tasto + fisso e quadrato */}
                <button 
                    onClick={addFriend}
                    disabled={adding || !inputCode}
                    className="w-12 h-12 shrink-0 bg-black text-white font-black rounded-xl flex items-center justify-center text-xl active:scale-95 disabled:opacity-50"
                >
                    {adding ? "..." : "+"}
                </button>
            </div>
        </div>

        {/* LISTA AMICI */}
        <h3 className="font-black text-xl mb-3 px-2">I tuoi amici ({friends.length})</h3> 
        
        {loading ? (
            <div className="text-center text-gray-400 font-bold">Caricamento...</div>
        ) : friends.length === 0 ? (
            <div className="text-center py-8 opacity-50"> 
                <div className="text-4xl mb-2">😢</div>
                <div className="font-bold">Ancora nessun amico</div>
                <div className="text-xs">Scambia il codice con qualcuno!</div>
            </div>
        ) : (
            <div className="space-y-2.5">
                {friends.map((f) => (
                    <button 
                        key={f.user_id} 
                        onClick={() => openFriendCollection(f)}
                        className="w-full bg-white py-3 px-4 rounded-2xl shadow-sm border-b-4 border-gray-100 flex items-center gap-4 active:scale-95 transition-transform text-left group"
                    >
                        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-white shadow-md border-2 border-white transition-transform group-hover:scale-110 ${f.email ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 'bg-gray-300'}`}>
                            <span className="text-[8px] font-bold uppercase opacity-80 leading-none">LVL</span>
                            <span className="text-lg font-black leading-none">{f.level || "?"}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className={`font-black truncate text-base ${f.email ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                                {f.email ? f.email.split('@')[0] : "Utente Sconosciuto"}
                            </div>
                            <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded-md">XP {f.xp || 0}</span>
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-md">🐱 {f.cat_count} Gatti</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* --- POPUP COLLEZIONE AMICO --- */}
      <AnimatePresence>
        {selectedFriend && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
                onClick={() => setSelectedFriend(null)}
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    className="bg-white w-full max-w-sm max-h-[80vh] rounded-[40px] p-6 relative flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center mb-4">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Collezione di</div>
                        <h3 className="text-2xl font-black truncate">
                            {selectedFriend.email ? selectedFriend.email.split('@')[0] : "Sconosciuto"}
                        </h3>
                    </div>

                    <button 
                        onClick={() => setSelectedFriend(null)}
                        className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 transition-colors"
                    >
                        ✕
                    </button>

                    <div className="flex-1 overflow-y-auto no-scrollbar soft-ui-inner bg-gray-50 rounded-2xl p-2 mb-4">
                        {loadingCats ? (
                            <div className="flex items-center justify-center h-40 font-bold text-gray-400">Caricamento...</div>
                        ) : friendCats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                <div className="text-2xl mb-2">📦</div>
                                <div className="font-bold text-xs">Inventario vuoto</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {friendCats.map((cat) => (
                                    <div key={cat.id} className="aspect-square bg-white rounded-xl p-1 shadow-sm border border-gray-100 relative">
                                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-contain" />
                                        {cat.count > 1 && (
                                            <div className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                                x{cat.count}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={removeFriend}
                        disabled={removing}
                        className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-transparent hover:border-red-200"
                    >
                        {removing ? "Rimozione..." : "🗑️ Rimuovi Amico"}
                    </button>

                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}