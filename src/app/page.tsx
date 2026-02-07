import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/* ── types ── */

interface FeaturedCaption {
  id: string;
  content: string | null;
  like_count: number;
  images: { url: string | null; image_description: string | null } | null;
  humor_flavors: { slug: string } | null;
}

interface TermRow {
  id: number;
  term: string;
  definition: string;
  example: string;
}

interface ContextRow {
  id: number;
  content: string | null;
  community_context_tags: { name: string }[] | null;
}

/* ── data fetchers ── */

async function getFeaturedCaptions(): Promise<FeaturedCaption[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("captions")
    .select("id, content, like_count, images(url, image_description), humor_flavors(slug)")
    .eq("is_public", true)
    .order("like_count", { ascending: false })
    .limit(4);
  return (data ?? []) as unknown as FeaturedCaption[];
}

async function getRandomTerm(): Promise<TermRow | null> {
  if (!hasSupabaseEnv) return null;
  const { count } = await supabase
    .from("terms")
    .select("id", { count: "exact", head: true });
  if (!count || count === 0) return null;
  const offset = Math.floor(Math.random() * count);
  const { data } = await supabase
    .from("terms")
    .select("id, term, definition, example")
    .range(offset, offset)
    .limit(1);
  return (data?.[0] as TermRow) ?? null;
}

async function getLatestContext(): Promise<ContextRow | null> {
  if (!hasSupabaseEnv) return null;
  const { data } = await supabase
    .from("community_contexts")
    .select("id, content, community_context_tags(name)")
    .order("created_datetime_utc", { ascending: false })
    .limit(1);
  return (data?.[0] as unknown as ContextRow) ?? null;
}

async function getTotalCount(): Promise<number> {
  if (!hasSupabaseEnv) return 0;
  const { count } = await supabase
    .from("captions")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true);
  return count ?? 0;
}

async function getFlavorCount(): Promise<number> {
  if (!hasSupabaseEnv) return 0;
  const { count } = await supabase
    .from("humor_flavors")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/* ── page ── */

export default async function Home() {
  const [featured, term, context, totalCaptions, flavorCount] =
    await Promise.all([
      getFeaturedCaptions(),
      getRandomTerm(),
      getLatestContext(),
      getTotalCount(),
      getFlavorCount(),
    ]);

  const lead = featured[0] ?? null;
  const secondaries = featured.slice(1, 4);
  const ctxTags = (context?.community_context_tags ?? []).map((t) =>
    typeof t === "object" && t !== null ? (t as { name: string }).name : String(t)
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* ── Masthead ── */}
        <section className={styles.masthead}>
          <span className={styles.issue}>
            Vol. 1 &middot; {totalCaptions} captions &middot; {flavorCount} humor styles
          </span>
          <h1 className={styles.headline}>
            Where Every Image<br />Gets a Punchline
          </h1>
          <p className={styles.standfirst}>
            Columbia &amp; Barnard humor lab. Jump in and play.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryCta} href="/caption-lab">
              Browse the gallery
            </Link>
            <Link className={styles.secondaryCta} href="/create">
              Write a caption
            </Link>
            <Link className={styles.secondaryCta} href="/chaos-wall">
              Enter Chaos Wall
            </Link>
          </div>
        </section>

        {/* ── Sidebar row: Term of the day + Context ── */}
        <section className={styles.asideRow}>
          {term && (
            <div className={styles.termCard}>
              <span className={styles.termLabel}>Word of the day</span>
              <h3 className={styles.termWord}>{term.term}</h3>
              <p className={styles.termDef}>{term.definition}</p>
              <p className={styles.termEx}>
                <em>&ldquo;{term.example}&rdquo;</em>
              </p>
              <Link href="/genome" className={styles.termLink}>
                See all terms in The Index &rarr;
              </Link>
            </div>
          )}
          {context?.content && (
            <div className={styles.contextCard}>
              <span className={styles.contextLabel}>Community context</span>
              <p className={styles.contextText}>
                {context.content.length > 220
                  ? context.content.slice(0, 220) + "..."
                  : context.content}
              </p>
              {ctxTags.length > 0 && (
                <div className={styles.contextTags}>
                  {ctxTags.map((tag) => (
                    <span key={tag} className={styles.contextTag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Editor's picks ── */}
        {lead && (
          <section className={styles.picks}>
            <div className={styles.sectionLabel}>
              <span className={styles.labelLine} />
              <span className={styles.labelText}>Top captions</span>
              <span className={styles.labelLine} />
            </div>

            <div className={styles.pickGrid}>
              <Link href="/caption-lab" className={styles.leadCard}>
                {lead.images?.url && (
                  <div className={styles.leadImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lead.images.url}
                      alt={lead.images.image_description ?? "Featured caption"}
                    />
                  </div>
                )}
                <div className={styles.leadBody}>
                  <p className={styles.leadCaption}>
                    &ldquo;{lead.content}&rdquo;
                  </p>
                  <div className={styles.leadMeta}>
                    {lead.humor_flavors?.slug && (
                      <span className={styles.flavorTag}>
                        {lead.humor_flavors.slug}
                      </span>
                    )}
                    <span className={styles.likes}>
                      {lead.like_count} likes
                    </span>
                  </div>
                </div>
              </Link>

              {secondaries.length > 0 && (
                <div className={styles.secondaryStack}>
                  {secondaries.map((cap) => {
                    const img = Array.isArray(cap.images)
                      ? (cap.images as { url: string | null }[])[0]
                      : cap.images;
                    return (
                      <Link
                        href="/caption-lab"
                        key={cap.id}
                        className={styles.secondaryCard}
                      >
                        {img?.url && (
                          <div className={styles.secondaryImage}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={
                                (img as { image_description?: string | null })
                                  ?.image_description ?? "Caption image"
                              }
                            />
                          </div>
                        )}
                        <div className={styles.secondaryBody}>
                          <p className={styles.secondaryCaption}>
                            &ldquo;{cap.content}&rdquo;
                          </p>
                          <span className={styles.secondaryLikes}>
                            {cap.like_count} likes
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Sections ── */}
        <section className={styles.sections}>
          <Link className={styles.sectionCard} href="/news">
            <span className={styles.sectionNumber}>01</span>
            <h2 className={styles.sectionTitle}>The Feed</h2>
            <p className={styles.sectionDesc}>
              Live campus signal.
            </p>
          </Link>
          <Link className={styles.sectionCard} href="/caption-lab">
            <span className={styles.sectionNumber}>02</span>
            <h2 className={styles.sectionTitle}>The Gallery</h2>
            <p className={styles.sectionDesc}>
              Fast caption deck + grid.
            </p>
          </Link>
          <Link className={styles.sectionCard} href="/genome">
            <span className={styles.sectionNumber}>03</span>
            <h2 className={styles.sectionTitle}>The Index</h2>
            <p className={styles.sectionDesc}>
              Rankings, patterns, hall of fame.
            </p>
          </Link>
          <Link className={styles.sectionCard} href="/chaos-wall">
            <span className={styles.sectionNumber}>04</span>
            <h2 className={styles.sectionTitle}>Chaos Wall</h2>
            <p className={styles.sectionDesc}>
              Randomized caption stacks with live shuffle.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
