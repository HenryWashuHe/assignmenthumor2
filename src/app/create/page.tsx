import styles from "./page.module.css";
import CaptionForge from "./CaptionForge";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0;

/* ── types ── */

interface ImageRow {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
  is_public: boolean | null;
}

interface HumorFlavorRow {
  id: number;
  slug: string;
  description: string | null;
}

interface CaptionExampleRow {
  id: number;
  caption: string;
  explanation: string;
  image_description: string;
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
}

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/* ── data fetchers ── */

async function getImages(): Promise<ImageRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase
    .from("images")
    .select("id,url,image_description,is_common_use,is_public")
    .or("is_public.eq.true,is_common_use.eq.true")
    .limit(12);
  if (error || !data) return [];
  return data as ImageRow[];
}

async function getHumorFlavors(): Promise<HumorFlavorRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase
    .from("humor_flavors")
    .select("id,slug,description")
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data as HumorFlavorRow[];
}

async function getExamples(): Promise<CaptionExampleRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("caption_examples")
    .select("id, caption, explanation, image_description")
    .order("priority", { ascending: false })
    .limit(2);
  return (data ?? []) as CaptionExampleRow[];
}

async function getTerms(): Promise<TermRow[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await supabase
    .from("terms")
    .select("id, term, definition, example")
    .order("priority", { ascending: false })
    .limit(4);
  return (data ?? []) as TermRow[];
}

async function getRecentContext(): Promise<ContextRow | null> {
  if (!hasSupabaseEnv) return null;
  const { data } = await supabase
    .from("community_contexts")
    .select("id, content")
    .order("created_datetime_utc", { ascending: false })
    .limit(1);
  return (data?.[0] as ContextRow) ?? null;
}

/* ── page ── */

export default async function StudioPage() {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  const [images, flavors, examples, terms, context] = await Promise.all([
    getImages(),
    getHumorFlavors(),
    getExamples(),
    getTerms(),
    getRecentContext(),
  ]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Studio</h1>
          <p className={styles.subtitle}>
            Pick fast. Write faster.
          </p>
        </header>

        {hasSupabaseEnv ? (
          <CaptionForge
            images={images}
            flavors={flavors}
            userId={user?.id ?? null}
            userEmail={user?.email ?? null}
          />
        ) : (
          <div className={styles.emptyBox}>
            Missing Supabase env keys.
          </div>
        )}

        {/* Writing fuel sidebar content */}
        <section className={styles.fuelSection}>
          {/* Examples */}
          {examples.length > 0 && (
            <div className={styles.fuelCard}>
              <h3 className={styles.fuelTitle}>Quick examples</h3>
              {examples.map((ex) => (
                <div key={ex.id} className={styles.fuelItem}>
                  <p className={styles.fuelCaption}>
                    &ldquo;{ex.caption}&rdquo;
                  </p>
                  <details className={styles.fuelDetails}>
                    <summary>Why it works</summary>
                    <p className={styles.fuelExplanation}>{ex.explanation}</p>
                    <span className={styles.fuelContext}>
                      Image: {ex.image_description}
                    </span>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* Vocabulary */}
          {terms.length > 0 && (
            <div className={styles.fuelCard}>
              <h3 className={styles.fuelTitle}>Humor vocabulary</h3>
              {terms.map((t) => (
                <div key={t.id} className={styles.fuelItem}>
                  <span className={styles.vocabTerm}>{t.term}</span>
                  <details className={styles.fuelDetails}>
                    <summary>Meaning</summary>
                    <p className={styles.vocabDef}>{t.definition}</p>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* Context */}
          {context?.content && (
            <div className={styles.fuelCard}>
              <h3 className={styles.fuelTitle}>Current vibe</h3>
              <p className={styles.fuelContext}>
                {context.content.length > 160
                  ? `${context.content.slice(0, 160)}...`
                  : context.content}
              </p>
            </div>
          )}

          <div className={styles.fuelCard}>
            <h3 className={styles.fuelTitle}>Explore</h3>
            <p className={styles.fuelContext}>
              Need random inspiration first?
            </p>
            <Link href="/chaos-wall" className={styles.flowLink}>
              Open Chaos Wall &rarr;
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
