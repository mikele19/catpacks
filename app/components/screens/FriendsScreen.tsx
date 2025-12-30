"use client";

export default function FriendsScreen() {
  return (
    <div className="h-full w-full overflow-y-auto text-black">
      <div className="px-5 pt-10 pb-32 max-w-md mx-auto">
        
        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm mb-6 text-center">Amici</h1>
        
        {/* Placeholder Contenuto */}
        <div className="sticker bg-white/90 p-8 shadow-sm rounded-3xl backdrop-blur-sm text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl font-black mb-2">Lavori in corso</h2>
            <p className="text-sm font-bold text-black/50">
                Presto potrai aggiungere amici e scambiare gatti!
            </p>
        </div>

      </div>
    </div>
  );
}