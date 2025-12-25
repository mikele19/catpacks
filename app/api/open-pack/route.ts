import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PACK_COST = 10;

// Drop rates (somma 100)
const RATES: Array<{ rarity: "common" | "rare" | "epic" | "legendary" | "mythic"; weight: number }> = [
  { rarity: "common", weight: 70 },
  { rarity: "rare", weight: 20 },
  { rarity: "epic", weight: 8 },
  { rarity: "legendary", weight: 1.8 },
  { rarity: "mythic", weight: 0.2 },
];

function pickRarity() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const item of RATES) {
    acc += item.weight;
    if (r <= acc) return item.rarity;
  }
  return "common";
}

export async function POST(req: Request) {
  try {
    // 1) Auth token
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Token non valido" }, { status: 401 });
    }
    const userId = userRes.user.id;

    // 2) Leggi profilo credits
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("users_profile")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profilo non trovato" }, { status: 400 });
    }

    if ((profile.credits ?? 0) < PACK_COST) {
      return NextResponse.json({ error: "Crediti insufficienti" }, { status: 400 });
    }

    // 3) Pick rarity
    const rarity = pickRarity();

    // 4) Pesca un gatto dal catalogo nuovo
    const { data: cats, error: catsErr } = await supabaseAdmin
      .from("cats_catalog")
      .select("id,name,rarity,image_url,base_value")
      .eq("rarity", rarity);

    if (catsErr || !cats || cats.length === 0) {
      return NextResponse.json({ error: "Nessun gatto per questa rarità" }, { status: 500 });
    }

    const chosen = cats[Math.floor(Math.random() * cats.length)];

    // 5) Scala crediti
    const newCredits = (profile.credits ?? 0) - PACK_COST;

    const { error: updErr } = await supabaseAdmin
      .from("users_profile")
      .update({ credits: newCredits })
      .eq("user_id", userId);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // 6) Salva inventario utente (TABella corretta per la Collezione)
    const { error: invErr } = await supabaseAdmin.from("user_cats").insert({
      user_id: userId,
      cat_id: chosen.id,
    });

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

    // 7) (Opzionale) log aperture se vuoi in futuro
    // await supabaseAdmin.from("pack_open_logs").insert({ user_id: userId, cat_id: chosen.id, rarity });

    return NextResponse.json({
      credits: newCredits,
      cat: { name: chosen.name, rarity: chosen.rarity, image_url: chosen.image_url },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Errore server" }, { status: 500 });
  }
}
