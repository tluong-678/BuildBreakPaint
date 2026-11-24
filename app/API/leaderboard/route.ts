
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("leaderboard")
    .select("username, seconds_played")
    .order("seconds_played", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    players: data ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const seconds = Number(body.seconds);

    const username = String(body.username ?? "Player")
      .trim()
      .slice(0, 32) || "Player";

    // Chỉ chấp nhận một lần cập nhật tối đa 60 giây.
    if (
      !Number.isInteger(seconds) ||
      seconds < 1 ||
      seconds > 60
    ) {
      return NextResponse.json(
        { error: "Invalid playtime." },
        { status: 400 }
      );
    }

    const { data: existing, error: readError } = await supabase
      .from("leaderboard")
      .select("seconds_played")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (readError) {
      return NextResponse.json(
        { error: readError.message },
        { status: 500 }
      );
    }

    const total =
      Number(existing?.seconds_played ?? 0) + seconds;

    const { error } = await supabase
      .from("leaderboard")
      .upsert(
        {
          user_id: auth.user.id,
          username,
          seconds_played: total,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      seconds_played: total,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
            }
