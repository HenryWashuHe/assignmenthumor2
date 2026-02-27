"use client";

import { useEffect, useRef, useState } from "react";
import gStyles from "./gesture.module.css";

type TutorialStep = 1 | 2 | 3 | 4;

interface Props {
  handDetected: boolean;
  gestureCount: { left: number; right: number };
  onComplete: () => void;
  onSkip: () => void;
}

export default function GestureTutorial({ handDetected, gestureCount, onComplete, onSkip }: Props) {
  const [step, setStep] = useState<TutorialStep>(1);

  // Stable callback refs — prevents inline arrow functions from cancelling timeouts on re-render
  const onCompleteRef = useRef(onComplete);
  const onSkipRef     = useRef(onSkip);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onSkipRef.current     = onSkip;     }, [onSkip]);

  // Snapshot counts at step entry — advance when count exceeds snapshot
  const rightAtStep3 = useRef<number | null>(null);
  const leftAtStep4  = useRef<number | null>(null);

  /* Step 1 → 2 : auto-advance once camera is live */
  useEffect(() => {
    if (step !== 1) return;
    const t = setTimeout(() => setStep(2), 1100);
    return () => clearTimeout(t);
  }, [step]);

  /* Step 2 → 3 : hand stably detected */
  useEffect(() => {
    if (step !== 2 || !handDetected) return;
    const t = setTimeout(() => {
      rightAtStep3.current = gestureCount.right;
      setStep(3);
    }, 700);
    return () => clearTimeout(t);
  }, [step, handDetected, gestureCount.right]);

  /* Step 3 → 4 : right wave detected */
  useEffect(() => {
    if (step !== 3) return;
    if (rightAtStep3.current === null) rightAtStep3.current = gestureCount.right;
    if (gestureCount.right <= rightAtStep3.current) return;
    const t = setTimeout(() => {
      leftAtStep4.current = gestureCount.left;
      setStep(4);
    }, 600);
    return () => clearTimeout(t);
  }, [step, gestureCount.right]);

  /* Step 4 → complete : left wave detected
     NOTE: onComplete intentionally excluded from deps — we use a ref to keep
     the callback stable so re-renders in RatingDeck don't cancel this timeout. */
  useEffect(() => {
    if (step !== 4) return;
    if (leftAtStep4.current === null) leftAtStep4.current = gestureCount.left;
    if (gestureCount.left <= leftAtStep4.current) return;
    const t = setTimeout(() => onCompleteRef.current(), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, gestureCount.left]);

  const step3Done = step === 3 && rightAtStep3.current !== null && gestureCount.right > rightAtStep3.current;
  const step4Done = step === 4 && leftAtStep4.current  !== null && gestureCount.left  > leftAtStep4.current;

  return (
    <div className={gStyles.tutorialBackdrop} role="dialog" aria-modal="true" aria-label="Gesture tutorial">
      <div className={gStyles.tutorialModal}>

        <div className={gStyles.progressDots} aria-label={`Step ${step} of 4`}>
          {([1, 2, 3, 4] as TutorialStep[]).map((s) => (
            <div key={s} className={`${gStyles.dot} ${step >= s ? gStyles.dotActive : ""}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className={`${gStyles.illustration} ${gStyles.animCamera}`}>
              <span role="img" aria-hidden="true">📷</span>
            </div>
            <h2 className={gStyles.tutorialTitle}>Allow Camera</h2>
            <p className={gStyles.tutorialDesc}>
              We use your camera to read hand gestures in real time.
              Nothing is recorded or stored anywhere.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className={`${gStyles.illustration} ${gStyles.animHand}`}>
              <span role="img" aria-hidden="true">🖐</span>
            </div>
            <h2 className={gStyles.tutorialTitle}>Show Your Hand</h2>
            <p className={gStyles.tutorialDesc}>
              Hold your open palm toward the camera.
              The dot turns green once we see you.
            </p>
            <div className={`${gStyles.detectionFeedback} ${handDetected ? gStyles.detectionFeedbackFound : ""}`}>
              <div className={`${gStyles.detectionDot} ${handDetected ? gStyles.detectionDotFound : ""}`} />
              {handDetected ? "Hand detected!" : "Looking for your hand…"}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={gStyles.swipeDemo}>
              <div className={gStyles.swipeDemoTrack}>
                <span role="img" aria-hidden="true" className={gStyles.swipeHandRight}>🖐</span>
                <div className={gStyles.swipeTrailRight} />
              </div>
              <div className={gStyles.swipeDemoLabels}>
                <span className={gStyles.swipeLabelNope}>✗ Not funny</span>
                <span className={gStyles.swipeLabelFunny}>Funny ✓</span>
              </div>
            </div>
            <h2 className={gStyles.tutorialTitle}>Wave RIGHT → Funny</h2>
            <p className={gStyles.tutorialDesc}>
              Sweep your hand to the right — like shooing something away.
              Keep it quick and deliberate.
            </p>
            <div className={`${gStyles.gestureFeedback} ${step3Done ? gStyles.gestureFeedbackDone : ""}`}>
              {step3Done ? "✓ Got it!" : "Wave right to continue →"}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className={gStyles.swipeDemo}>
              <div className={gStyles.swipeDemoTrack}>
                <div className={gStyles.swipeTrailLeft} />
                <span role="img" aria-hidden="true" className={gStyles.swipeHandLeft}>🖐</span>
              </div>
              <div className={gStyles.swipeDemoLabels}>
                <span className={gStyles.swipeLabelNope}>✗ Not funny</span>
                <span className={gStyles.swipeLabelFunny}>Funny ✓</span>
              </div>
            </div>
            <h2 className={gStyles.tutorialTitle}>Wave LEFT ← Not Funny</h2>
            <p className={gStyles.tutorialDesc}>
              Same motion, but toward the left. Try it now to finish!
            </p>

            {step4Done ? (
              /* Manual "Done" button — fallback if auto-advance somehow lags */
              <button
                type="button"
                className={gStyles.doneButton}
                onClick={() => onCompleteRef.current()}
              >
                ✓ All done — let&apos;s go!
              </button>
            ) : (
              <div className={gStyles.gestureFeedback}>
                ← Wave left to finish
              </div>
            )}
          </>
        )}

        <button type="button" className={gStyles.skipTutorial}
          onClick={() => onSkipRef.current()}>
          Skip tutorial
        </button>
      </div>
    </div>
  );
}
