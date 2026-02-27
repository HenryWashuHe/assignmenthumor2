"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import type {
  FlavorStat,
  CelebImage,
  TermRow,
  ShareDest,
  ScreenshotHit,
  HourBucket,
} from "./page";

/* ── props ── */

interface Props {
  flavorStats: FlavorStat[];
  celebImages: CelebImage[];
  terms: TermRow[];
  shareDests: ShareDest[];
  screenshotHits: ScreenshotHit[];
  peakHours: HourBucket[];
  totalCaptions: number;
  totalShares: number;
  totalScreenshots: number;
}

/* ── helpers ── */

function formatHour(h: number): string {
  if (h === 0) return "12 am";
  if (h === 12) return "12 pm";
  return h > 12 ? `${h - 12} pm` : `${h} am`;
}

/* ── component ── */

export default function GenomeDashboard({
  flavorStats,
  celebImages,
  terms,
  shareDests,
  screenshotHits,
  peakHours,
  totalCaptions,
  totalShares,
  totalScreenshots,
}: Props) {
  const [expandedFlavor, setExpandedFlavor] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<
    "styles" | "lexicon" | "celebs" | "shares" | "time" | "hall"
  >("styles");
  const maxHour = Math.max(...peakHours.map((h) => h.count), 1);
  const totalShareCount = shareDests.reduce((s, d) => s + d.count, 0);

  return (
    <div className={styles.dashboard}>
      {/* ── At a glance ── */}
      <section className={styles.section}>
        <div className={styles.statRow}>
          {[
            { val: totalCaptions, label: "Captions" },
            { val: totalShares, label: "Shares" },
            { val: totalScreenshots, label: "Screenshots" },
            { val: flavorStats.length, label: "Humor styles" },
            { val: celebImages.length, label: "Celebrity subjects" },
          ].map((s) => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statVal}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.zoneSwitcher}>
          <button
            type="button"
            onClick={() => setActiveZone("styles")}
            className={`${styles.zoneBtn} ${activeZone === "styles" ? styles.zoneBtnActive : ""}`}
          >
            Styles
          </button>
          <button
            type="button"
            onClick={() => setActiveZone("lexicon")}
            className={`${styles.zoneBtn} ${activeZone === "lexicon" ? styles.zoneBtnActive : ""}`}
          >
            Lexicon
          </button>
          <button
            type="button"
            onClick={() => setActiveZone("celebs")}
            className={`${styles.zoneBtn} ${activeZone === "celebs" ? styles.zoneBtnActive : ""}`}
          >
            Celebs
          </button>
          <button
            type="button"
            onClick={() => setActiveZone("shares")}
            className={`${styles.zoneBtn} ${activeZone === "shares" ? styles.zoneBtnActive : ""}`}
          >
            Shares
          </button>
          <button
            type="button"
            onClick={() => setActiveZone("time")}
            className={`${styles.zoneBtn} ${activeZone === "time" ? styles.zoneBtnActive : ""}`}
          >
            Hours
          </button>
          <button
            type="button"
            onClick={() => setActiveZone("hall")}
            className={`${styles.zoneBtn} ${activeZone === "hall" ? styles.zoneBtnActive : ""}`}
          >
            Hall
          </button>
        </div>
      </section>

      {/* ── Humor Style Rankings ── */}
      {activeZone === "styles" && flavorStats.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Humor Style Rankings</h2>
          <p className={styles.sectionDesc}>Tap a row to reveal the best line.</p>
          <div className={styles.flavorList}>
            {flavorStats.map((f, i) => {
              const isOpen = expandedFlavor === f.slug;
              const barW = Math.max(6, (f.avgLikes / Math.max(flavorStats[0]?.avgLikes ?? 1, 1)) * 100);
              return (
                <button
                  key={f.slug}
                  type="button"
                  className={`${styles.flavorRow} ${isOpen ? styles.flavorRowOpen : ""}`}
                  onClick={() => setExpandedFlavor(isOpen ? null : f.slug)}
                >
                  <span className={styles.flavorRank}>{i + 1}</span>
                  <div className={styles.flavorMain}>
                    <div className={styles.flavorHead}>
                      <span className={styles.flavorName}>{f.slug}</span>
                      <span className={styles.flavorAvg}>{f.avgLikes} avg likes</span>
                    </div>
                    <div className={styles.flavorBarTrack}>
                      <div className={styles.flavorBar} style={{ width: `${barW}%` }} />
                    </div>
                    <span className={styles.flavorSub}>
                      {f.count} captions &middot; {f.totalLikes} total likes
                    </span>
                  </div>
                  {isOpen && (
                    <div className={styles.flavorExpanded}>
                      {f.topImageUrl && (
                        <div className={styles.flavorMedia}>
                          <Image
                            src={f.topImageUrl}
                            alt={f.topImageAlt ?? `${f.slug} caption image`}
                            fill
                            sizes="(max-width: 640px) 100vw, 280px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      )}
                      {f.description && <p className={styles.flavorDesc}>{f.description}</p>}
                      {f.topCaption && (
                        <p className={styles.flavorQuote}>
                          &ldquo;{f.topCaption}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── The Lexicon ── */}
      {activeZone === "lexicon" && terms.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The Lexicon</h2>
          <p className={styles.sectionDesc}>Fast definitions from the archive.</p>
          <div className={styles.termGrid}>
            {terms.map((t) => (
              <div key={t.id} className={styles.termCard}>
                <div className={styles.termHead}>
                  <span className={styles.termWord}>{t.term}</span>
                  {t.term_types?.name && (
                    <span className={styles.termType}>{t.term_types.name}</span>
                  )}
                </div>
                <p className={styles.termDef}>{t.definition}</p>
                <p className={styles.termEx}>
                  <em>&ldquo;{t.example}&rdquo;</em>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Celebrity Subjects ── */}
      {activeZone === "celebs" && celebImages.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Celebrity Subjects</h2>
          <p className={styles.sectionDesc}>Who gets captioned most.</p>
          <div className={styles.celebGrid}>
            {celebImages.map((celeb, i) => (
              <div key={celeb.id} className={styles.celebCard}>
                {celeb.url && (
                  <div className={styles.celebImg}>
                    <Image
                      src={celeb.url}
                      alt={celeb.celebrity_recognition}
                      fill
                      sizes="(max-width: 640px) 50vw, 280px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
                <div className={styles.celebBody}>
                  <div className={styles.celebHead}>
                    <span className={styles.celebRank}>#{i + 1}</span>
                    <span className={styles.celebName}>{celeb.celebrity_recognition}</span>
                  </div>
                  <span className={styles.celebStat}>
                    {celeb.captionCount} captions &middot; {celeb.totalLikes} likes
                  </span>
                  {celeb.topCaption && (
                    <p className={styles.celebQuote}>
                      &ldquo;{celeb.topCaption}&rdquo;
                    </p>
                  )}
                  {celeb.topFlavor && (
                    <span className={styles.celebFlavor}>{celeb.topFlavor}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Where People Share ── */}
      {activeZone === "shares" && shareDests.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Where People Share</h2>
          <p className={styles.sectionDesc}>{totalShareCount} total shares.</p>
          <div className={styles.shareList}>
            {shareDests.map((d) => {
              const pct = totalShareCount > 0 ? Math.round((d.count / totalShareCount) * 100) : 0;
              return (
                <div key={d.name} className={styles.shareRow}>
                  <span className={styles.shareName}>{d.name}</span>
                  <div className={styles.shareBarTrack}>
                    <div className={styles.shareBar} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.shareCount}>{d.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Peak Hours ── */}
      {activeZone === "time" && (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Activity by Hour</h2>
        <p className={styles.sectionDesc}>Posting rhythm across the day.</p>
        <div className={styles.hourChart}>
          {peakHours.map((h) => (
            <div key={h.hour} className={styles.hourCol} title={`${formatHour(h.hour)}: ${h.count} captions`}>
              <div className={styles.hourBar} style={{ height: `${Math.max(2, (h.count / maxHour) * 100)}%` }} />
              <span className={styles.hourLabel}>
                {h.hour % 4 === 0 ? formatHour(h.hour) : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── Screenshot Hall of Fame ── */}
      {activeZone === "hall" && screenshotHits.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Hall of Fame</h2>
          <p className={styles.sectionDesc}>Most saved by the community.</p>
          <div className={styles.archiveGrid}>
            {screenshotHits.map((hit) => (
              <div key={hit.captionId} className={styles.archiveCard}>
                {hit.imageUrl && (
                  <div className={styles.archiveImg}>
                    <Image
                      src={hit.imageUrl}
                      alt="Caption image"
                      fill
                      sizes="(max-width: 640px) 100vw, 300px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
                <div className={styles.archiveBody}>
                  <p className={styles.archiveCaption}>
                    &ldquo;{hit.content}&rdquo;
                  </p>
                  <div className={styles.archiveMeta}>
                    <span>{hit.screenshotCount} screenshots</span>
                    <span>{hit.likeCount} likes</span>
                    {hit.flavorSlug && <span>{hit.flavorSlug}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
