"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

/* ── Constants ── */

/**
 * Mirror-corrected wave detection:
 *   Video displayed scaleX(-1) → user sees a mirror.
 *   Camera x=0..1 maps to mirror RIGHT..LEFT.
 *
 *   User waves RIGHT (mirror) → x decreases → velocity NEGATIVE
 *   User waves LEFT  (mirror) → x increases → velocity POSITIVE
 *
 *   velocity < -THRESHOLD  → mirror-RIGHT wave → Funny
 *   velocity > +THRESHOLD  → mirror-LEFT  wave → Not Funny
 */
const BUFFER_SIZE       = 10;   // frames tracked (~0.33s at 30fps)
const EARLY_FRAMES      = 3;    // oldest frames averaged for velocity start
const RECENT_FRAMES     = 3;    // newest frames averaged for velocity end
const VELOCITY_THRESHOLD = 0.15; // net displacement fraction to trigger
const CONSISTENCY_RATIO  = 0.55; // ≥55% of frame deltas must match direction
const MIN_FRAME_DELTA    = 0.004; // ignore sub-noise micro-movements
const COOLDOWN_MS        = 1200;
const STABILITY_FRAMES   = 5;

const WASM_PATH  = "/mediapipe/wasm";
const MODEL_URL  =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/* ── Hand landmark connections ── */

const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

/* ── Public types ── */

export interface GestureRatingState {
  isReady: boolean;
  handDetected: boolean;
  /** Flashes for ~700ms after a gesture fires — drives arrow highlight */
  lastSwipeDir: "left" | "right" | null;
  /** Current motion direction building toward threshold (pre-trigger feedback) */
  waveDir: "left" | "right" | null;
  /** 0-1 progress toward threshold — animate arrows as hand accelerates */
  waveProgress: number;
  /** Stable counters — only ever increment, never reset. Safe for tutorial deps */
  gestureCount: { left: number; right: number };
  /** 0 = cooling, 1 = ready */
  cooldownProgress: number;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface GestureRatingOptions {
  enabled: boolean;
  onGesture: (dir: "left" | "right") => void;
}

/* ── Skeleton drawing ── */

function drawSkeleton(landmarks: NormalizedLandmark[], canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0,230,100,0.7)";
  ctx.lineWidth = 1.5;
  for (const [a, b] of HAND_CONNECTIONS) {
    const la = landmarks[a], lb = landmarks[b];
    if (!la || !lb) continue;
    ctx.beginPath();
    ctx.moveTo(la.x * canvas.width, la.y * canvas.height);
    ctx.lineTo(lb.x * canvas.width, lb.y * canvas.height);
    ctx.stroke();
  }

