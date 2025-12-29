import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const DROP_RATES = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 4,
  mythic: 1
};

function pickRarity() {
  const rand = Math.random() * 100;
  let sum = 0;
  if (rand < (sum += DROP_RATES.common)) return "common";
  if (rand < (sum += DROP_RATES.rare)) return "rare";
  if (rand < (sum += DROP_RATES.epic)) return "epic";
  if (rand < (sum += DROP_RATES.legendary)) return "legendary";
  return "mythic";
}

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log("--- RICHIESTA APERTURA ---");

  // 1. RECUPERA IL TOKEN DAL CLIENT (Con await per Next.js 15)
  const headersList = await headers(); // <--- AGGIUNTO AWAIT QUI
  const authHeader = headersList.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Manca il token di autorizzazione" }, { status: 401 });
  }

  // 2. CREA IL CLIENT SUPABASE CON IL TOKEN
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );

  // 3. VERIFICA UTENTE
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Errore Auth:", authError);
    return NextResponse.json({ error: "Login scaduto. Fai Logout e rientra." }, { status: 401 });
  }

  // 4. VERIFICA CREDITI
  const COST = 10;
  const { data: profile } = await supabase
    .from("users_profile")
    .select("credits")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.credits < COST) {
    return NextResponse.json({ error: `Hai solo ${profile?.credits || 0} monete!` }, { status: 400 });
  }

  // 5. PESCA GATTO
  const wonRarity = pickRarity();
  
  const { data: catsPool } = await supabase
    .from("cats_catalog")
    .select("*")
    .eq("rarity", wonRarity);

  // Fallback se catalogo vuoto
  let finalCat;
  if (!catsPool || catsPool.length === 0) {
    const { data: fallback } = await supabase.from("cats_catalog").select("*").eq("rarity", "common");
    if (!fallback || fallback.length === 0) return NextResponse.json({ error: "Catalogo vuoto!" }, { status: 500 });
    finalCat = fallback[0];
  } else {
    finalCat = catsPool[Math.floor(Math.random() * catsPool.length)];
  }

  // 6. TRANSAZIONE (Scala soldi + Dai gatto)
  await supabase.from("users_profile").update({ credits: profile.credits - COST }).eq("user_id", user.id);
  await supabase.from("user_cats").insert({ user_id: user.id, cat_id: finalCat.id });

  return NextResponse.json({
    success: true,
    credits: profile.credits - COST,
    cat: finalCat
  });
}