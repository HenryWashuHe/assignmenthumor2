"use client";

import { useEffect, useRef } from "react";

/* ── Constants ── */

const W = 420;
const H = 600;
const HIGH_SCORE_KEY = "captionBubble_highScore";

const EMOJIS = [
  "😂", "🔥", "💀", "⭐", "🎯", "🤡", "💎", "🤣",
  "😈", "👑", "🌟", "💥", "🎭", "🤩", "🥲", "😤",
];

const BUBBLE_COLORS: Array<{ fill: string; glow: string }> = [
  { fill: "#ff6b6b", glow: "#ff0040" },
  { fill: "#feca57", glow: "#f9ca24" },
  { fill: "#48dbfb", glow: "#00b8d9" },
  { fill: "#ff9ff3", glow: "#f368e0" },
  { fill: "#54a0ff", glow: "#2e86de" },
  { fill: "#a29bfe", glow: "#6c5ce7" },
  { fill: "#00d2d3", glow: "#01aaa3" },
  { fill: "#ff9f43", glow: "#e67e22" },
  { fill: "#55efc4", glow: "#00b894" },
];

/* ── Types ── */

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
  emoji: string;
  points: number;
  fill: string;
  glow: string;
  alive: boolean;
  popping: boolean;
  popFrame: number;
  pulseOffset: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  decay: number;
}

interface FloatText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  life: number;
  decay: number;
}

interface GameState {
  bubbles: Bubble[];
  particles: Particle[];
  texts: FloatText[];
  score: number;
  lives: number;
  combo: number;
  comboTimeout: number;
  nextId: number;
  spawnTimer: number;
  spawnInterval: number;
  running: boolean;
  gameOver: boolean;
  screenFlash: number;
  flashColor: string;
}

/* ── Helpers ── */

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function makeBubble(id: number, level: number): Bubble {
  const color = BUBBLE_COLORS[randInt(0, BUBBLE_COLORS.length - 1)];
  const radius = Math.max(22, rand(28, 44) - level * 1.2);
  return {
    id,
    x: rand(radius + 20, W - radius - 20),
    y: H + radius + 10,
    radius,
    vy: rand(0.8, 1.7) + level * 0.18,
    phase: rand(0, Math.PI * 2),
    phaseSpeed: rand(0.02, 0.048),
    emoji: EMOJIS[randInt(0, EMOJIS.length - 1)],
    points: [50, 75, 100, 150, 200][randInt(0, 4)],
    fill: color.fill,
    glow: color.glow,
    alive: true,
    popping: false,
    popFrame: 0,
    pulseOffset: rand(0, Math.PI * 2),
  };
}

function spawnParticles(x: number, y: number, color: string): Particle[] {
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + rand(-0.25, 0.25);
    const speed = rand(2.5, 7.5);
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: rand(3, 7),
      life: 1,
      decay: rand(0.03, 0.06),
    };
  });
}

/* ── Component ── */

export interface PinballGameProps {
  onClose: () => void;
}

