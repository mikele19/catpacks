"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CatResult = {
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  image_url: string;
};

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastCat, setLastCat] = useState<CatResult | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("users_profile")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (error) {
        await supabase.from("users_profile").upsert({
          user_id: user.id,
          credits: 0,
        });
        setCredits(0);
      } else {
        setCredits(data?.credits ?? 0);
      }

      setLoading(false);
    })();
  }, [router]);

  // ✅ 8.2/8.3: token per chiamare le API
  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return { Authorization: `Bearer ${token}` };
  };

  // ✅ claim giornaliero
  const claimDaily = async () => {
    setBusy(true);
    setMsg("");
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/claim-daily", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore claim");

      setCredits(json.credits);
      setMsg(json.message || "Crediti aggiunti!");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ✅ apri pacchetto
  const openPack = async () => {
    setBusy(true);
    setMsg("");
    setLastCat(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/open-pack", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore apertura pacchetto");

      setCredits(json.credits);
      setLastCat(json.cat);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs opacity-70">Loggato come</div>
          <div className="font-bold">{email}</div>
        </div>
        <button
          onClick={logout}
          className="rounded-xl border border-white/20 px-3 py-2 text-sm"
        >
          Logout
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 p-4">
        <div className="text-xs opacity-70">Crediti</div>
        <div className="text-4xl font-extrabold leading-none">{credits}</div>
        <div className="mt-2 text-xs opacity-70">
          Daily claim: +20 • Pack: -10
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          disabled={busy}
          onClick={claimDaily}
          className="rounded-2xl bg-green-500 px-4 py-3 font-extrabold text-black disabled:opacity-40"
        >
          Riscatta crediti giornalieri (+20)
        </button>

        <button
          disabled={busy}
          onClick={openPack}
          className="rounded-2xl bg-blue-500 px-4 py-3 font-extrabold text-white disabled:opacity-40"
        >
          Apri pacchetto (10 crediti)
        </button>
      </div>

      {msg && <div className="mt-4 text-red-300 font-bold">{msg}</div>}

      {lastCat && (
        <div className="mt-4 rounded-2xl bg-white/5 p-4 flex items-center gap-4">
          <img
            src={lastCat.image_url}
            alt={lastCat.name}
            className="h-24 w-24 rounded-2xl"
          />
          <div>
            <div className="text-lg font-extrabold">{lastCat.name}</div>
            <div className="text-xs uppercase tracking-wider opacity-70">
              {lastCat.rarity}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
