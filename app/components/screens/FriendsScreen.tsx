"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FriendsScreen() {
  const [friends, setFriends] = useState<any[]>([]);
  const [myId, setMyId] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    // 1. Prendi gli ID degli amici
    const { data: relations } = await supabase
      .from("user_friends")
      .select("friend_id")
      .eq("user_id", user.id);

    const friendIds = relations?.map(r => r.friend_id) || [];

    if (friendIds.length > 0) {
      // 2. Prendi i dettagli (email, livello) degli amici
      const { data: profiles } = await supabase
        .from("users_profile")
        .select("user_id, email, level, xp")
        .in("user_id", friendIds);
      
      // Recuperiamo le email vere da auth se possibile, o usiamo users_profile se le abbiamo salvate lì.
      // Nota: users_profile di solito non ha l'email per privacy default di Supabase, 
      // ma nel tuo ProfileScreen vedo che la passi. Se nel DB non c'è, mostreremo l'ID accorciato.
      setFriends(profiles || []);
    }
    setLoading(false);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?invite=${myId}`;
    navigator.clipboard.writeText(link);
    alert("Link copiato! Invialo a un amico.");
  };

  const addFriend = async (idToAdd: string) => {
    if (!idToAdd) return;
    setAdding(true);
    
    // Recupera token
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/add-friend", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ friendId: idToAdd })
    });

    const json = await res.json();
    setAdding(false);

    if (json.success) {
      alert("Amico aggiunto!");
      setInputCode("");
      loadFriends(); // Ricarica la lista
    } else {
      alert("Errore: " + json.error);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto text-black pb-32">
      <div className="px-5 pt-10 max-w-md mx-auto">
        <h1 className="text-4xl font-black mb-6 text-center drop-shadow-sm">Amici</h1>

        {/* BOX INVITO */}
        <div className="soft-ui bg-yellow-100 border-2 border-yellow-300 p-6 rounded-3xl mb-6 text-center">
            <div className="text-sm font-bold text-yellow-800 uppercase tracking-widest mb-2">Il tuo Codice Amico</div>
            <div className="bg-white/50 p-3 rounded-xl font-mono text-xs truncate select-all mb-3">
                {myId || "..."}
            </div>
            <button 
                onClick={copyInviteLink}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-black text-xs uppercase px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all w-full"
            >
                Copia Link Invito 🔗
            </button>
        </div>

        {/* BOX AGGIUNGI */}
        <div className="soft-ui bg-white/90 p-6 rounded-3xl mb-8">
            <h3 className="font-black text-lg mb-4">Aggiungi Amico</h3>
            <div className="flex gap-2">
                <input 
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Incolla codice qui..."
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:bg-white border-2 border-transparent focus:border-black/10 transition"
                />
                <button 
                    onClick={() => addFriend(inputCode)}
                    disabled={adding || !inputCode}
                    className="bg-black text-white font-black rounded-xl px-4 active:scale-95 disabled:opacity-50"
                >
                    {adding ? "..." : "+"}
                </button>
            </div>
        </div>

        {/* LISTA AMICI */}
        <h3 className="font-black text-xl mb-4 px-2">I tuoi amici ({friends.length})</h3>
        
        {loading ? (
            <div className="text-center text-gray-400 font-bold">Caricamento...</div>
        ) : friends.length === 0 ? (
            <div className="text-center py-10 opacity-50">
                <div className="text-4xl mb-2">😢</div>
                <div className="font-bold">Ancora nessun amico</div>
                <div className="text-xs">Invia il tuo link a qualcuno!</div>
            </div>
        ) : (
            <div className="space-y-3">
                {friends.map((f) => (
                    <div key={f.user_id} className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-gray-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-sm">
                            {f.level || 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* Se non abbiamo l'email salvata, mostriamo l'ID parziale */}
                            <div className="font-bold truncate text-sm">
                                {f.email || `Giocatore ${f.user_id.slice(0,6)}`}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">
                                {f.xp || 0} XP
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}