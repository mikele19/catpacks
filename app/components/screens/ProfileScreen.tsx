"use client";

export default function ProfileScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-5 pt-5 max-w-md mx-auto">
        <h1 className="text-3xl font-black">Profilo</h1>
        <p className="text-white/60 mt-2">Avatar, stats, logout.</p>
      </div>
    </div>
  );
}
