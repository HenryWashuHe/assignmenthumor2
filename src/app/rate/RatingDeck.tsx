"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { NormalizedCaption } from "./page";
import { useGestureRating } from "./useGestureRating";
import styles from "./page.module.css";
import gStyles from "./gesture.module.css";

/* ── Lazy-load gesture UI (camera + tutorial are browser-only) ── */

const GestureCamera = dynamic(() => import("./GestureCamera"), { ssr: false });
const GestureTutorial = dynamic(() => import("./GestureTutorial"), {
  ssr: false,
});

/* ── Types ── */

interface LastVote {
  captionId: string;
  voteValue: number;
  voteRowId: number;
  index: number;
}

type ExitDir = "left" | "right" | null;

interface Props {
  captions: NormalizedCaption[];
  profileId: string;
  previouslyRated: number;
}

const AUTO_ADVANCE_MS = 900;
const UNDO_TOAST_MS = 6000;

/* ── Component ── */

export default function RatingDeck({
  captions,
  profileId,
  previouslyRated,
}: Props) {
  const [queue] = useState<NormalizedCaption[]>(() =>
    captions.filter((caption) => Boolean(caption.imageUrl))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionRated, setSessionRated] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  /* animation state */
  const [exitDir, setExitDir] = useState<ExitDir>(null);
  const [stampLabel, setStampLabel] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  /* undo toast state */
  const [lastVote, setLastVote] = useState<LastVote | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* gesture state */
  const [gestureMode, setGestureMode] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [cardGlow, setCardGlow] = useState<"left" | "right" | null>(null);
  const [gestureCalloutDismissed, setGestureCalloutDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("gesture_callout_dismissed") === "1";
  });

  // Synchronous lock — React state batching means isSubmitting can be stale
  // in closures. This ref updates instantly, preventing double-submit.
  const submittingRef = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  const current = queue[currentIndex] ?? null;
  const nextCaption = queue[currentIndex + 1] ?? null;
  const total = queue.length;
  const totalRated = previouslyRated + sessionRated;
  const progressPct = total > 0 ? (currentIndex / total) * 100 : 0;

  /* preload next image */
  useEffect(() => {
    if (nextCaption?.imageUrl) {
      const img = new window.Image();
      img.src = nextCaption.imageUrl;
    }
  }, [nextCaption]);

  /* clear toast timers on unmount */
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (toastInterval.current) clearInterval(toastInterval.current);
    };
  }, []);

  /* start the undo toast countdown */
  const showUndoToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (toastInterval.current) clearInterval(toastInterval.current);

    setToastVisible(true);
    setToastProgress(100);

    const start = Date.now();
    toastInterval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / UNDO_TOAST_MS) * 100);
      setToastProgress(remaining);
      if (remaining <= 0 && toastInterval.current) {
        clearInterval(toastInterval.current);
      }
    }, 50);

    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setLastVote(null);
      if (toastInterval.current) clearInterval(toastInterval.current);
    }, UNDO_TOAST_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (toastInterval.current) clearInterval(toastInterval.current);
    setToastVisible(false);
  }, []);

  /* advance to next card with entrance animation */
  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    setStampLabel(null);
    setExitDir(null);
    setError(null);
    setEntering(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntering(false));
    });
  }, []);

  /* submit vote */
  const submitVote = useCallback(
    async (value: number) => {
      if (!current || votedIds.has(current.id) || submittingRef.current || exitDir)
        return;

      submittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from("caption_votes")
        .insert({
          vote_value: value,
          profile_id: profileId,
          caption_id: current.id,
          created_by_user_id: profileId,
          modified_by_user_id: profileId,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const voteInfo: LastVote = {
        captionId: current.id,
        voteValue: value,
        voteRowId: data.id,
        index: currentIndex,
      };

      setVotedIds((prev) => new Set([...prev, current.id]));
      setSessionRated((prev) => prev + 1);
      setStampLabel(value === 1 ? "Funny!" : "Nope");
      setExitDir(value === 1 ? "right" : "left");
      setLastVote(voteInfo);
      submittingRef.current = false;
      setIsSubmitting(false);

      showUndoToast();

      setTimeout(() => {
        advanceCard();
      }, AUTO_ADVANCE_MS);
    },
    [
      current,
      currentIndex,
      votedIds,
      exitDir,
      supabase,
      profileId,
      showUndoToast,
      advanceCard,
    ]
  );

  /* undo last vote */
  const undoVote = useCallback(async () => {
    if (!lastVote || isSubmitting) return;

    setIsSubmitting(true);
    dismissToast();

    const { error: deleteError } = await supabase
      .from("caption_votes")
      .delete()
      .eq("id", lastVote.voteRowId);

    if (deleteError) {
      setError(deleteError.message);
      setIsSubmitting(false);
      return;
    }

    setVotedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastVote.captionId);
      return next;
    });
    setSessionRated((prev) => Math.max(0, prev - 1));

    setCurrentIndex(lastVote.index);
    setExitDir(null);
    setStampLabel(null);
    setLastVote(null);
    setIsSubmitting(false);
    setEntering(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntering(false));
    });
  }, [lastVote, isSubmitting, supabase, dismissToast]);

  /* skip */
  const skip = useCallback(() => {
    if (exitDir || currentIndex >= total - 1) return;
    setExitDir("left");
    setTimeout(() => {
      advanceCard();
    }, 350);
  }, [exitDir, currentIndex, total, advanceCard]);

  /* gesture callback — glow and vote fire together; ref lock prevents double-submit */
  const handleGesture = useCallback(
    (dir: "left" | "right") => {
      setCardGlow(dir);
      setTimeout(() => setCardGlow(null), 300);
      submitVote(dir === "right" ? 1 : -1);
    },
    [submitVote]
  );

  /* gesture hook — MediaPipe WASM only initializes when gestureMode=true */
  const gestureState = useGestureRating({
    enabled: gestureMode,
    onGesture: handleGesture,
  });

  /* gesture toggle handler */
  const toggleGestureMode = useCallback(() => {
    const next = !gestureMode;
    setGestureMode(next);
    if (next && !tutorialDone) {
      setShowTutorial(true);
    }
    if (next && !gestureCalloutDismissed) {
      setGestureCalloutDismissed(true);
      localStorage.setItem("gesture_callout_dismissed", "1");
    }
  }, [gestureMode, tutorialDone, gestureCalloutDismissed]);

  const dismissGestureCallout = useCallback(() => {
    setGestureCalloutDismissed(true);
    localStorage.setItem("gesture_callout_dismissed", "1");
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;
      if (isTyping) return;

      const key = event.key.toLowerCase();

      if (key === "f" && !exitDir) {
        submitVote(1);
      } else if (key === "d" && !exitDir) {
        submitVote(-1);
      } else if (key === "u" && lastVote) {
        undoVote();
      } else if ((key === "n" || event.key === "ArrowRight") && !exitDir) {
        skip();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitDir, lastVote, submitVote, undoVote, skip]);

  /* ── empty state ── */
  if (total === 0 || !current) {
    return (
      <section className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>All caught up!</h2>
        <p className={styles.emptyDesc}>
          You&apos;ve rated every available caption. Check back later for new
          ones.
        </p>
        {totalRated > 0 && (
          <p className={styles.emptyStats}>
            {totalRated} caption{totalRated === 1 ? "" : "s"} rated total.
          </p>
        )}
        <Link href="/caption-lab" className={styles.backLink}>
          Back to the gallery &rarr;
        </Link>
      </section>
    );
  }

  const cardClasses = [
    styles.card,
    exitDir === "right" ? styles.cardExitRight : "",
    exitDir === "left" ? styles.cardExitLeft : "",
    entering ? styles.cardEnter : "",
    cardGlow === "right" ? gStyles.cardGlowRight : "",
    cardGlow === "left" ? gStyles.cardGlowLeft : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={styles.deckSection}>
      {/* progress + counter row */}
      <div className={styles.topRow}>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Rating progress"
        >
          <div
            className={styles.progressFill}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className={styles.topMeta}>
          <span className={styles.counter}>
            {currentIndex + 1}/{total}
          </span>
          <span className={styles.ratedBadge}>{totalRated} rated</span>
        </div>
      </div>

      {/* card stack */}
      <div className={styles.cardStack}>
        {nextCaption && (
          <div className={styles.peekCard} aria-hidden="true">
            {nextCaption.imageUrl && (
              <>
                <div className={styles.peekImage}>
                  <Image
                    src={nextCaption.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    style={{ objectFit: "cover", filter: "blur(2px)" }}
                    aria-hidden
                  />
                </div>
                <div className={styles.peekBody}>
                  <p className={styles.peekCaption}>
                    &ldquo;{nextCaption.content ?? "Next caption queued."}&rdquo;
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <article className={cardClasses}>
          {current.imageUrl && (
            <div className={styles.cardImage}>
              <Image
                src={current.imageUrl}
                alt={current.imageAlt ?? "Caption image"}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          )}
          <div className={styles.cardBody}>
            <p className={styles.cardCaption}>
              &ldquo;{current.content ?? "No caption text."}&rdquo;
            </p>
            {current.flavorSlug && (
              <span className={styles.flavorTag}>{current.flavorSlug}</span>
            )}
          </div>

          {stampLabel && (
            <div
              className={styles.stamp}
              data-vote={stampLabel === "Funny!" ? "up" : "down"}
            >
              {stampLabel}
            </div>
          )}
        </article>
      </div>

      {/* error */}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* vote buttons */}
      <div className={styles.voteRow}>
        <button
          type="button"
          className={styles.notFunnyBtn}
          onClick={() => submitVote(-1)}
          disabled={isSubmitting || Boolean(exitDir)}
          aria-label="Vote not funny"
        >
          <span className={styles.voteBtnIcon}>&#x2717;</span>
          Not funny
        </button>
        <button
          type="button"
          className={styles.skipBtn}
          onClick={skip}
          disabled={isSubmitting || Boolean(exitDir)}
        >
          Skip
        </button>
        <button
          type="button"
          className={styles.funnyBtn}
          onClick={() => submitVote(1)}
          disabled={isSubmitting || Boolean(exitDir)}
          aria-label="Vote funny"
        >
          <span className={styles.voteBtnIcon}>&#x2713;</span>
          Funny
        </button>
      </div>

      {/* gesture discovery callout */}
      {!gestureMode && !gestureCalloutDismissed && (
        <div className={gStyles.gestureCallout}>
          <div className={gStyles.gestureCalloutBody}>
            <span className={gStyles.gestureCalloutIcon} aria-hidden="true">🖐</span>
            <div className={gStyles.gestureCalloutText}>
              <strong className={gStyles.gestureCalloutTitle}>Try hands-free rating!</strong>
              <span className={gStyles.gestureCalloutDesc}>
                Wave your hand in front of the camera to vote.
                Hold your palm centered, then swipe right for funny or left for not funny.
                A quick, deliberate wave works best.
              </span>
            </div>
            <button
              type="button"
              className={gStyles.gestureCalloutDismiss}
              onClick={dismissGestureCallout}
              aria-label="Dismiss gesture tip"
            >
              &times;
            </button>
          </div>
          <button
            type="button"
            className={gStyles.gestureCalloutCta}
            onClick={toggleGestureMode}
          >
            Enable gestures
          </button>
        </div>
      )}

      {/* gesture toggle */}
      <div className={styles.gestureRow}>
        <button
          type="button"
          className={`${gStyles.gestureToggle} ${
            gestureMode ? gStyles.gestureToggleActive : ""
          }`}
          onClick={toggleGestureMode}
          aria-pressed={gestureMode}
        >
          🖐 {gestureMode ? "Gestures ON" : "Use Gestures"}
        </button>
      </div>

      {/* hotkey hints */}
      <div className={styles.hints}>
        <kbd>F</kbd> funny &middot; <kbd>D</kbd> not funny &middot;{" "}
        <kbd>N</kbd> skip &middot; <kbd>U</kbd> undo
        {gestureMode && (
          <>
            &nbsp;&middot; wave <strong>→</strong> funny &nbsp;&middot; wave{" "}
            <strong>←</strong> not funny
          </>
        )}
      </div>

      {/* undo toast */}
      {toastVisible && lastVote && (
        <div className={styles.toast}>
          <div className={styles.toastContent}>
            <span className={styles.toastLabel}>
              Voted {lastVote.voteValue === 1 ? "Funny" : "Not Funny"}
            </span>
            <button
              type="button"
              className={styles.toastUndo}
              onClick={undoVote}
              disabled={isSubmitting}
            >
              Undo
            </button>
          </div>
          <div className={styles.toastBar}>
            <div
              className={styles.toastBarFill}
              style={{ width: `${toastProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* gesture tutorial (lazy, shown once on first activation) */}
      {showTutorial && (
        <GestureTutorial
          handDetected={gestureState.handDetected}
          gestureCount={gestureState.gestureCount}
          onComplete={() => {
            setShowTutorial(false);
            setTutorialDone(true);
          }}
          onSkip={() => {
            setShowTutorial(false);
            setTutorialDone(true);
          }}
        />
      )}

      {/* gesture camera HUD (lazy, visible when mode is active) */}
      {gestureMode && <GestureCamera state={gestureState} />}
    </section>
  );
}
