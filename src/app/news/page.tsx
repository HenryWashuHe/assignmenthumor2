import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

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

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const formatDate = (value: string | null) => {
  if (!value) return "Date unknown";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

async function getNewsSignals(category?: string): Promise<NewsSnippetRow[]> {
  if (!hasSupabaseEnv) return [];

  let query = supabase
    .from("news_snippets")
    .select(
      `
      id,
      headline,
      category,
      source_url,
      priority,
      created_at,
      news_entities(entity, entity_type)
    `
    )
    .eq("is_active", true);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

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
  data.forEach((row) => {
    if (row.category) set.add(row.category);
  });
  return Array.from(set);
}

const entityTypeClass = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === "person") return styles.typePerson;
  if (normalized === "org") return styles.typeOrg;
  if (normalized === "place") return styles.typePlace;
  if (normalized === "event") return styles.typeEvent;
  if (normalized === "product") return styles.typeProduct;
  if (normalized === "acronym") return styles.typeAcronym;
  return styles.typeOther;
};

const normalizeCategory = (value?: string | string[]) => {
  if (!value) return "all";
  if (Array.isArray(value)) return value[0] ?? "all";
  return value;
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const selectedCategory = normalizeCategory(resolvedParams?.category);
  const [signals, categories] = await Promise.all([
    getNewsSignals(selectedCategory),
    getCategories(),
  ]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <nav className={styles.topNav}>
          <Link className={styles.backLink} href="/">
            ← Back to home
          </Link>
          <Link className={styles.backLink} href="/caption-lab">
            Caption lab →
          </Link>
        </nav>
        <header className={styles.hero}>
          <div className={styles.kicker}>Retro Signal Desk</div>
          <h1 className={styles.title}>Campus News Signal Roll</h1>
          <p className={styles.subhead}>
            A poster-wall list of active snippets, spliced with their named
            entities. Headlines lead, tags follow. Fresh pulls, no fluff.
          </p>
          <div className={styles.metaRow}>
            <span>Active Snippets</span>
            <span>Entity Threads</span>
            <span>Priority Sorted</span>
          </div>
        </header>

        <section className={styles.filterRow}>
          <form className={styles.filterForm} method="get">
            <label className={styles.filterLabel} htmlFor="categoryFilter">
              Filter by category
            </label>
            <select
              id="categoryFilter"
              name="category"
              className={styles.filterSelect}
              defaultValue={selectedCategory}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button className={styles.filterButton} type="submit">
              Apply
            </button>
            {selectedCategory !== "all" && (
              <a className={styles.filterReset} href="/news">
                Reset
              </a>
            )}
          </form>
          <div className={styles.filterSummary}>
            Showing{" "}
            <strong>{selectedCategory === "all" ? "all" : selectedCategory}</strong>
          </div>
        </section>

        {signals.length === 0 ? (
          <section className={styles.empty}>
            {hasSupabaseEnv ? (
              <p>
                No active snippets yet. Add rows to{" "}
                <code>news_snippets</code> and <code>news_entities</code>.
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
          <section className={styles.list}>
            {signals.map((signal, index) => {
              const entities = signal.news_entities ?? [];
              const CardTag = signal.source_url ? "a" : "article";
              const cardProps = signal.source_url
                ? {
                    href: signal.source_url,
                    target: "_blank",
                    rel: "noreferrer",
                    "aria-label": `Open source for ${signal.headline}`,
                  }
                : {};
              return (
                <CardTag
                  key={signal.id}
                  className={`${styles.card} ${
                    signal.source_url ? styles.cardLink : styles.cardStatic
                  }`}
                  style={{ animationDelay: `${index * 80}ms` }}
                  {...cardProps}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.category}>{signal.category}</span>
                      <span className={styles.date}>
                        {formatDate(signal.created_at)}
                      </span>
                    </div>
                    <div className={styles.priority}>
                      Priority {signal.priority ?? "?"}
                    </div>
                  </div>
                  <h2 className={styles.headline}>{signal.headline}</h2>
                  {entities.length > 0 ? (
                    <div className={styles.entities}>
                      {entities.map((entity, entityIndex) => (
                        <span
                          key={`${signal.id}-${entity.entity}-${entityIndex}`}
                          className={`${styles.entityChip} ${entityTypeClass(
                            entity.entity_type
                          )}`}
                        >
                          <span className={styles.entityLabel}>
                            {entity.entity}
                          </span>
                          <span className={styles.entityType}>
                            {entity.entity_type}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.entitiesEmpty}>
                      No entities tagged yet.
                    </div>
                  )}
                  <div className={styles.footerRow}>
                    <span className={styles.sourceLabel}>
                      {signal.source_url ? "Source ready" : "No source link"}
                    </span>
                    {signal.source_url ? (
                      <span className={styles.sourceLink}>Open source →</span>
                    ) : (
                      <span className={styles.sourceLinkDisabled}>
                        Open source →
                      </span>
                    )}
                  </div>
                </CardTag>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
