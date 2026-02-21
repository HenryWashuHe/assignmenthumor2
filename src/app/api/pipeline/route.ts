import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.almostcrackd.ai";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

interface PresignedResponse {
  presignedUrl: string;
  cdnUrl: string;
}

interface RegisterResponse {
  imageId: string;
  now: number;
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

    const token = session.access_token;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Allowed: jpeg, jpg, png, webp, gif, heic`,
        },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Step 1: Generate presigned URL
    const presignedRes = await fetch(
      `${API_BASE}/pipeline/generate-presigned-url`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ contentType: file.type }),
      }
    );

    if (!presignedRes.ok) {
      const text = await presignedRes.text();
      return NextResponse.json(
        { error: `Failed to generate upload URL: ${text}` },
        { status: presignedRes.status }
      );
    }

    const { presignedUrl, cdnUrl }: PresignedResponse =
      await presignedRes.json();

    // Step 2: Upload image bytes to presigned URL
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      return NextResponse.json(
        { error: `Failed to upload image: ${text}` },
        { status: uploadRes.status }
      );
    }

    // Step 3: Register image URL in the pipeline
    const registerRes = await fetch(
      `${API_BASE}/pipeline/upload-image-from-url`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
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

    // Step 4: Generate captions
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

    return NextResponse.json({
      imageId,
      cdnUrl,
      captions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Pipeline failed: ${message}` },
      { status: 500 }
    );
  }
}
