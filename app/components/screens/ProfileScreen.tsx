"use client";

export default function ProfileScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  return (
    // MODIFICA: Rimosso bg-black, messo text-black
    <div className="min-h-screen text-black pb-28">
      <div className="px-5 pt-10 max-w-md mx-auto">
        
        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm mb-6">Profilo</h1>
        
        <div className="sticker bg-white/80 p-6 shadow-sm rounded-3xl backdrop-blur-sm">
            <div className="text-xl font-black mb-2">Statistiche Giocatore</div>
            <p className="text-black/60 font-medium">Qui presto vedrai le tue statistiche, livello e collezione completa.</p>
        </div>

        <div className="mt-4 sticker bg-white/80 p-6 shadow-sm rounded-3xl backdrop-blur-sm">
            <div className="text-xl font-black mb-2">Impostazioni</div>
            <button className="text-red-500 font-black text-sm uppercase tracking-wider">Logout</button>
        </div>

      </div>
    </div>
  );
}