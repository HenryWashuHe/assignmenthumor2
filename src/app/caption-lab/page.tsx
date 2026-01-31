import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

interface CaptionRow {
  id: string;
  content: string | null;
  like_count: number | null;
  is_public: boolean;
  created_datetime_utc: string | null;
  images:
    | { url: string | null; image_description: string | null }
    | { url: string | null; image_description: string | null }[]
    | null;
}

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const shuffleWithSeed = <T,>(items: T[], seed: number) => {
  const result = [...items];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  const next = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

async function getCaptionPanels(
  seed: number,
  mode: "shuffle" | "top"
): Promise<CaptionRow[]> {
  if (!hasSupabaseEnv) return [];

  let query = supabase
    .from("captions")
    .select(
      `
      id,
      content,
      like_count,
      is_public,
      created_datetime_utc,
      images(url, image_description)
    `
    )
    .eq("is_public", true);

  if (mode === "top") {
    query = query.order("like_count", { ascending: false });
  } else {
    query = query.order("created_datetime_utc", { ascending: false });
  }

  const { data, error } = await query.limit(200);

  if (error || !data) return [];
  const withImages = (data as CaptionRow[]).filter((caption) => {
    const image = Array.isArray(caption.images)
      ? caption.images[0]
      : caption.images ?? null;
    return Boolean(image?.url);
  });
  if (mode === "top") {
    return withImages.slice(0, 18);
  }
  const shuffled = shuffleWithSeed(withImages, seed);
  return shuffled.slice(0, 18);
}

const panelClasses = [
  styles.panelWide,
  styles.panelTall,
  styles.panelSquare,
  styles.panelWide,
  styles.panelSquare,
  styles.panelTall,
  styles.panelSquare,
  styles.panelWide,
];

const buildLayout = (length: number, seed: number) => {
  const base = shuffleWithSeed(panelClasses, seed);
  const result: string[] = [];
  while (result.length < length) {
    result.push(...base);
  }
  return result.slice(0, length);
};

const normalizeSeed = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const normalizeMode = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "top" ? "top" : "shuffle";
};

export default async function CaptionLab({
  searchParams,
}: {
  searchParams?: Promise<{ seed?: string | string[]; mode?: string }>;
}) {
  const resolvedParams = await searchParams;
  const seed = normalizeSeed(resolvedParams?.seed);
  const mode = normalizeMode(resolvedParams?.mode);
  const hasSeedParam =
    resolvedParams?.seed !== undefined &&
    resolvedParams?.seed !== null &&
    resolvedParams?.seed !== "";
  const nextSeed = Date.now();
  const panels = await getCaptionPanels(seed, mode);
  const layout = buildLayout(panels.length, seed);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <nav className={styles.topNav}>
          <Link className={styles.backLink} href="/">
            ← Back to home
          </Link>
          <Link className={styles.backLink} href="/news">
            News signals →
          </Link>
        </nav>
        <header className={styles.hero}>
          <div className={styles.kicker}>Caption Lab</div>
          <h1 className={styles.title}>Comic Panel Caption Runs</h1>
          <p className={styles.subhead}>
            A rotating grid of captions pulled from Supabase, stitched to their
            related images and flavor tags. Tap a panel, scan the punchline.
          </p>
          <div className={styles.heroActions}>
            {mode === "top" ? (
              <a
                className={styles.shuffleButton}
                href={`/caption-lab?seed=${nextSeed}`}
              >
                Shuffle batch →
              </a>
            ) : (
              <a
                className={styles.shuffleButton}
                href={`/caption-lab?seed=${nextSeed}`}
              >
                New batch →
              </a>
            )}
            <a className={styles.topButton} href="/caption-lab?mode=top">
              View top likes →
            </a>
            <span className={styles.heroHint}>
              {mode === "top" ? "Sorted by likes." : "Shuffle topics + layout."}
            </span>
          </div>
        </header>

        {panels.length === 0 ? (
          <section className={styles.empty}>
            {hasSupabaseEnv ? (
              <p>
                No public captions yet. Add rows to <code>captions</code> and
                link to <code>images</code>.
              </p>
            ) : (
              <p>
                Missing Supabase env keys. Add{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                <code>.env.local</code>.
              </p>
            )}
          </section>
        ) : (
          <section
            className={`${styles.grid} ${
              hasSeedParam ? styles.gridShuffle : ""
            }`}
          >
            {panels.map((caption, index) => {
              const image = Array.isArray(caption.images)
                ? caption.images[0]
                : caption.images ?? null;
              const panelClass = layout[index] ?? styles.panelSquare;
              return (
                <article
                  key={caption.id}
                  className={`${styles.panel} ${panelClass}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className={styles.panelTop}>
                    <span className={styles.panelCount}>
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.panelLikes}>
                      {caption.like_count ?? 0} likes
                    </span>
                  </div>
                  <div className={styles.panelBody}>
                    <div className={styles.captionBubble}>
                      <p>
                        {caption.content ??
                          "Caption brewing... add content to this panel."}
                      </p>
                    </div>
                    <div className={styles.imageFrame}>
                      {image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image.url}
                          alt={image.image_description ?? "Caption reference"}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
