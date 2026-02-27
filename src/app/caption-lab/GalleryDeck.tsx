"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { GalleryCardSkeleton } from "@/app/components/Skeleton";

interface GalleryCaption {
  id: string;
  content: string | null;
  like_count: number | null;
  created_datetime_utc: string | null;
  humor_flavors: { slug: string } | null;
  image: { url: string | null; image_description: string | null } | null;
}

interface Props {
  captions: GalleryCaption[];
  sortMode: "top" | "recent";
}

interface ApiCaption extends GalleryCaption {
  _cursorTop: number | null;
  _cursorRecent: string | null;
}

export default function GalleryDeck({ captions, sortMode }: Props) {
  const [viewMode, setViewMode] = useState<"grid" | "deck">("deck");
  const [index, setIndex] = useState(0);
  const [showMeta, setShowMeta] = useState(false);

  /* ── Infinite scroll state ── */
  const [allCaptions, setAllCaptions] = useState<GalleryCaption[]>(captions);
  const [hasMore, setHasMore] = useState(captions.length === 24);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when initial captions change (mode switch via URL)
  useEffect(() => {
    setAllCaptions(captions);
    setHasMore(captions.length === 24);
  }, [captions]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const last = allCaptions[allCaptions.length - 1];
    const cursor =
      sortMode === "top"
        ? String(last?.like_count ?? "")
        : (last?.created_datetime_utc ?? "");

    try {
      const res = await fetch(
        `/api/captions?mode=${sortMode}&cursor=${encodeURIComponent(cursor)}`
      );
      if (!res.ok) throw new Error("Failed to load more");
      const { captions: next, hasMore: more } = await res.json() as {
        captions: ApiCaption[];
        hasMore: boolean;
      };
      setAllCaptions((prev) => [...prev, ...next]);
      setHasMore(more);
    } catch {
      // silently fail — user can scroll back up and try again
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, allCaptions, sortMode]);

  /* ── IntersectionObserver for infinite scroll (grid mode only) ── */
  useEffect(() => {
    if (viewMode !== "grid") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, fetchMore]);

  /* ── Deck navigation ── */
  const total = allCaptions.length;
  const current = allCaptions[index] ?? null;

  const next = useCallback(() => {
    if (total === 0) return;
    setIndex((prev) => (prev + 1) % total);
    setShowMeta(false);
  }, [total]);

  const prev = useCallback(() => {
    if (total === 0) return;
    setIndex((prev) => (prev - 1 + total) % total);
    setShowMeta(false);
  }, [total]);

  const surprise = useCallback(() => {
    if (total <= 1) return;
    let nextIndex = index;
    while (nextIndex === index) {
      nextIndex = Math.floor(Math.random() * total);
    }
    setIndex(nextIndex);
    setShowMeta(false);
  }, [index, total]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;
      if (isTypingTarget || viewMode !== "deck") return;

      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key.toLowerCase() === "s") surprise();
      if (event.key.toLowerCase() === "m") setShowMeta((v) => !v);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode, next, prev, surprise]);

  const statLabel = useMemo(() => {
    if (!current) return "No entries";
    return `${index + 1}/${total}`;
  }, [current, index, total]);

  return (
    <section className={styles.deckSection}>
      <div className={styles.deckTopRow}>
        <div className={styles.modeRow}>
          <button
            type="button"
            className={`${styles.modeBtn} ${viewMode === "deck" ? styles.modeBtnActive : ""}`}
            onClick={() => setViewMode("deck")}
          >
            Play deck
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${viewMode === "grid" ? styles.modeBtnActive : ""}`}
            onClick={() => setViewMode("grid")}
          >
            Full grid
          </button>
        </div>
        <span className={styles.deckCount}>{statLabel}</span>
      </div>

      {viewMode === "deck" && current && (
        <article className={styles.deckCard}>
          {current.image?.url && (
            <div className={styles.deckImage}>
              <Image
                src={current.image.url}
                alt={current.image.image_description ?? "Caption image"}
                fill
                sizes="(max-width: 860px) 100vw, 560px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          )}
          <div className={styles.deckBody}>
            <p className={styles.deckCaption}>
              &ldquo;{current.content ?? "No caption yet."}&rdquo;
            </p>
            {showMeta && (
              <div className={styles.deckMeta}>
                {current.humor_flavors?.slug && (
                  <span className={styles.cardFlavor}>{current.humor_flavors.slug}</span>
                )}
                <span className={styles.cardLikes}>{current.like_count ?? 0} likes</span>
              </div>
            )}
            <div className={styles.deckActions}>
              <button className={styles.modeBtn} type="button" onClick={prev}>
                Prev
              </button>
              <button className={styles.modeBtn} type="button" onClick={next}>
                Next
              </button>
              <button className={styles.modeBtn} type="button" onClick={surprise}>
                Surprise
              </button>
              <button
                className={`${styles.modeBtn} ${showMeta ? styles.modeBtnActive : ""}`}
                type="button"
                onClick={() => setShowMeta((v) => !v)}
              >
                Meta
              </button>
            </div>
          </div>
        </article>
      )}

      {(viewMode === "grid" || !current) && (
        <section className={styles.gallery}>
          {allCaptions.map((caption) => (
            <article key={caption.id} className={styles.card}>
              {caption.image?.url && (
                <div className={styles.cardImage}>
                  <Image
                    src={caption.image.url}
                    alt={caption.image.image_description ?? "Caption image"}
                    fill
                    sizes="(max-width: 640px) 50vw, 280px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
              <div className={styles.cardBody}>
                <p className={styles.cardCaption}>
                  &ldquo;{caption.content ?? "No caption yet."}&rdquo;
                </p>
                <div className={styles.cardMeta}>
                  {caption.humor_flavors?.slug && (
                    <span className={styles.cardFlavor}>{caption.humor_flavors.slug}</span>
                  )}
                  <span className={styles.cardLikes}>
                    {caption.like_count ?? 0} likes
                  </span>
                </div>
              </div>
            </article>
          ))}

          {/* Skeleton cards while loading next page */}
          {loadingMore && Array.from({ length: 6 }).map((_, i) => (
            <GalleryCardSkeleton key={`skel-${i}`} />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

          {/* End-of-results message */}
          {!hasMore && allCaptions.length > 0 && (
            <p className={styles.endLabel}>All captions loaded</p>
          )}
        </section>
      )}
    </section>
  );
}
