"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

interface GalleryCaption {
  id: string;
  content: string | null;
  like_count: number | null;
  humor_flavors: { slug: string } | null;
  image: { url: string | null; image_description: string | null } | null;
}

interface Props {
  captions: GalleryCaption[];
}

export default function GalleryDeck({ captions }: Props) {
  const [mode, setMode] = useState<"grid" | "deck">("deck");
  const [index, setIndex] = useState(0);
  const [showMeta, setShowMeta] = useState(false);

  const current = captions[index] ?? null;
  const total = captions.length;

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
      if (isTypingTarget || mode !== "deck") return;

      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key.toLowerCase() === "s") surprise();
      if (event.key.toLowerCase() === "m") setShowMeta((v) => !v);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, next, prev, surprise]);

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
            className={`${styles.modeBtn} ${mode === "deck" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("deck")}
          >
            Play deck
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "grid" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("grid")}
          >
            Full grid
          </button>
        </div>
        <span className={styles.deckCount}>{statLabel}</span>
      </div>

      {mode === "deck" && current && (
        <article className={styles.deckCard}>
          {current.image?.url && (
            <div className={styles.deckImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.image.url}
                alt={current.image.image_description ?? "Caption image"}
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

      {(mode === "grid" || !current) && (
        <section className={styles.gallery}>
          {captions.map((caption) => (
            <article key={caption.id} className={styles.card}>
              {caption.image?.url && (
                <div className={styles.cardImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={caption.image.url}
                    alt={caption.image.image_description ?? "Caption image"}
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
        </section>
      )}
    </section>
  );
}
