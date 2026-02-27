import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import RandomCaptionChaos from "../caption-lab/RandomCaptionChaos";

export const revalidate = 0;

interface CaptionRow {
  id: string;
  content: string | null;
  like_count: number | null;
  humor_flavors: { slug: string } | { slug: string }[] | null;
  images:
    | { url: string | null; image_description: string | null }
    | { url: string | null; image_description: string | null }[]
    | null;
}

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getCaptions(): Promise<CaptionRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase
    .from("captions")
    .select("id, content, like_count, humor_flavors(slug), images(url, image_description)")
    .eq("is_public", true)
    .not("content", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(240);
  if (error || !data) return [];
  return (data as CaptionRow[]).filter((c) => {
    const img = Array.isArray(c.images) ? c.images[0] : c.images;
    return Boolean(img?.url);
  });
}

export default async function ChaosWallPage() {
  const captions = await getCaptions();
  const normalizedCaptions = captions.map((caption) => {
    const flavor = Array.isArray(caption.humor_flavors)
      ? caption.humor_flavors[0]
      : caption.humor_flavors;
    return {
    id: caption.id,
    content: caption.content,
    like_count: caption.like_count,
    humor_flavors: flavor ?? null,
    image: Array.isArray(caption.images)
      ? caption.images[0]
      : caption.images ?? null,
    };
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>Chaos Wall</h1>
          <p className={styles.subtitle}>
            Randomized caption-image stacks. Shuffle fast, pull a new batch, repeat.
          </p>
          <div className={styles.actions}>
            <Link href="/caption-lab" className={styles.actionBtn}>
              Back to Gallery
            </Link>
            <Link href="/create" className={styles.actionBtnSecondary}>
              Open Studio
            </Link>
          </div>
        </header>

        {normalizedCaptions.length === 0 ? (
          <div className={styles.empty}>
            {hasSupabaseEnv
              ? "No public captions with images yet."
              : "Missing Supabase env keys."}
          </div>
        ) : (
          <RandomCaptionChaos captions={normalizedCaptions} />
        )}
      </main>
    </div>
  );
}
