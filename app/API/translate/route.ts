
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const text = String(body.text ?? "").slice(0, 500);
    const target = String(body.target ?? "en");
    const source = String(body.source ?? "auto");

    const allowedLanguages = ["en", "vi", "zh"];

    if (
      !text.trim() ||
      !allowedLanguages.includes(target)
    ) {
      return NextResponse.json(
        { error: "Invalid translation request." },
        { status: 400 }
      );
    }

    const endpoint = process.env.LIBRETRANSLATE_URL;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Translation service is not configured." },
        { status: 503 }
      );
    }

    const apiKey = process.env.LIBRETRANSLATE_API_KEY;

    const response = await fetch(
      `${endpoint.replace(/\/$/, "")}/translate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: "text",
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.translatedText) {
      return NextResponse.json(
        { error: "Translation provider failed." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      translatedText: result.translatedText,
    });
  } catch {
    return NextResponse.json(
      { error: "Translation request failed." },
      { status: 400 }
    );
  }
}
