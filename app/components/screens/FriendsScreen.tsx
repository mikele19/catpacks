"use client";

export default function FriendsScreen() {
  return (
    <div className="h-full w-full overflow-y-auto text-black">
      <div className="px-5 pt-10 pb-32 max-w-md mx-auto text-center">
        <h1 className="text-4xl font-black mb-6 drop-shadow-sm">Amici</h1>
        
        <div className="soft-ui bg-white/90 p-8 rounded-[40px] backdrop-blur-sm">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl font-black mb-2 text-gray-800">Lavori in corso</h2>
            <p className="text-sm font-bold text-gray-400">
                Presto potrai aggiungere amici!
            </p>
        </div>
      </div>
    </div>
  );
}