"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import styles from "./page.module.css";

interface CaptionCard {
  id: string;
  content: string | null;
  like_count: number | null;
  humor_flavors: { slug: string } | null;
  image: { url: string | null; image_description: string | null } | null;
}

interface Props {
  captions: CaptionCard[];
}

const BATCH_SIZE = 12;

function shuffleList<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function takeRandomBatch(list: CaptionCard[], size: number): CaptionCard[] {
  if (list.length <= size) return shuffleList(list);
  return shuffleList(list).slice(0, size);
}

function seededValue(id: string, salt: number): number {
  let hash = 0;
  const key = `${id}-${salt}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function takeDeterministicBatch(list: CaptionCard[], size: number): CaptionCard[] {
  return [...list]
    .sort((a, b) => seededValue(a.id, 17) - seededValue(b.id, 17))
    .slice(0, size);
}

export default function RandomCaptionChaos({ captions }: Props) {
  const [cards, setCards] = useState<CaptionCard[]>(() =>
    takeDeterministicBatch(captions, BATCH_SIZE)
  );
  const [shuffleTick, setShuffleTick] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const stopShuffleGlow = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsShuffling(false);
    }, 520);
  }, []);

  const shuffleCards = useCallback(() => {
    setCards((prev) => shuffleList(prev));
    setShuffleTick((v) => v + 1);
    setIsShuffling(true);
    stopShuffleGlow();
  }, [stopShuffleGlow]);

  const newBatch = useCallback(() => {
    setCards(takeRandomBatch(captions, BATCH_SIZE));
    setShuffleTick((v) => v + 1);
    setIsShuffling(true);
    stopShuffleGlow();
  }, [captions, stopShuffleGlow]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const cardStyles = useMemo(
    () =>
      cards.map((card, i) => {
        const hash = seededValue(card.id, i + shuffleTick * 31);
        const rotate = (hash % 19) - 9;
        const lift = (hash % 17) - 8;
        const scaleBump = (hash % 7) * 0.005;
        const delay = (hash % 6) * 45;
        const colSpan = hash % 5 === 0 ? 2 : 1;
        return {
          id: card.id,
          style: {
            transform: `translateY(${lift}px) rotate(${rotate}deg) scale(${1 + scaleBump})`,
            transitionDelay: `${delay}ms`,
            gridColumn: `span ${colSpan}`,
          } as CSSProperties,
        };
      }),
    [cards, shuffleTick]
  );

  if (cards.length === 0) return null;

  return (
    <section className={styles.chaosSection}>
      <div className={styles.chaosHeader}>
        <h2 className={styles.chaosTitle}>Random Caption Wall</h2>
        <p className={styles.chaosHint}>
          Fresh image-caption chaos. Shuffle this stack or pull a new batch.
        </p>
      </div>

      <div className={styles.chaosTop}>
        <div className={styles.chaosActions}>
          <button
            type="button"
            className={styles.modeBtn}
            onClick={shuffleCards}
          >
            Shuffle cards
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${styles.modeBtnActive}`}
            onClick={newBatch}
          >
            New batch
          </button>
        </div>
      </div>

      <div
        className={`${styles.chaosGrid} ${isShuffling ? styles.chaosGridShuffling : ""}`}
      >
        {cards.map((card, idx) => (
          <article
            key={card.id}
            className={styles.chaosCard}
            style={cardStyles[idx]?.style}
          >
            {card.image?.url && (
              <div className={styles.chaosImage}>
                <Image
                  src={card.image.url}
                  alt={card.image.image_description ?? "Caption image"}
                  fill
                  sizes="(max-width: 640px) 50vw, 300px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}
            <div className={styles.chaosBody}>
              <p className={styles.cardCaption}>
                &ldquo;{card.content ?? "No caption yet."}&rdquo;
              </p>
              <div className={styles.cardMeta}>
                {card.humor_flavors?.slug && (
                  <span className={styles.cardFlavor}>{card.humor_flavors.slug}</span>
                )}
                <span className={styles.cardLikes}>{card.like_count ?? 0} likes</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
