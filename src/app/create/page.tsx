import Link from "next/link";
import styles from "./page.module.css";
import CaptionForge from "./CaptionForge";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

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

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

export default async function CreateCaption() {
  const [images, flavors] = await Promise.all([
    getImages(),
    getHumorFlavors(),
  ]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/" className={styles.kicker}>
          ← Back to stormboard
        </Link>
        <section className={styles.hero}>
          <div className={styles.kicker}>Caption Forge</div>
          <h1 className={styles.title}>Build a surreal caption signal</h1>
          <p className={styles.subhead}>
            Choose a real image and humor flavor from the database, then craft a
            caption draft for the community duel stream.
          </p>
        </section>

        {hasSupabaseEnv ? (
          <CaptionForge images={images} flavors={flavors} />
        ) : (
          <div className={styles.panel}>
            Missing Supabase env keys. Add{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
          </div>
        )}
      </main>
    </div>
  );
}
