import styles from "./page.module.css";
import GenomeDashboard from "./GenomeDashboard";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/* ── shared types ── */

export interface FlavorStat {
  slug: string;
  description: string | null;
  count: number;
  totalLikes: number;
  avgLikes: number;
  topCaption: string | null;
}

export interface CelebImage {
  id: string;
  url: string | null;
  celebrity_recognition: string;
  topCaption: string | null;
  totalLikes: number;
  captionCount: number;
  topFlavor: string | null;
}

export interface TermRow {
  id: number;
  term: string;
  definition: string;
  example: string;
  term_types: { name: string } | null;
}

export interface ShareDest {
  name: string;
  count: number;
}

export interface ScreenshotHit {
  captionId: string;
  content: string | null;
  likeCount: number;
  screenshotCount: number;
  imageUrl: string | null;
  flavorSlug: string | null;
}

export interface HourBucket {
  hour: number;
  count: number;
}

/* ── data fetchers ── */

async function getFlavorStats(): Promise<FlavorStat[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("captions")
    .select("content, like_count, humor_flavors(slug, description)")
    .eq("is_public", true)
    .not("humor_flavor_id", "is", null)
    .order("like_count", { ascending: false })
    .limit(300);
  if (!data) return [];

  const map = new Map<string, { slug: string; description: string | null; count: number; totalLikes: number; topCaption: string | null; topLikes: number }>();
  for (const c of data as unknown as { content: string; like_count: number; humor_flavors: { slug: string; description: string | null } | null }[]) {
    const slug = c.humor_flavors?.slug;
    if (!slug) continue;
    const e = map.get(slug);
    if (e) { e.count++; e.totalLikes += c.like_count; if (c.like_count > e.topLikes) { e.topLikes = c.like_count; e.topCaption = c.content; } }
    else map.set(slug, { slug, description: c.humor_flavors?.description ?? null, count: 1, totalLikes: c.like_count, topCaption: c.content, topLikes: c.like_count });
  }
  return Array.from(map.values()).map(f => ({ ...f, avgLikes: f.count > 0 ? Math.round((f.totalLikes / f.count) * 10) / 10 : 0 })).sort((a, b) => b.avgLikes - a.avgLikes);
}

async function getCelebImages(): Promise<CelebImage[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("images")
    .select("id, url, celebrity_recognition, captions(id, content, like_count, humor_flavors(slug))")
    .eq("is_public", true)
    .not("celebrity_recognition", "is", null)
    .not("url", "is", null)
    .limit(50);
  if (!data) return [];
  type R = { id: string; url: string | null; celebrity_recognition: string; captions: { id: string; content: string | null; like_count: number; humor_flavors: { slug: string } | null }[] };
  return (data as unknown as R[]).map(img => {
    const sorted = [...(img.captions ?? [])].sort((a, b) => b.like_count - a.like_count);
    return { id: img.id, url: img.url, celebrity_recognition: img.celebrity_recognition, topCaption: sorted[0]?.content ?? null, totalLikes: sorted.reduce((s, c) => s + c.like_count, 0), captionCount: sorted.length, topFlavor: sorted[0]?.humor_flavors?.slug ?? null };
  }).filter(c => c.captionCount > 0).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 8);
}

async function getTerms(): Promise<TermRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("terms")
    .select("id, term, definition, example, term_types(name)")
    .order("priority", { ascending: false })
    .limit(20);
  return (data ?? []) as unknown as TermRow[];
}

async function getSharesByDest(): Promise<ShareDest[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("shares")
    .select("share_to_destinations(name)")
    .limit(1000);
  if (!data) return [];
  const map = new Map<string, number>();
  for (const row of data as unknown as { share_to_destinations: { name: string } | null }[]) {
    const name = row.share_to_destinations?.name ?? "Unknown";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

async function getScreenshotHits(): Promise<ScreenshotHit[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("screenshots")
    .select("caption_id, captions(id, content, like_count, images(url), humor_flavors(slug))")
    .limit(500);
  if (!data) return [];
  type R = { caption_id: string; captions: { id: string; content: string | null; like_count: number; images: { url: string | null } | null; humor_flavors: { slug: string } | null } | null };
  const countMap = new Map<string, { count: number; caption: R["captions"] }>();
  for (const row of data as unknown as R[]) {
    if (!row.captions) continue;
    const e = countMap.get(row.caption_id);
    if (e) e.count++; else countMap.set(row.caption_id, { count: 1, caption: row.captions });
  }
  return Array.from(countMap.entries()).map(([id, { count, caption }]) => ({
    captionId: id, content: caption?.content ?? null, likeCount: caption?.like_count ?? 0,
    screenshotCount: count, imageUrl: caption?.images?.url ?? null, flavorSlug: caption?.humor_flavors?.slug ?? null,
  })).sort((a, b) => b.screenshotCount - a.screenshotCount).slice(0, 8);
}

async function getPeakHours(): Promise<HourBucket[]> {
  if (!hasSupabaseEnv) return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  const { data } = await supabase
    .from("captions")
    .select("created_datetime_utc")
    .eq("is_public", true)
    .limit(500);
  const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  if (data) for (const c of data) { if (c.created_datetime_utc) buckets[new Date(c.created_datetime_utc).getHours()].count++; }
  return buckets;
}

async function getCounts(sb: Awaited<ReturnType<typeof createClient>>) {
  const [{ count: captions }, { count: shares }, { count: screenshots }] = await Promise.all([
    sb.from("captions").select("id", { count: "exact", head: true }).eq("is_public", true),
    sb.from("shares").select("id", { count: "exact", head: true }),
    sb.from("screenshots").select("id", { count: "exact", head: true }),
  ]);
  return { captions: captions ?? 0, shares: shares ?? 0, screenshots: screenshots ?? 0 };
}

/* ── page ── */

export default async function IndexPage() {
  const sb = await createClient();
  const [flavorStats, celebImages, terms, shareDests, screenshotHits, peakHours, counts] =
    await Promise.all([
      getFlavorStats(),
      getCelebImages(),
      getTerms(),
      getSharesByDest(),
      getScreenshotHits(),
      getPeakHours(),
      getCounts(sb),
    ]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Index</h1>
          <p className={styles.subtitle}>
            Pick a zone. Explore the signal.
          </p>
        </header>

        <GenomeDashboard
          flavorStats={flavorStats}
          celebImages={celebImages}
          terms={terms}
          shareDests={shareDests}
          screenshotHits={screenshotHits}
          peakHours={peakHours}
          totalCaptions={counts.captions}
          totalShares={counts.shares}
          totalScreenshots={counts.screenshots}
        />
      </main>
    </div>
  );
}
