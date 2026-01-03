"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";

export default function FriendsScreen() {
  const [friends, setFriends] = useState<any[]>([]);
  const [myCode, setMyCode] = useState("...");
  const [myId, setMyId] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  const [mounted, setMounted] = useState(false);

  // --- STATI COLLEZIONE ---
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendCats, setFriendCats] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [removing, setRemoving] = useState(false);

  // --- STATI CHAT ---
  const [chatFriend, setChatFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadFriends();
  }, []);

  // Scroll automatico in basso
  useEffect(() => {
    if (chatFriend) {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  }, [messages, chatFriend]);

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    const { data: myProfile } = await supabase.from("users_profile").select("friend_code").eq("user_id", user.id).single();
    if (myProfile?.friend_code) setMyCode(myProfile.friend_code);

    const { data: relations } = await supabase.from("user_friends").select("friend_id").eq("user_id", user.id);
    const friendIds = relations?.map(r => r.friend_id) || [];

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase.from("users_profile").select("user_id, email, level, xp").in("user_id", friendIds);
      const friendsWithData = await Promise.all(friendIds.map(async (fid) => {
          const profile = profiles?.find(p => p.user_id === fid);
          const { count } = await supabase.from("user_cats").select("*", { count: 'exact', head: true }).eq("user_id", fid);
          if (!profile) return { user_id: fid, email: null, level: 1, xp: 0, cat_count: count || 0 };
          return { ...profile, cat_count: count || 0 };
      }));
      setFriends(friendsWithData);
    } else {
      setFriends([]);
    }
    setLoading(false);
  };

  const openChat = async (friend: any) => {
    setChatFriend(friend);
    setMessages([]);

    const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${friend.user_id}),and(sender_id.eq.${friend.user_id},receiver_id.eq.${myId})`)
        .order("created_at", { ascending: true });
    
    if (data) setMessages(data);

    const channel = supabase
      .channel('chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${myId}` },
        (payload) => {
           if (payload.new.sender_id === friend.user_id) {
               setMessages((prev) => [...prev, payload.new]);
           }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatFriend) return;
    const msg = newMessage.trim();
    setNewMessage("");

    const optimisticMsg = {
        id: Date.now(),
        sender_id: myId,
        receiver_id: chatFriend.user_id,
        content: msg,
        created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    await supabase.from("direct_messages").insert({
        sender_id: myId,
        receiver_id: chatFriend.user_id,
        content: msg
    });
  };

  const openFriendCollection = async (friend: any) => {
    setSelectedFriend(friend);
    setLoadingCats(true);
    setFriendCats([]);
    try {
        const { data: inventory } = await supabase.from("user_cats").select("cat_id").eq("user_id", friend.user_id);
        if (inventory && inventory.length > 0) {
            const counts: Record<string, number> = {};
            inventory.forEach((item: any) => { counts[item.cat_id] = (counts[item.cat_id] || 0) + 1; });
            const catIds = Object.keys(counts);
            const { data: catalog } = await supabase.from("cats_catalog").select("*").in("id", catIds);
            const merged = catalog?.map(cat => ({ ...cat, count: counts[cat.id] })).sort((a, b) => b.base_value - a.base_value);
            setFriendCats(merged || []);
        }
    } catch (e) { console.error(e); } finally { setLoadingCats(false); }
  };

  const removeFriend = async () => {
    if (!selectedFriend) return;
    if (!confirm(`Rimuovere ${selectedFriend.email?.split('@')[0]}?`)) return;
    setRemoving(true);
    const { data } = await supabase.auth.getSession();
    try {
        await fetch("/api/remove-friend", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${data.session?.access_token}` },
            body: JSON.stringify({ friendId: selectedFriend.user_id })
        });
        alert("Amico rimosso.");
        setSelectedFriend(null);
        loadFriends();
    } catch (err) { alert("Errore tecnico"); } finally { setRemoving(false); }
  };

  const addFriend = async () => {
    if (!inputCode) return;
    setAdding(true);
    let codeClean = inputCode.trim();
    if (codeClean.includes("invite=")) codeClean = codeClean.split("invite=")[1];
    
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/add-friend", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ friendCode: codeClean })
    });
    const json = await res.json();
    setAdding(false);
    if (json.success) { alert("Amico aggiunto!"); setInputCode(""); loadFriends(); } 
    else { alert("Errore: " + json.error); }
  };

  return (
    <>
    <div className="h-full w-full overflow-y-auto text-black pb-32">
      <div className="px-5 pt-8 max-w-md mx-auto">
        <h1 className="text-4xl font-black mb-4 text-center drop-shadow-sm">Amici</h1>

        <div className="soft-ui bg-yellow-100 border-2 border-yellow-300 p-4 rounded-3xl mb-4 text-center">
            <div className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-1">Il tuo Codice</div>
            <div className="text-3xl font-black text-yellow-900 tracking-widest mb-3 font-mono">{myCode}</div>
            <button onClick={() => navigator.clipboard.writeText(myCode)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-black text-xs uppercase px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all w-full">Copia Codice 📋</button>
        </div>

        <div className="soft-ui bg-white/90 p-3 rounded-3xl mb-6 flex gap-2 items-center">
            <input value={inputCode} onChange={(e) => setInputCode(e.target.value)} placeholder="123-456" className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-3 font-bold text-sm text-center uppercase tracking-wider outline-none border-2 border-transparent focus:border-black/10" />
            <button onClick={addFriend} disabled={adding || !inputCode} className="w-12 h-12 shrink-0 bg-black text-white font-black rounded-xl flex items-center justify-center text-xl active:scale-95 disabled:opacity-50">{adding ? "..." : "+"}</button>
        </div>

        <h3 className="font-black text-xl mb-3 px-2">I tuoi amici ({friends.length})</h3>
        
        {loading ? <div className="text-center font-bold text-gray-400">Caricamento...</div> : 
         friends.length === 0 ? <div className="text-center py-8 opacity-50 font-bold">Ancora nessun amico</div> : (
            <div className="space-y-2.5">
                {friends.map((f) => (
                    <div key={f.user_id} className="w-full bg-white py-3 px-4 rounded-2xl shadow-sm border-b-4 border-gray-100 flex items-center gap-3">
                        <div className={`w-10 h-10 shrink-0 rounded-full flex flex-col items-center justify-center text-white shadow-md border-2 border-white ${f.email ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 'bg-gray-300'}`}>
                            <span className="text-[6px] font-bold uppercase opacity-80 leading-none">LVL</span>
                            <span className="text-sm font-black leading-none">{f.level || "?"}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="font-black truncate text-sm">{f.email ? f.email.split('@')[0] : "Sconosciuto"}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{f.cat_count} Gatti</div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => openChat(f)} className="w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl flex items-center justify-center active:scale-90 transition shadow-sm border-b-2 border-blue-200">💬</button>
                            <button onClick={() => openFriendCollection(f)} className="w-10 h-10 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-xl flex items-center justify-center active:scale-90 transition shadow-sm border-b-2 border-yellow-200">🃏</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>

      {/* --- POPUP TELETRASPORTATI SU BODY (Coprono BottomNav) --- */}
      {mounted && createPortal(
        <>
            {/* POPUP COLLEZIONE */}
            <AnimatePresence>
                {selectedFriend && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={() => setSelectedFriend(null)}>
                        <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }} className="bg-white w-full max-w-sm max-h-[80vh] rounded-[40px] p-6 relative flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-4"><h3 className="text-xl font-black truncate">{selectedFriend.email?.split('@')[0]}</h3><p className="text-xs font-bold text-gray-400 uppercase">Collezione</p></div>
                            <button onClick={() => setSelectedFriend(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full font-bold text-gray-500">✕</button>
                            
                            <div className="flex-1 overflow-y-auto no-scrollbar soft-ui-inner bg-gray-50 rounded-2xl p-2 mb-4">
                                {loadingCats ? <div className="text-center py-10 font-bold text-gray-400">...</div> : 
                                friendCats.length === 0 ? <div className="text-center py-10 font-bold text-gray-400">Vuoto</div> : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {friendCats.map((cat) => (
                                            <div key={cat.id} className="aspect-square bg-white rounded-xl p-1 shadow-sm border border-gray-100 relative">
                                                <img src={cat.image_url} className="w-full h-full object-contain" />
                                                {cat.count > 1 && <div className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">x{cat.count}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={removeFriend} disabled={removing} className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 active:scale-95 transition-all border-2 border-transparent hover:border-red-200">{removing ? "..." : "🗑️ Rimuovi Amico"}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* POPUP CHAT */}
            <AnimatePresence>
                {chatFriend && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" 
                        onClick={() => setChatFriend(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 50 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.8, y: 50 }} 
                            // MODIFICA QUI: h-[80dvh] per adattarsi alla tastiera + max-h per sicurezza
                            className="bg-white w-full max-w-sm h-[80dvh] rounded-[40px] relative flex flex-col shadow-2xl overflow-hidden" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white px-4 py-4 border-b border-gray-100 z-10 text-center relative shrink-0">
                                <div className="font-black text-xl leading-none truncate px-8">{chatFriend.email?.split('@')[0]}</div>
                                <div className="text-xs font-bold text-green-500 uppercase tracking-wide">Online</div>
                                <button onClick={() => setChatFriend(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 transition-colors">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <div className="text-4xl mb-2">👋</div>
                                        <div className="text-xs font-bold">Saluta il tuo amico!</div>
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isMe = msg.sender_id === myId;
                                    return (
                                        <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm break-words ${isMe ? "bg-black text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none border border-gray-200"}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
                                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                                    {/* MODIFICA QUI: text-base per evitare zoom */}
                                    <input 
                                        value={newMessage} 
                                        onChange={(e) => setNewMessage(e.target.value)} 
                                        placeholder="Scrivi..." 
                                        className="flex-1 bg-gray-100 rounded-full px-5 py-3 font-bold text-base outline-none focus:bg-white border-2 border-transparent focus:border-black/10 transition" 
                                    />
                                    <button type="submit" disabled={!newMessage.trim()} className="w-11 h-11 bg-blue-500 text-white rounded-full flex items-center justify-center font-black text-lg shadow-lg active:scale-90 transition disabled:opacity-50 disabled:scale-100">➤</button>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}