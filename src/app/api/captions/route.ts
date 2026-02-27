import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "recent" ? "recent" : "top";
    const cursor = searchParams.get("cursor"); // ISO timestamp or like_count string

    const supabase = await createClient();
    const orderCol = mode === "top" ? "like_count" : "created_datetime_utc";

    let query = supabase
      .from("captions")
      .select(
        "id, content, like_count, created_datetime_utc, humor_flavors(slug), images(url, image_description)"
      )
      .eq("is_public", true)
      .order(orderCol, { ascending: false })
      .order("id", { ascending: false }) // stable secondary sort
      .limit(PAGE_SIZE);

    // Apply cursor for pagination
    if (cursor) {
      if (mode === "top") {
        const cursorVal = Number(cursor);
        if (!Number.isNaN(cursorVal)) {
          query = query.lt("like_count", cursorVal);
        }
      } else {
        query = query.lt("created_datetime_utc", cursor);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    interface RawRow {
      id: string;
      content: string | null;
      like_count: number | null;
      created_datetime_utc: string | null;
      humor_flavors: { slug: string } | null;
      images:
        | { url: string | null; image_description: string | null }
        | { url: string | null; image_description: string | null }[]
        | null;
    }

    const rows = (data ?? []) as unknown as RawRow[];
    const filtered = rows.filter((c) => {
      const img = Array.isArray(c.images) ? c.images[0] : c.images;
      return Boolean(img?.url);
    });

    const normalized = filtered.map((c) => ({
      id: c.id,
      content: c.content,
      like_count: c.like_count,
      humor_flavors: c.humor_flavors,
      image: Array.isArray(c.images) ? c.images[0] : c.images ?? null,
      // Expose cursor values for the client
      _cursorTop: c.like_count,
      _cursorRecent: c.created_datetime_utc,
    }));

    const hasMore = filtered.length === PAGE_SIZE;

    return NextResponse.json({ captions: normalized, hasMore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