  const tips = new Set([4,8,12,16,20]);
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    ctx.fillStyle = tips.has(i) ? "rgba(100,255,160,0.95)" : "rgba(0,230,100,0.85)";
    ctx.beginPath();
    ctx.arc(lm.x * canvas.width, lm.y * canvas.height, tips.has(i) ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ── Hook ── */

export function useGestureRating({ enabled, onGesture }: GestureRatingOptions): GestureRatingState {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isReady,        setIsReady]        = useState(false);
  const [handDetected,   setHandDetected]   = useState(false);
  const [lastSwipeDir,   setLastSwipeDir]   = useState<"left"|"right"|null>(null);
  const [waveDir,        setWaveDir]        = useState<"left"|"right"|null>(null);
  const [waveProgress,   setWaveProgress]   = useState(0);
  const [gestureCount,   setGestureCount]   = useState({ left: 0, right: 0 });
  const [cooldownProgress, setCooldownProgress] = useState(1);
  const [error,          setError]          = useState<string|null>(null);

  // Stable callback ref — prevents stale closures in the RAF loop
  const onGestureRef = useRef(onGesture);
  useEffect(() => { onGestureRef.current = onGesture; });

  const landmarkerRef   = useRef<HandLandmarker | null>(null);
  const rafRef          = useRef<number | null>(null);
  const cooldownRafRef  = useRef<number | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const bufferRef       = useRef<number[]>([]);
  const stabilityRef    = useRef(0);
  const cooldownEndRef  = useRef<number>(0);

  /* Cooldown ring animation */
  const animateCooldown = useCallback(() => {
    const tick = () => {
      const now = Date.now();
      if (now >= cooldownEndRef.current) { setCooldownProgress(1); return; }
      const elapsed = COOLDOWN_MS - (cooldownEndRef.current - now);
      setCooldownProgress(Math.min(1, elapsed / COOLDOWN_MS));
      cooldownRafRef.current = requestAnimationFrame(tick);
    };
    cooldownRafRef.current = requestAnimationFrame(tick);
  }, []);

  /* Fire a confirmed gesture */
  const triggerGesture = useCallback((dir: "left" | "right") => {
    cooldownEndRef.current = Date.now() + COOLDOWN_MS;
    bufferRef.current = [];
    setCooldownProgress(0);
    setWaveDir(null);
    setWaveProgress(0);
    setLastSwipeDir(dir);
    setTimeout(() => setLastSwipeDir(null), 700);
    setGestureCount((prev) => ({ ...prev, [dir]: prev[dir] + 1 }));
    onGestureRef.current(dir);
    animateCooldown();
  }, [animateCooldown]);

  /**
   * Wave detection with consistency check:
   *   1. Net velocity: avg(recent 3) - avg(oldest 3) in camera space
   *   2. Consistency: ≥55% of per-frame deltas match the net direction
   *      (filters jitter and slow drift that wouldn't feel like a wave)
   *   3. Both must pass to trigger; progress shown based on velocity alone
   */
  const detectWave = useCallback(() => {
    const buf = bufferRef.current;
    if (buf.length < BUFFER_SIZE) return;
    if (Date.now() < cooldownEndRef.current) return;

    const early  = buf.slice(0, EARLY_FRAMES).reduce((a, b) => a + b, 0) / EARLY_FRAMES;
    const recent = buf.slice(-RECENT_FRAMES).reduce((a, b) => a + b, 0) / RECENT_FRAMES;
    const velocity = recent - early; // negative = mirror-right, positive = mirror-left

    // Per-frame deltas for consistency check
    const deltas = buf.slice(1).map((x, i) => x - buf[i]!);
    const active  = deltas.filter((d) => Math.abs(d) > MIN_FRAME_DELTA);
    const aligned = active.filter((d) => Math.sign(d) === Math.sign(velocity));
    const isConsistent = active.length >= 3 && aligned.length / active.length >= CONSISTENCY_RATIO;

    // Progress toward threshold (used for arrow glow — shown even before threshold)
    const rawProgress = Math.min(1, Math.abs(velocity) / VELOCITY_THRESHOLD);
    const displayProgress = isConsistent ? rawProgress : rawProgress * 0.35;

    // Direction visible in mirror space
    const dir: "left" | "right" | null =
      Math.abs(velocity) > 0.04 ? (velocity < 0 ? "right" : "left") : null;

    setWaveDir(dir);
    setWaveProgress(displayProgress);

    if (rawProgress >= 1 && isConsistent) {
      triggerGesture(velocity < 0 ? "right" : "left");
    }
  }, [triggerGesture]);

  /* RAF frame loop */
  const processFrame = useCallback((timestamp: number) => {
    const landmarker = landmarkerRef.current;
    const video      = videoRef.current;
    const canvas     = canvasRef.current;

    if (!landmarker || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const results = landmarker.detectForVideo(video, timestamp);

    if (results.landmarks.length > 0) {
      const landmarks = results.landmarks[0]!;
      const wrist     = landmarks[0];

      stabilityRef.current = Math.min(stabilityRef.current + 1, STABILITY_FRAMES + 1);

      if (wrist) {
        bufferRef.current = [...bufferRef.current.slice(-(BUFFER_SIZE - 1)), wrist.x];
      }

      if (canvas) {
        if (canvas.width !== (video.videoWidth || 160)) {
          canvas.width  = video.videoWidth  || 160;
          canvas.height = video.videoHeight || 120;
        }
        drawSkeleton(landmarks, canvas);
      }

      setHandDetected(true);

      if (stabilityRef.current >= STABILITY_FRAMES) {
        detectWave();
      }
    } else {
      stabilityRef.current = 0;
      bufferRef.current    = [];
      setHandDetected(false);
      setWaveDir(null);
      setWaveProgress(0);
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [detectWave]);

  /* Cleanup */
  const cleanup = useCallback(() => {
    if (rafRef.current)         { cancelAnimationFrame(rafRef.current);        rafRef.current = null; }
    if (cooldownRafRef.current) { cancelAnimationFrame(cooldownRafRef.current); cooldownRafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (landmarkerRef.current)  { landmarkerRef.current.close();  landmarkerRef.current = null; }
    setIsReady(false);
    setHandDetected(false);
    setLastSwipeDir(null);
    setWaveDir(null);
    setWaveProgress(0);
    setCooldownProgress(1);
    bufferRef.current = [];
    stabilityRef.current = 0;
  }, []);

  /* Init / teardown */
  useEffect(() => {
    if (!enabled) { cleanup(); return; }

    let cancelled = false;

    async function init() {
      setError(null);
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        if (cancelled) return;

        let landmarker: HandLandmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO", numHands: 1,
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            runningMode: "VIDEO", numHands: 1,
          });
        }
        if (cancelled) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        // Poll for <video> element (GestureCamera is dynamically imported)
        let video = videoRef.current;
        if (!video) {
          await new Promise<void>((resolve) => {
            const iv = setInterval(() => {
              if (videoRef.current || cancelled) { clearInterval(iv); resolve(); }
            }, 50);
            setTimeout(() => { clearInterval(iv); resolve(); }, 3000);
          });
          video = videoRef.current;
        }
        if (!video || cancelled) return;

        video.srcObject = stream;
        if (video.readyState < 1) {
          await new Promise<void>((resolve) => { video!.onloadedmetadata = () => resolve(); });
        }
        if (cancelled) return;
        try { await video.play(); } catch { /* ignore */ }
        if (cancelled) return;

        setIsReady(true);
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error) {
          if      (err.name === "NotAllowedError") setError("Camera denied — allow access to use gestures.");
          else if (err.name === "NotFoundError")   setError("No camera found.");
          else                                     setError("Could not start gesture mode.");
        } else {
          setError("Could not start gesture mode.");
        }
      }
    }

    init();
    return () => { cancelled = true; cleanup(); };
  }, [enabled, processFrame, cleanup]);

  return { isReady, handDetected, lastSwipeDir, waveDir, waveProgress, gestureCount, cooldownProgress, error, videoRef, canvasRef };
}
