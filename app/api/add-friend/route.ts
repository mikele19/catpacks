import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { friendId } = body;

  if (!friendId) return NextResponse.json({ error: "ID amico mancante" }, { status: 400 });

  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No Token" }, { status: 401 });

  // 1. Client STANDARD (per verificare chi sta facendo la richiesta)
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // 2. Client AMMINISTRATORE (per scrivere nel DB ignorando la RLS)
  // Assicurati di aver messo SUPABASE_SERVICE_ROLE_KEY nel file .env.local!
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  );

  // Verifica che l'utente sia loggato
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.id === friendId) {
    return NextResponse.json({ error: "Non puoi aggiungere te stesso!" }, { status: 400 });
  }

  // Controlla se l'amico esiste
  const { data: friendProfile } = await supabaseAdmin
    .from("users_profile")
    .select("user_id")
    .eq("user_id", friendId)
    .single();

  if (!friendProfile) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
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

  // Crea l'amicizia RECIPROCA usando il client ADMIN
  const { error } = await supabaseAdmin.from("user_friends").insert([
    { user_id: user.id, friend_id: friendId },
    { user_id: friendId, friend_id: user.id }
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}