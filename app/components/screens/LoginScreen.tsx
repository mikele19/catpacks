"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Switch tra Login e Registrazione
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // REGISTRAZIONE
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Registrazione effettuata! Controlla la mail o fai login.");
      } else {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-black relative z-50">
      
      {/* Logo */}
      <img src="/ui/logo.png" alt="Logo" className="w-64 mb-8 drop-shadow-xl animate-float" />

      <div className="sticker bg-white/90 backdrop-blur-md p-8 w-full max-w-sm shadow-2xl rounded-3xl">
        <h2 className="text-2xl font-black text-center mb-6">
          {isSignUp ? "Crea Account" : "Bentornato!"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-black rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1 ml-1 opacity-50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-100 border-2 border-transparent focus:border-black rounded-xl px-4 py-3 font-bold outline-none transition"
              placeholder="mario@esempio.com"
            />
          </div>
          
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1 ml-1 opacity-50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-100 border-2 border-transparent focus:border-black rounded-xl px-4 py-3 font-bold outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full mt-4 bg-yellow-400 border-[3px] border-black text-black font-black text-lg py-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition disabled:opacity-50"
          >
            {loading ? "Caricamento..." : isSignUp ? "Registrati" : "Entra"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-black text-black/40 underline hover:text-black transition"
          >
            {isSignUp ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}