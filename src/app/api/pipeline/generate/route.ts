import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.almostcrackd.ai";

interface RegisterResponse {
  imageId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body as { imageUrl?: string };

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };

    const registerRes = await fetch(
      `${API_BASE}/pipeline/upload-image-from-url`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ imageUrl, isCommonUse: false }),
      }
    );

    if (!registerRes.ok) {
      const text = await registerRes.text();
      return NextResponse.json(
        { error: `Failed to register image: ${text}` },
        { status: registerRes.status }
      );
    }

    const { imageId }: RegisterResponse = await registerRes.json();

    const captionsRes = await fetch(
      `${API_BASE}/pipeline/generate-captions`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ imageId }),
      }
    );

    if (!captionsRes.ok) {
      const text = await captionsRes.text();
      return NextResponse.json(
        { error: `Failed to generate captions: ${text}` },
        { status: captionsRes.status }
      );
    }

    const captions = await captionsRes.json();

    return NextResponse.json({ imageId, captions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Generate pipeline failed: ${message}` },
      { status: 500 }
    );
  }
}
