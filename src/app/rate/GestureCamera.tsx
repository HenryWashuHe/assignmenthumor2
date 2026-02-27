"use client";

import type { GestureRatingState } from "./useGestureRating";
import gStyles from "./gesture.module.css";

interface Props {
  state: GestureRatingState;
}

/* ── Cooldown arc ── */

function CooldownRing({ progress }: { progress: number }) {
  const rx = 74, ry = 56;
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const dash = perimeter * progress;
  return (
    <svg className={gStyles.cooldownSvg} viewBox="0 0 168 108" aria-hidden="true">
      <ellipse cx="84" cy="54" rx={rx} ry={ry} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
      <ellipse cx="84" cy="54" rx={rx} ry={ry} fill="none"
        stroke={progress < 0.99 ? "rgba(0,220,100,0.7)" : "transparent"}
        strokeWidth="2.5"
        strokeDasharray={`${dash} ${perimeter}`}
        strokeLinecap="round"
        transform="rotate(-90 84 54)"
        style={{ transition: "stroke-dasharray 80ms linear" }}
      />
    </svg>
  );
}

/* ── Arrow block — three visual states:
     idle      → dim
     building  → glows proportional to waveProgress
     triggered → full flash + nudge animation          ── */

function Arrow({
  dir,
  label,
  waveActive,
  waveProgress,
  triggered,
}: {
  dir: "left" | "right";
  label: string;
  waveActive: boolean;
  waveProgress: number;
  triggered: boolean;
}) {
  const glyph = dir === "left" ? "←" : "→";

  // Brightness: 0.3 idle → up to 0.9 while building → 1 on trigger
  const brightness = triggered ? 1 : waveActive ? 0.3 + waveProgress * 0.6 : 0.3;
  const scale      = triggered ? 1 : waveActive ? 1 + waveProgress * 0.12 : 1;

  const activeColor = dir === "right" ? "rgb(0,210,75)"   : "rgb(215,55,55)";
  const idleColor   = "rgba(160,160,160,0.5)";

  return (
    <div
      className={`${gStyles.arrowBlock} ${triggered ? (dir === "right" ? gStyles.arrowTriggeredRight : gStyles.arrowTriggeredLeft) : ""}`}
      style={{ opacity: brightness }}
      aria-hidden="true"
    >
      <span
        className={gStyles.arrowGlyph}
        style={{
          color:     (waveActive || triggered) ? activeColor : idleColor,
          transform: `scale(${scale})`,
          transition: "color 150ms, transform 100ms",
        }}
      >
        {glyph}
      </span>
      <span
        className={gStyles.arrowHint}
        style={{ color: (waveActive || triggered) ? activeColor : idleColor, transition: "color 150ms" }}
      >
        {label}
      </span>
      {/* Progress bar under the arrow — fills as hand accelerates */}
      <div className={gStyles.arrowProgressTrack}>
        <div
          className={gStyles.arrowProgressFill}
          style={{
            width: `${(waveActive ? waveProgress : triggered ? 1 : 0) * 100}%`,
            background: activeColor,
            transition: waveActive ? "width 60ms linear" : "width 120ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

/* ── Main HUD ── */

export default function GestureCamera({ state }: Props) {
  const { videoRef, canvasRef, isReady, handDetected,
          lastSwipeDir, waveDir, waveProgress, cooldownProgress, error } = state;

  const isCooling = cooldownProgress < 0.99;
  const statusText = error       ? "Error"
    : !isReady                   ? "Loading…"
    : isCooling                  ? "Wait…"
    : handDetected               ? "Ready — wave!"
    :                              "Show hand";

  return (
    <div className={gStyles.hud} aria-label="Gesture camera">
      <div className={gStyles.arrowRow}>

        <Arrow
          dir="left"
          label="Nope"
          waveActive={waveDir === "left" && !isCooling}
          waveProgress={waveDir === "left" ? waveProgress : 0}
          triggered={lastSwipeDir === "left"}
        />

        <div className={gStyles.hudPreview}>
          <video ref={videoRef} autoPlay playsInline muted
            className={gStyles.hudVideo} aria-hidden="true" />
          <canvas ref={canvasRef} className={gStyles.hudCanvas} aria-hidden="true" />
          <div className={`${gStyles.detectionRing}
            ${handDetected && !isCooling ? gStyles.detectionRingActive : ""}
            ${isCooling ? gStyles.detectionRingCooling : ""}`}
          />
          <CooldownRing progress={cooldownProgress} />
          {!isReady && !error && <div className={gStyles.hudLoading}>Loading…</div>}
          {error         && <div className={gStyles.cameraError}>{error}</div>}
        </div>

        <Arrow
          dir="right"
          label="Funny"
          waveActive={waveDir === "right" && !isCooling}
          waveProgress={waveDir === "right" ? waveProgress : 0}
          triggered={lastSwipeDir === "right"}
        />

      </div>
      <p className={`${gStyles.hudStatus} ${handDetected && !isCooling ? gStyles.hudStatusReady : ""}`}>
        {statusText}
      </p>
    </div>
  );
}
