import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

/* ── types ── */

interface NewsEntityRow {
  entity: string;
  entity_type: string;
}

interface NewsSnippetRow {
  id: number;
  headline: string;
  category: string;
  source_url: string | null;
  priority: number | null;
  created_at: string | null;
  news_entities: NewsEntityRow[] | null;
}

interface ContextRow {
  id: number;
  content: string | null;
  community_context_tags: { name: string }[] | null;
}

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

/* ── data fetchers ── */

async function getNewsSignals(category?: string): Promise<NewsSnippetRow[]> {
  if (!hasSupabaseEnv) return [];
  let query = supabase
    .from("news_snippets")
    .select("id, headline, category, source_url, priority, created_at, news_entities(entity, entity_type)")
    .eq("is_active", true);
  if (category && category !== "all") query = query.eq("category", category);
  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);
  if (error || !data) return [];
  return data as NewsSnippetRow[];
}

async function getCategories(): Promise<string[]> {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase
    .from("news_snippets")
    .select("category")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  const set = new Set<string>();
  data.forEach((r) => { if (r.category) set.add(r.category); });
  return Array.from(set);
}

async function getRecentContexts(): Promise<ContextRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("community_contexts")
    .select("id, content, community_context_tags(name)")
    .order("created_datetime_utc", { ascending: false })
    .limit(3);
  return (data ?? []) as unknown as ContextRow[];
}

const entityColor: Record<string, string> = {
  person: "var(--accent)",
  org: "#6B8E6B",
  place: "#8B7355",
  event: "#7B68AE",
  product: "#5A8FA8",
  acronym: "var(--ink-tertiary)",
};

const normalizeCategory = (value?: string | string[]) => {
  if (!value) return "all";
  if (Array.isArray(value)) return value[0] ?? "all";
  return value;
};

/* ── page ── */

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const selectedCategory = normalizeCategory(resolvedParams?.category);
  const [signals, categories, contexts] = await Promise.all([
    getNewsSignals(selectedCategory),
    getCategories(),
    getRecentContexts(),
  ]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>The Feed</h1>
          <p className={styles.subtitle}>
            Campus headlines and tagged entities. Filtered by category,
            sorted by priority.
          </p>
        </header>

        {/* Filter bar */}
        <div className={styles.filterBar}>
          <form className={styles.filterForm} method="get">
            <select
              name="category"
              className={styles.filterSelect}
              defaultValue={selectedCategory}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button className={styles.filterBtn} type="submit">Filter</button>
            {selectedCategory !== "all" && (
              <a className={styles.filterReset} href="/news">Clear</a>
            )}
          </form>
          <span className={styles.filterCount}>
            {signals.length} headline{signals.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.contentGrid}>
          {/* Main feed */}
          <div className={styles.feed}>
            {signals.length === 0 ? (
              <div className={styles.empty}>
                {hasSupabaseEnv
                  ? <p>No active headlines. Add rows to <code>news_snippets</code>.</p>
                  : <p>Missing Supabase env keys.</p>}
              </div>
            ) : (
              signals.map((signal) => {
                const entities = signal.news_entities ?? [];
                const isLinked = Boolean(signal.source_url);
                const Wrapper = isLinked ? "a" : "article";
                const wrapperProps = isLinked
                  ? { href: signal.source_url!, target: "_blank", rel: "noreferrer" }
                  : {};
                return (
                  <Wrapper
                    key={signal.id}
                    className={`${styles.card} ${isLinked ? styles.cardLinked : ""}`}
                    {...wrapperProps}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardCategory}>{signal.category}</span>
                      <span className={styles.cardDate}>{formatDate(signal.created_at)}</span>
                    </div>
                    <h2 className={styles.cardHeadline}>{signal.headline}</h2>
                    {entities.length > 0 && (
                      <div className={styles.cardEntities}>
                        {entities.map((ent, i) => (
                          <span
                            key={`${signal.id}-${ent.entity}-${i}`}
                            className={styles.entityTag}
                            style={{ color: entityColor[ent.entity_type.toLowerCase()] ?? "var(--ink-tertiary)" }}
                          >
                            {ent.entity}
                            <span className={styles.entityType}>{ent.entity_type}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {isLinked && (
                      <span className={styles.cardSource}>Read source &rarr;</span>
                    )}
                  </Wrapper>
                );
              })
            )}
          </div>

          {/* Sidebar: Community context */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Community Context</h3>
              <p className={styles.sidebarDesc}>
                What&apos;s happening on campus that shapes humor right now.
              </p>
              {contexts.length === 0 ? (
                <p className={styles.sidebarEmpty}>No contexts available.</p>
              ) : (
                contexts.map((ctx) => {
                  const tags = (ctx.community_context_tags ?? []).map((t) =>
                    typeof t === "object" ? (t as { name: string }).name : String(t)
                  );
                  return (
                    <div key={ctx.id} className={styles.contextItem}>
                      <p className={styles.contextText}>
                        {(ctx.content ?? "").length > 180
                          ? (ctx.content ?? "").slice(0, 180) + "..."
                          : ctx.content}
                      </p>
                      {tags.length > 0 && (
                        <div className={styles.contextTags}>
                          {tags.map((tag) => (
                            <span key={tag} className={styles.contextTag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Entity legend</h3>
              <div className={styles.legendList}>
                {Object.entries(entityColor).map(([type, color]) => (
                  <div key={type} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: color }} />
                    <span className={styles.legendLabel}>{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
