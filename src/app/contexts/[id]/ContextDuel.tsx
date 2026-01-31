"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const ROUND_SECONDS = 20;

export interface DuelCaption {
  id: string;
  content: string;
  like_count: number;
  hype: number;
  imageUrl: string | null;
  imageDescription: string | null;
}

interface ContextDuelProps {
  imageUrl: string | null;
  imageDescription: string | null;
  captions: DuelCaption[];
  label: string;
}

export default function ContextDuel({
  imageUrl,
  imageDescription,
  captions,
  label,
}: ContextDuelProps) {
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRecap, setIsRecap] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);

  useEffect(() => {
    if (isRecap) return;
    if (timeLeft <= 0) {
      setIsRecap(true);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecap, timeLeft]);

  const timerWidth = Math.max(0, (timeLeft / ROUND_SECONDS) * 100);

  const winner = useMemo(() => {
    if (captions.length === 0) return null;
    return captions.reduce((best, current) =>
      current.like_count > best.like_count ? current : best
    );
  }, [captions]);

  const handleVote = (id: string) => {
    if (isRecap) return;
    setSelectedId(id);
    setShakeId(id);
    setTimeout(() => setShakeId(null), 300);
  };

  return (
    <section className={styles.duelShell}>
      {imageUrl && (
        <div
          className={styles.backdrop}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      <div className={styles.backdropEdge} />
      <div className={styles.duelBody}>
        <div className={styles.duelHeader}>
          <span>Lightning Duel · 20s</span>
          <span>{label}</span>
        </div>
        <div className={styles.timerBar}>
          <div className={styles.timerFill} style={{ width: `${timerWidth}%` }} />
        </div>
        {imageDescription && (
          <div className={styles.window}>Image context: {imageDescription}</div>
        )}

        {captions.length === 0 ? (
          <div className={styles.empty}>
            No public captions yet. Add rows to <code>captions</code> with{" "}
            <code>is_public</code> set to true.
          </div>
        ) : isRecap ? (
          <div className={styles.recap}>
            <h3>Community Recap</h3>
            <p className={styles.contextText}>
              Winner by community likes:{" "}
              <strong>{winner?.content ?? "No winner yet"}</strong>
            </p>
            {winner && (
              <>
                <div>Hype meter</div>
                <div className={styles.hypeMeter}>
                  <div
                    className={styles.hypeFill}
                    style={{ width: `${winner.hype}%` }}
                  />
                </div>
              </>
            )}
            <div className={styles.metaRow}>
              <span>Your vote: {selectedId ? "Locked" : "No vote"}</span>
              <span>Score revealed</span>
            </div>
            <div className={styles.shareOrb}>Share</div>
          </div>
        ) : (
          <div className={styles.duelGrid}>
            {captions.map((caption) => (
              <article
                key={caption.id}
                className={`${styles.captionCard} ${
                  selectedId === caption.id ? styles.selected : ""
                } ${shakeId === caption.id ? styles.shake : ""}`}
                onClick={() => handleVote(caption.id)}
              >
                <p className={styles.captionText}>{caption.content}</p>
                <div className={styles.captionMeta}>
                  <span>Vote</span>
                  <span>Hidden score</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
