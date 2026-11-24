import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const ROOM_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  const room = new URL(request.url).searchParams.get("room") ?? "public-lobby";

  if (!ROOM_PATTERN.test(room)) {
    return NextResponse.json(
      { error: "Invalid room." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("multiplayer_worlds")
    .select("room_id,world,updated_at")
    .eq("room_id", room)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    world: data?.world ?? { version: 1, blocks: [] },
  });
}

export async function PUT(request: Request) {
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
    const room = String(body.room ?? "public-lobby");

    if (!ROOM_PATTERN.test(room)) {
      return NextResponse.json(
        { error: "Invalid room." },
        { status: 400 }
      );
    }

    const world = body.world;

    if (
      !world ||
      world.version !== 1 ||
      !Array.isArray(world.blocks) ||
      world.blocks.length > 10000
    ) {
      return NextResponse.json(
        { error: "Invalid world data." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("multiplayer_worlds")
      .upsert(
        {
          room_id: room,
          world,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_id" }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
      }
