import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabaseClient";
import RatingDeck from "./RatingDeck";
import styles from "./page.module.css";

export const revalidate = 0;

/* ── types ── */

interface SupabaseCaption {
  id: string;
  content: string | null;
  humor_flavors: { slug: string } | null;
  images:
    | { url: string | null; image_description: string | null }
    | { url: string | null; image_description: string | null }[]
    | null;
}

export interface NormalizedCaption {
  id: string;
  content: string | null;
  flavorSlug: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

/* ── Fisher-Yates shuffle (immutable) ── */

function shuffle<T>(source: readonly T[]): T[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/* ── normalize supabase join shape ── */

function normalize(row: SupabaseCaption): NormalizedCaption {
  const img = Array.isArray(row.images) ? row.images[0] : row.images;
  return {
    id: row.id,
    content: row.content,
    flavorSlug: row.humor_flavors?.slug ?? null,
    imageUrl: img?.url ?? null,
    imageAlt: img?.image_description ?? null,
  };
}

/* ── page ── */

export default async function RatePage() {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>Profile not found</h2>
            <p className={styles.emptyDesc}>
              You need a profile before you can rate captions.
              Try signing out and back in, or contact the editors.
            </p>
          </section>
        </main>
      </div>
    );
  }

  /* IDs of captions this user has already voted on */
  const { data: existingVotes } = await serverSupabase
    .from("caption_votes")
    .select("caption_id")
    .eq("profile_id", profile.id);

  const votedIds = (existingVotes ?? []).map(
    (v: { caption_id: string }) => v.caption_id
  );
  const previouslyRated = votedIds.length;

  /* use legacy client for reading captions (matches gallery/homepage RLS context) */
  const { data: captions } = await supabase
    .from("captions")
    .select("id, content, humor_flavors(slug), images(url, image_description)")
    .eq("is_public", true)
    .not("content", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  const raw = (captions ?? []) as unknown as SupabaseCaption[];

  /* normalize, filter out captions without images, exclude already-voted */
  const votedSet = new Set(votedIds);
  const normalized = shuffle(
    raw
      .map(normalize)
      .filter((c) => Boolean(c.imageUrl) && !votedSet.has(c.id))
  );

  return (
    <div className={styles.page}>
      <Link href="/caption-lab" className={styles.backNav}>
        &larr; Gallery
      </Link>
      <main className={styles.main}>
        <RatingDeck
          captions={normalized}
          profileId={profile.id}
          previouslyRated={previouslyRated}
        />
      </main>
    </div>
  );
}
