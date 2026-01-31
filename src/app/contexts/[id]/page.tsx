import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import ContextDuel, { DuelCaption } from "./ContextDuel";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

interface CommunityContextTagMapping {
  community_context_tags: { name: string | null }[] | null;
}

interface CommunityContextRow {
  id: number;
  content: string | null;
  start_datetime_utc: string | null;
  end_datetime_utc: string | null;
  priority: number | null;
  communities: { name: string | null }[] | null;
  community_context_tag_mappings: CommunityContextTagMapping[];
}

interface CaptionRow {
  id: string;
  content: string | null;
  like_count: number | null;
  images: { url: string | null; image_description: string | null }[] | null;
}

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const formatUtc = (value: string | null) => {
  if (!value) return "No window";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
};

const getContextTags = (row: CommunityContextRow) =>
  row.community_context_tag_mappings
    .flatMap((mapping) => mapping.community_context_tags?.map(tag => tag.name) ?? [])
    .filter((name): name is string => Boolean(name));

const pickDuelPair = (captions: CaptionRow[]): CaptionRow[] => {
  if (captions.length <= 2) return captions;
  const byImage = new Map<string, CaptionRow[]>();
  for (const caption of captions) {
    const imageKey = caption.images?.[0]?.url ?? "no-image";
    const list = byImage.get(imageKey) ?? [];
    list.push(caption);
    byImage.set(imageKey, list);
  }
  for (const [, list] of byImage) {
    if (list.length >= 2) {
      return list.slice(0, 2);
    }
  }
  return captions.slice(0, 2);
};

async function getContext(id: number): Promise<CommunityContextRow | null> {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("community_contexts")
    .select(
      `
      id,
      content,
      start_datetime_utc,
      end_datetime_utc,
      priority,
      communities(name),
      community_context_tag_mappings(
        community_context_tags(name)
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as CommunityContextRow;
}

const sanitizeTag = (tag: string) =>
  tag.replace(/[%_,]/g, "").trim().toLowerCase();

const buildCaptionOrFilter = (tags: string[]) => {
  const clauses: string[] = [];
  tags.forEach((tag) => {
    const safeTag = sanitizeTag(tag);
    if (!safeTag) return;
    clauses.push(`content.ilike.*${safeTag}*`);
    clauses.push(`images.image_description.ilike.*${safeTag}*`);
  });
  return clauses.join(",");
};

async function getContextCaptions(tags: string[]): Promise<CaptionRow[]> {
  if (!hasSupabaseEnv) return [];
  const query = supabase
    .from("captions")
    .select(
      `
      id,
      content,
      like_count,
      images(url, image_description)
    `
    )
    .eq("is_public", true);

  const orFilter = buildCaptionOrFilter(tags);
  const { data, error } =
    tags.length > 0 && orFilter
      ? await query
          .or(orFilter)
          .order("like_count", { ascending: false })
          .limit(20)
      : await query.order("like_count", { ascending: false }).limit(20);

  if (error || !data) return [];
  return (data as CaptionRow[]).filter((caption) => caption.content);
}

export default async function ContextDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const contextId = Number(resolvedParams.id);
  if (!Number.isFinite(contextId)) return notFound();

  const context = await getContext(contextId);

  if (!context) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <Link href="/" className={styles.back}>
            ← Back to stormboard
          </Link>
          <div className={styles.empty}>
            No community context found for id {contextId}. Try another context
            from the home mosaic.
          </div>
        </main>
      </div>
    );
  }

  const tags = getContextTags(context);
  const contextCaptions = await getContextCaptions(tags);
  const duelPair = pickDuelPair(contextCaptions);
  const likeMax = Math.max(
    1,
    ...duelPair.map((caption) => caption.like_count ?? 0)
  );
  const duelCaptions: DuelCaption[] = duelPair.map((caption) => ({
    id: caption.id,
    content: caption.content ?? "Untitled caption",
    like_count: caption.like_count ?? 0,
    hype: Math.round(((caption.like_count ?? 0) / likeMax) * 100),
    imageUrl: caption.images?.[0]?.url ?? null,
    imageDescription: caption.images?.[0]?.image_description ?? null,
  }));

  const duelImage =
    duelCaptions.find((caption) => caption.imageUrl)?.imageUrl ?? null;
  const duelImageDescription =
    duelCaptions.find((caption) => caption.imageDescription)?.imageDescription ??
    null;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/" className={styles.back}>
          ← Back to stormboard
        </Link>

        <section className={styles.contextCard}>
          <h1 className={styles.title}>
            {context.communities?.[0]?.name ?? "Open Community"} Context
          </h1>
          <div className={styles.metaRow}>
            <span>Priority {context.priority ?? "N/A"}</span>
            <span>Weird-Surreal</span>
            <span>Meme Lab</span>
          </div>
          <p className={styles.contextText}>
            {context.content ?? "No context description yet."}
          </p>
          <div className={styles.window}>
            <div>Start: {formatUtc(context.start_datetime_utc)}</div>
            <div>End: {formatUtc(context.end_datetime_utc)}</div>
          </div>
          {tags.length > 0 && (
            <div className={styles.tagRow}>
              {tags.map((tag) => (
                <span key={`${context.id}-${tag}`} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {hasSupabaseEnv ? (
          <ContextDuel
            imageUrl={duelImage}
            imageDescription={duelImageDescription}
            captions={duelCaptions}
            label={tags.length > 0 ? "Tag-matched captions" : "Top public captions"}
          />
        ) : (
          <div className={styles.empty}>
            Missing Supabase env keys. Add{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
          </div>
        )}
      </main>
    </div>
  );
}
