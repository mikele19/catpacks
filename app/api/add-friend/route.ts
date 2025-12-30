import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { friendId } = body;

  console.log("--- RICHIESTA AMICIZIA ---");
  console.log("ID Ricevuto:", friendId);

  if (!friendId) return NextResponse.json({ error: "ID amico mancante" }, { status: 400 });

  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No Token" }, { status: 401 });

  // 1. Client Standard (per verificare chi sei TU)
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // 2. Client ADMIN (per SCRIVERE nel DB ignorando i blocchi RLS)
  // IMPORTANTE: Assicurati che SUPABASE_SERVICE_ROLE_KEY sia nel file .env.local
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("MANCA LA SERVICE ROLE KEY!");
    return NextResponse.json({ error: "Configurazione server errata" }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verifica chi sta facendo la richiesta
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.log("Utente richiedente:", user.id);

  if (user.id === friendId) {
    return NextResponse.json({ error: "Non puoi aggiungere te stesso!" }, { status: 400 });
  }

  // Controlla se l'amico esiste davvero
  const { data: friendProfile, error: profileError } = await supabaseAdmin
    .from("users_profile")
    .select("user_id")
    .eq("user_id", friendId)
    .single();

  if (profileError || !friendProfile) {
    console.log("Errore ricerca profilo:", profileError);
    return NextResponse.json({ error: "Utente non trovato nel database." }, { status: 404 });
  }

  // Controlla se siete già amici
  const { count } = await supabaseAdmin
    .from("user_friends")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)
    .eq("friend_id", friendId);

  if (count && count > 0) {
    return NextResponse.json({ error: "Siete già amici!" }, { status: 400 });
  }

  // CREA L'AMICIZIA RECIPROCA (Uso admin per evitare errori RLS)
  const { error: insertError } = await supabaseAdmin.from("user_friends").insert([
    { user_id: user.id, friend_id: friendId },
    { user_id: friendId, friend_id: user.id }
  ]);

  if (insertError) {
    console.error("Errore inserimento:", insertError);
    return NextResponse.json({ error: "Errore database: " + insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}