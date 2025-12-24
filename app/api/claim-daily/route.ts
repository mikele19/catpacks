import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAILY_CREDITS = 20;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userRes.user) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const userId = userRes.user.id;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Leggi profilo
  const { data: profile } = await supabaseAdmin
    .from("users_profile")
    .select("credits,last_daily_claim")
    .eq("user_id", userId)
    .single();

  // Se non esiste, crealo
  if (!profile) {
    const { data: created, error } = await supabaseAdmin
      .from("users_profile")
      .insert({ user_id: userId, credits: DAILY_CREDITS, last_daily_claim: today })
      .select("credits")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ credits: created.credits, message: "Daily claim fatto!" });
  }

  // Se già claimato oggi
  const last = profile.last_daily_claim as string | null;
  if (last === today) {
    return NextResponse.json({ credits: profile.credits, message: "Hai già riscattato oggi." });
  }

  const newCredits = (profile.credits ?? 0) + DAILY_CREDITS;

  const { error: updErr } = await supabaseAdmin
    .from("users_profile")
    .update({ credits: newCredits, last_daily_claim: today })
    .eq("user_id", userId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ credits: newCredits, message: "Daily claim fatto!" });
}
