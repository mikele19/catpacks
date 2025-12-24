"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se già loggato -> vai home
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/");
    });
  }, [router]);

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) setError(error.message);
    else alert("Registrazione completata! Controlla la mail (se richiesta).");

    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    else router.push("/");

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-white/5 p-5">
        <h1 className="text-2xl font-extrabold">CatPacks</h1>
        <p className="text-sm opacity-70 mt-1">Login / Registrazione</p>

        <div className="mt-4 grid gap-3">
          <input
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-red-300 font-bold">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="rounded-xl bg-blue-500 px-4 py-3 font-extrabold disabled:opacity-40"
          >
            Login
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="rounded-xl border border-white/20 px-4 py-3 font-extrabold disabled:opacity-40"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