export default function PinballGame({ onClose }: PinballGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    bubbles: [],
    particles: [],
    texts: [],
    score: 0,
    lives: 5,
    combo: 0,
    comboTimeout: 0,
    nextId: 0,
    spawnTimer: 0,
    spawnInterval: 90,
    running: true,
    gameOver: false,
    screenFlash: 0,
    flashColor: "#ffffff",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;
    const s = stateRef.current;

    // Reset running flag (handles React Strict Mode double-invoke)
    s.running = true;
    s.gameOver = false;
    s.bubbles = [];
    s.particles = [];
    s.texts = [];
    s.score = 0;
    s.lives = 5;
    s.combo = 0;
    s.comboTimeout = 0;
    s.nextId = 0;
    s.spawnTimer = 0;
    s.screenFlash = 0;

    let rafId = 0;
    let frame = 0;

    function getLevel() {
      return Math.floor(s.score / 600);
    }

    function popBubble(b: Bubble) {
      if (!b.alive || b.popping) return;
      b.alive = false;
      b.popping = true;

      s.comboTimeout = 90;
      s.combo++;
      const mult = s.combo >= 5 ? 4 : s.combo >= 3 ? 2 : 1;
      const earned = b.points * mult;
      s.score += earned;

      s.particles.push(...spawnParticles(b.x, b.y, b.fill));

      const label = mult > 1 ? `+${earned}  ×${mult}!` : `+${earned}`;
      s.texts.push({
        x: b.x,
        y: b.y - b.radius - 8,
        vy: -1.8,
        text: label,
        color: mult > 1 ? "#feca57" : "#ffffff",
        size: mult > 1 ? 20 : 15,
        life: 1,
        decay: 0.022,
      });

      if (s.combo >= 5) {
        s.screenFlash = 0.45;
        s.flashColor = "#feca57";
      } else if (s.combo >= 3) {
        s.screenFlash = 0.22;
        s.flashColor = b.fill;
      }

      const prev = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10);
      if (s.score > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, String(s.score));
      }
    }

    function handlePop(clientX: number, clientY: number) {
      if (s.gameOver) {
        // Restart
        s.bubbles = [];
        s.particles = [];
        s.texts = [];
        s.score = 0;
        s.lives = 5;
        s.combo = 0;
        s.comboTimeout = 0;
        s.spawnTimer = 0;
        s.gameOver = false;
        s.screenFlash = 0;
        return;
      }

      const rect = canvas!.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (clientX - rect.left) * scaleX;
      const my = (clientY - rect.top) * scaleY;

      let hit = false;
      for (const b of s.bubbles) {
        if (!b.alive || b.popping) continue;
        const dist = Math.sqrt((mx - b.x) ** 2 + (my - b.y) ** 2);
        if (dist < b.radius + 8) {
          popBubble(b);
          hit = true;
          break;
        }
      }
      if (!hit && s.combo > 0) {
        s.combo = 0;
        s.screenFlash = 0.12;
        s.flashColor = "#ff4444";
      }
    }

    function onClick(e: MouseEvent) {
      handlePop(e.clientX, e.clientY);
    }
    function onTouch(e: TouchEvent) {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        handlePop(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    /* ── Draw ── */

    function drawBg() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#080712");
      grad.addColorStop(1, "#0e0820");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // Subtle dot grid
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      for (let gx = 20; gx < W; gx += 40) {
        for (let gy = 20; gy < H; gy += 40) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawBubble(b: Bubble) {
      const popT = Math.min(1, b.popFrame / 12);
      const r = b.popping ? b.radius * (1 + popT * 1.3) : b.radius * (1 + Math.sin(frame * 0.06 + b.pulseOffset) * 0.04);
      const alpha = b.popping ? Math.max(0, 1 - popT) : 1;
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer glow halo
      const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.4);
      glow.addColorStop(0, b.glow + "50");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Main bubble — glossy radial gradient
      const fillGrad = ctx.createRadialGradient(
        b.x - r * 0.3, b.y - r * 0.35, r * 0.05,
        b.x, b.y, r
      );
      fillGrad.addColorStop(0, "rgba(255,255,255,0.5)");
      fillGrad.addColorStop(0.25, b.fill + "cc");
      fillGrad.addColorStop(1, b.glow + "99");
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Rim with glow
      ctx.shadowColor = b.glow;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = b.fill;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Specular highlight
      const spec = ctx.createRadialGradient(
        b.x - r * 0.28, b.y - r * 0.32, 0,
        b.x - r * 0.28, b.y - r * 0.32, r * 0.28
      );
      spec.addColorStop(0, "rgba(255,255,255,0.65)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(b.x - r * 0.28, b.y - r * 0.32, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // Emoji
      ctx.font = `${Math.round(r * 0.92)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.emoji, b.x, b.y + 1);

      // Points label below emoji
      if (!b.popping) {
        ctx.font = `bold ${Math.round(r * 0.3)}px monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`+${b.points}`, b.x, b.y + r * 0.7);
      }

      ctx.restore();
    }

    function drawParticle(p: Particle) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawFloatText(t: FloatText) {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.font = `bold ${t.size}px monospace`;
      ctx.fillStyle = t.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 14;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    function drawHUD() {
      const highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10);
      ctx.save();

      // Score — center top
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(255,255,255,0.25)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(s.score), W / 2, 28);

      ctx.shadowBlur = 0;
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.fillText(`best ${highScore}`, W / 2, 46);

      // Lives — right side as hearts
      ctx.font = "16px sans-serif";
      ctx.textAlign = "right";
      for (let i = 4; i >= 0; i--) {
        ctx.globalAlpha = i < s.lives ? 1 : 0.14;
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("♥", W - 10 - (4 - i) * 20, 28);
      }
      ctx.globalAlpha = 1;

      // Level — left side
      const lvl = getLevel();
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "left";
      ctx.fillText(`LVL ${lvl + 1}`, 12, 28);

      // Combo badge — floats below score
      if (s.combo >= 2 && s.comboTimeout > 0) {
        const a = Math.min(1, s.comboTimeout / 25);
        ctx.globalAlpha = a;
        const comboSize = s.combo >= 5 ? 26 : 18;
        ctx.font = `bold ${comboSize}px monospace`;
        ctx.fillStyle = s.combo >= 5 ? "#feca57" : "#ff9ff3";
        ctx.textAlign = "center";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fillText(`${s.combo}× COMBO!`, W / 2, 72);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawHint() {
      if (frame > 130) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - frame / 100) * 0.7;
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textAlign = "center";
      ctx.fillText("Tap bubbles before they escape!", W / 2, H - 16);
      ctx.restore();
    }

    function drawGameOver() {
      ctx.save();

      // Dark scrim
      ctx.fillStyle = "rgba(5, 3, 16, 0.82)";
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.textAlign = "center";
      ctx.font = "bold 40px monospace";
      ctx.fillStyle = "#ff6b6b";
      ctx.shadowColor = "#ff4040";
      ctx.shadowBlur = 28;
      ctx.fillText("GAME OVER", W / 2, H / 2 - 52);

      // Score
      ctx.shadowBlur = 0;
      ctx.font = "bold 30px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${s.score} pts`, W / 2, H / 2);

      const best = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10);
      ctx.font = "14px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`Best: ${best}`, W / 2, H / 2 + 32);

      // Pulsing replay prompt
      const pulse = 0.55 + Math.sin(frame * 0.09) * 0.45;
      ctx.globalAlpha = pulse;
      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "#feca57";
      ctx.shadowColor = "#feca57";
      ctx.shadowBlur = 16;
      ctx.fillText("TAP ANYWHERE TO PLAY AGAIN", W / 2, H / 2 + 76);

      ctx.restore();
    }

    /* ── Game loop ── */

    function tick() {
      if (!s.running) return;
      frame++;

      if (!s.gameOver) {
        // Spawn
        const level = getLevel();
        s.spawnInterval = Math.max(35, 90 - level * 9);
        s.spawnTimer++;
        if (s.spawnTimer >= s.spawnInterval) {
          s.spawnTimer = 0;
          s.bubbles.push(makeBubble(s.nextId++, level));
          if (level >= 4 && Math.random() < 0.45) {
            s.bubbles.push(makeBubble(s.nextId++, level));
          }
        }

        // Update bubbles
        for (const b of s.bubbles) {
          if (b.popping) {
            b.popFrame++;
            if (b.popFrame > 13) {
              b.alive = false;
              b.popping = false;
            }
          } else if (b.alive) {
            b.y -= b.vy;
            b.phase += b.phaseSpeed;
            b.x += Math.sin(b.phase) * 0.65;
            b.x = Math.max(b.radius + 12, Math.min(W - b.radius - 12, b.x));
            if (b.y + b.radius < 0) {
              b.alive = false;
              s.lives = Math.max(0, s.lives - 1);
              s.combo = 0;
              s.screenFlash = 0.28;
              s.flashColor = "#ff4444";
              if (s.lives === 0) s.gameOver = true;
            }
          }
        }
        s.bubbles = s.bubbles.filter((b) => b.alive || b.popping);

        if (s.comboTimeout > 0) {
          s.comboTimeout--;
        } else if (s.combo > 0) {
          s.combo = 0;
        }
      }

      // Particles
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.vx *= 0.96;
        p.life -= p.decay;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      // Float texts
      for (const t of s.texts) {
        t.y += t.vy;
        t.life -= t.decay;
      }
      s.texts = s.texts.filter((t) => t.life > 0);

      // Screen flash decay
      if (s.screenFlash > 0.005) s.screenFlash *= 0.82;

      /* ── Render ── */
      drawBg();
      if (s.screenFlash > 0.005) {
        ctx.save();
        ctx.globalAlpha = s.screenFlash;
        ctx.fillStyle = s.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      for (const b of s.bubbles) drawBubble(b);
      for (const p of s.particles) drawParticle(p);
      for (const t of s.texts) drawFloatText(t);
      drawHUD();
      drawHint();
      if (s.gameOver) drawGameOver();

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      s.running = false;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouch);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            display: "block",
            maxWidth: "min(92vw, 420px)",
            maxHeight: "min(82vh, 600px)",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "0 0 60px rgba(100,50,220,0.45), 0 24px 60px rgba(0,0,0,0.65)",
            cursor: "crosshair",
            touchAction: "none",
          }}
        />
        <button
          type="button"
          aria-label="Close game"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#fff",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Instructions row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "min(92vw, 420px)",
        }}
      >
        {[
          { icon: "👆", text: "Tap bubbles to pop them" },
          { icon: "💨", text: "Don't let them escape" },
          { icon: "🔥", text: "Chain pops for combos" },
        ].map(({ icon, text }) => (
          <div
            key={text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap",
            }}
          >
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
