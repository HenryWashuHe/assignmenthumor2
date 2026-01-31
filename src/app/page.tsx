import Link from "next/link";
import styles from "./page.module.css";

export const revalidate = 0;

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.kicker}>Meme Lab HQ</div>
          <h1 className={styles.title}>Humor Dispatch Control Room</h1>
          <p className={styles.subhead}>
            Pick a lane: browse the news signal wall or jump into the caption
            lab. Two distinct modes, same chaos.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.ctaPrimary} href="/news">
              Enter news signals →
            </Link>
            <Link className={styles.ctaSecondary} href="/caption-lab">
              Enter caption lab →
            </Link>
          </div>
        </section>

        <section className={styles.cards}>
          <Link className={styles.card} href="/news">
            <div className={styles.cardLabel}>News signals</div>
            <h2>Retro signal roll</h2>
            <p>
              Headlines, entity chips, and category filtering. Built for scanning
              what the campus is buzzing about.
            </p>
            <span className={styles.cardLink}>Go to /news →</span>
          </Link>
          <Link className={styles.card} href="/caption-lab">
            <div className={styles.cardLabel}>Caption lab</div>
            <h2>Comic panel grid</h2>
            <p>
              Caption + image pairs with shuffle and top-like modes. Built for
              remix energy.
            </p>
            <span className={styles.cardLink}>Go to /caption-lab →</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
