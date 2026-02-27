import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import GalleryDeck from "./GalleryDeck";

export const revalidate = 0;

/* ── types ── */

interface CaptionRow {
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

interface CaptionExampleRow {
  id: number;
  caption: string;
  explanation: string;
  image_description: string;
}

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/* ── data fetchers ── */

export const PAGE_SIZE = 24;

async function getCaptions(mode: "top" | "recent"): Promise<CaptionRow[]> {
  if (!hasSupabaseEnv) return [];
  const orderCol = mode === "top" ? "like_count" : "created_datetime_utc";
  const { data, error } = await supabase
    .from("captions")
    .select("id, content, like_count, created_datetime_utc, humor_flavors(slug), images(url, image_description)")
    .eq("is_public", true)
    .order(orderCol, { ascending: false })
    .limit(PAGE_SIZE);
  if (error || !data) return [];
  return (data as unknown as CaptionRow[]).filter((c) => {
    const img = Array.isArray(c.images) ? c.images[0] : c.images;
    return Boolean(img?.url);
  });
}

async function getExamples(): Promise<CaptionExampleRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("caption_examples")
    .select("id, caption, explanation, image_description")
    .order("priority", { ascending: false })
    .limit(3);
  return (data ?? []) as CaptionExampleRow[];
}

const normalizeMode = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "recent" ? "recent" : "top";
};

/* ── page ── */

export default async function GalleryPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const mode = normalizeMode(resolvedParams?.mode);
  const [captions, examples] = await Promise.all([
    getCaptions(mode),
    getExamples(),
  ]);
  const primaryCaptions = captions.map((caption) => ({
    id: caption.id,
    content: caption.content,
    like_count: caption.like_count,
    created_datetime_utc: caption.created_datetime_utc,
    humor_flavors: caption.humor_flavors,
    image: Array.isArray(caption.images)
      ? caption.images[0]
      : caption.images ?? null,
  }));

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Gallery</h1>
          <p className={styles.subtitle}>
            {mode === "top" ? "Top liked deck." : "Latest drop."}
          </p>
          <div className={`${styles.modeRow} ${styles.headerModeRow}`}>
            <a
              href="/caption-lab?mode=top"
              className={`${styles.modeBtn} ${mode === "top" ? styles.modeBtnActive : ""}`}
            >
              Top liked
            </a>
            <a
              href="/caption-lab?mode=recent"
              className={`${styles.modeBtn} ${mode === "recent" ? styles.modeBtnActive : ""}`}
            >
              Most recent
            </a>
            <Link href="/create" className={styles.writeBtn}>
              Write yours &rarr;
            </Link>
            <Link href="/chaos-wall" className={styles.writeBtn}>
              Chaos wall &rarr;
            </Link>
          </div>
        </header>

        {/* Caption gallery */}
        {primaryCaptions.length === 0 ? (
          <div className={styles.empty}>
            {hasSupabaseEnv
              ? <p>No public captions with images yet.</p>
              : <p>Missing Supabase env keys.</p>}
          </div>
        ) : (
          <GalleryDeck captions={primaryCaptions} sortMode={mode} />
        )}

        {examples.length > 0 && (
          <section className={styles.examplesSection}>
            <div className={styles.sectionLabel}>
              <span className={styles.labelLine} />
              <span className={styles.labelText}>How it&apos;s made</span>
              <span className={styles.labelLine} />
            </div>
            <div className={styles.exampleGrid}>
              {examples.map((ex) => (
                <div key={ex.id} className={styles.exampleCard}>
                  <p className={styles.exampleCaption}>
                    &ldquo;{ex.caption}&rdquo;
                  </p>
                  <details className={styles.exampleDetails}>
                    <summary>Breakdown</summary>
                    <p className={styles.exampleExplanation}>
                      {ex.explanation}
                    </p>
                    <span className={styles.exampleContext}>
                      Image cue: {ex.image_description}
                    </span>
                  </details>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
