import styles from "./page.module.css";
import CaptionForge from "./CaptionForge";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

/* ── types ── */

interface ImageRow {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
  is_public: boolean | null;
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
    .limit(6);
  if (error || !data) return [];
  return data as ImageRow[];
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

  const [images, terms, context] = await Promise.all([
    getImages(),
    getTerms(),
    getRecentContext(),
  ]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Studio</h1>
          <p className={styles.subtitle}>
            Upload your own image or pick from the gallery, then craft the
            perfect caption &mdash; AI-powered suggestions included.
          </p>
        </header>

        {hasSupabaseEnv ? (
          <CaptionForge
            images={images}
            userId={user?.id ?? null}
            userEmail={user?.email ?? null}
            terms={terms}
            currentVibe={context?.content ?? null}
          />
        ) : (
          <div className={styles.emptyBox}>
            Missing Supabase env keys.
          </div>
        )}
      </main>
    </div>
  );
}
