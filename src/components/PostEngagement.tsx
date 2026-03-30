"use client";

import { useEffect, useRef, useState } from "react";
import { REACTIONS, type Reaction } from "@/lib/reactions";

type Stats = {
  slug: string;
  views: number;
  reactions: Record<Reaction, number>;
  myReactions: string[];
};

type Props = {
  slug: string;
  initialStats: Stats;
};

type BurstParticle = {
  id: number;
  emoji: Reaction;
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

type CelebrationState = {
  activeEmoji: Reaction | null;
  particles: BurstParticle[];
};

// ---------------------------------------------------------------------------
// Shared hook — SSE subscription + view recording + react handler
// ---------------------------------------------------------------------------

function useEngagement(slug: string, initialStats: Stats) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [pending, setPending] = useState<string | null>(null);
  const viewRecorded = useRef(false);

  // Record view once
  useEffect(() => {
    if (viewRecorded.current) return;
    viewRecorded.current = true;
    fetch(`/api/posts/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/posts/${slug}/live`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Stats;
        setStats((prev) => ({
          ...data,
          myReactions: data.myReactions.length > 0 ? data.myReactions : prev.myReactions,
        }));
      } catch {}
    };

    return () => es.close();
  }, [slug]);

  const handleReact = async (emoji: Reaction) => {
    if (pending) return;
    setPending(emoji);

    const alreadyReacted = stats.myReactions.includes(emoji);

    // Optimistic update
    setStats((prev) => ({
      ...prev,
      reactions: {
        ...prev.reactions,
        [emoji]: Math.max(0, (prev.reactions[emoji] ?? 0) + (alreadyReacted ? -1 : 1)),
      },
      myReactions: alreadyReacted
        ? prev.myReactions.filter((e) => e !== emoji)
        : [...prev.myReactions, emoji],
    }));

    try {
      const res = await fetch(`/api/posts/${slug}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = (await res.json()) as { stats: Stats };
        setStats(data.stats);
      }
    } catch {
      // Revert
      setStats((prev) => ({
        ...prev,
        reactions: {
          ...prev.reactions,
          [emoji]: Math.max(0, (prev.reactions[emoji] ?? 0) + (alreadyReacted ? 1 : -1)),
        },
        myReactions: alreadyReacted
          ? [...prev.myReactions, emoji]
          : prev.myReactions.filter((e) => e !== emoji),
      }));
    } finally {
      setPending(null);
    }
  };

  return { stats, pending, handleReact };
}

// ---------------------------------------------------------------------------
// PostEngagement — sidebar views counter
// ---------------------------------------------------------------------------

export default function PostEngagement({ slug, initialStats }: Props) {
  const { stats } = useEngagement(slug, initialStats);

  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
        Views
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="tabular-nums text-xl font-semibold tracking-[-0.04em] text-white">
          {stats.views.toLocaleString()}
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">unique</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReactionBar — floating card anchored to the article's bottom-left corner
// ---------------------------------------------------------------------------

export function ReactionBar({ slug, initialStats }: Props) {
  const { stats, pending, handleReact } = useEngagement(slug, initialStats);
  const [celebration, setCelebration] = useState<CelebrationState>({
    activeEmoji: null,
    particles: [],
  });
  const particleIdRef = useRef(0);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAny = REACTIONS.some((e) => (stats.reactions[e] ?? 0) > 0);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (particleCleanupTimerRef.current) clearTimeout(particleCleanupTimerRef.current);
    };
  }, []);

  const launchCelebration = (emoji: Reaction) => {
    const particles: BurstParticle[] = Array.from({ length: 7 }, (_, index) => {
      const spread = index - 3;
      return {
        id: particleIdRef.current++,
        emoji,
        x: spread * 16 + (spread % 2 === 0 ? 0 : 6),
        y: -42 - Math.abs(spread) * 10,
        rotate: spread * 18,
        scale: 0.72 + (index % 3) * 0.12,
      };
    });

    setCelebration({
      activeEmoji: emoji,
      particles,
    });

    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    if (particleCleanupTimerRef.current) clearTimeout(particleCleanupTimerRef.current);

    celebrationTimerRef.current = setTimeout(() => {
      setCelebration((prev) => ({ ...prev, activeEmoji: null }));
    }, 620);

    particleCleanupTimerRef.current = setTimeout(() => {
      setCelebration({ activeEmoji: null, particles: [] });
    }, 780);
  };

  const onReact = (emoji: Reaction, alreadyReacted: boolean) => {
    if (!alreadyReacted) {
      launchCelebration(emoji);
    }
    void handleReact(emoji);
  };

  return (
    <>
      <style>{`
        @keyframes reaction-chip-pop {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          22% {
            transform: translate3d(0, -7px, 0) scale(1.14);
          }
          48% {
            transform: translate3d(0, 1px, 0) scale(0.97);
          }
          72% {
            transform: translate3d(0, -2px, 0) scale(1.03);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes reaction-emoji-jelly {
          0% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
            filter: saturate(1);
          }
          18% {
            transform: translate3d(0, -2px, 0) scale(1.22, 1.18) rotate(-5deg);
            filter: saturate(1.22);
          }
          42% {
            transform: translate3d(0, 1px, 0) scale(0.96, 0.98) rotate(3deg);
            filter: saturate(1.08);
          }
          64% {
            transform: translate3d(0, 0, 0) scale(1.04) rotate(-1deg);
            filter: saturate(1.04);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
            filter: saturate(1);
          }
        }

        @keyframes reaction-count-bump {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
          28% {
            transform: translate3d(0, -3px, 0) scale(1.1);
            opacity: 1;
          }
          58% {
            transform: translate3d(0, 1px, 0) scale(0.98);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }

        @keyframes reaction-burst {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.6) rotate(0deg);
            filter: blur(1px);
          }
          20% {
            opacity: 0.95;
            transform: translate3d(calc(var(--rx) * 0.22), calc(var(--ry) * 0.22), 0) scale(1) rotate(calc(var(--rr) * 0.2));
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--rx), var(--ry), 0) scale(var(--rs)) rotate(var(--rr));
            filter: blur(0.5px);
          }
        }

        @keyframes reaction-glow-ring {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.7);
          }
          30% {
            opacity: 0.38;
            transform: translate(-50%, -50%) scale(1.08);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.38);
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "28px",
          display: "flex",
          alignItems: "center",
          gap: "2px",
          background: "#080c12",
          border: "1px solid #1e2c3a",
          padding: "4px 6px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03) inset",
          zIndex: 10,
          overflow: "visible",
        }}
      >
        {REACTIONS.map((emoji) => {
          const count = stats.reactions[emoji] ?? 0;
          const reacted = stats.myReactions.includes(emoji);
          const isPending = pending === emoji;
          const showCount = count > 0;
          const isCelebrating = celebration.activeEmoji === emoji;

          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji, reacted)}
              disabled={isPending || pending !== null}
              title={reacted ? `Remove ${emoji}` : `React with ${emoji}`}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: showCount ? "3px 7px 3px 5px" : "3px 5px",
                border: reacted ? "1px solid #1d3f60" : "1px solid transparent",
                background: reacted ? "#091928" : "transparent",
                transition:
                  "border-color 130ms ease, background 130ms ease, opacity 130ms ease, transform 80ms ease",
                opacity: isPending ? 0.5 : 1,
                transform: isPending ? "scale(0.93)" : "scale(1)",
                overflow: "visible",
                animation: isCelebrating
                  ? "reaction-chip-pop 620ms cubic-bezier(0.2, 0.9, 0.25, 1)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (pending) return;
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = reacted ? "#2a5a8a" : "#1e2c3a";
                el.style.background = reacted ? "#0c2236" : "#0d1521";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = reacted ? "#1d3f60" : "transparent";
                el.style.background = reacted ? "#091928" : "transparent";
              }}
            >
              {isCelebrating && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: "22px",
                      height: "22px",
                      borderRadius: "999px",
                      border: "1px solid rgba(125, 211, 252, 0.32)",
                      boxShadow: "0 0 12px rgba(125, 211, 252, 0.14)",
                      pointerEvents: "none",
                      animation: "reaction-glow-ring 620ms cubic-bezier(0.2, 0.9, 0.25, 1) both",
                    }}
                  />

                  {celebration.particles.map((particle) => (
                    <span
                      key={particle.id}
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        marginLeft: "-6px",
                        marginTop: "-8px",
                        fontSize: "13px",
                        lineHeight: 1,
                        pointerEvents: "none",
                        userSelect: "none",
                        textShadow: "0 2px 6px rgba(0,0,0,0.22)",
                        ["--rx" as string]: `${particle.x}px`,
                        ["--ry" as string]: `${particle.y}px`,
                        ["--rr" as string]: `${particle.rotate}deg`,
                        ["--rs" as string]: `${particle.scale}`,
                        animation: "reaction-burst 760ms cubic-bezier(0.22, 0.9, 0.3, 1) forwards",
                      }}
                    >
                      {particle.emoji}
                    </span>
                  ))}
                </>
              )}

              <span
                style={{
                  fontSize: "15px",
                  lineHeight: 1,
                  filter: reacted ? "none" : "grayscale(0.25)",
                  transition: "filter 130ms ease",
                  display: "inline-block",
                  transformOrigin: "50% 60%",
                  animation: isCelebrating
                    ? "reaction-emoji-jelly 540ms cubic-bezier(0.2, 0.9, 0.25, 1)"
                    : "none",
                }}
              >
                {emoji}
              </span>

              {showCount && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: reacted ? "#7dd3fc" : "#4a5c70",
                    fontVariantNumeric: "tabular-nums",
                    transition: "color 130ms ease",
                    lineHeight: 1,
                    display: "inline-block",
                    animation: isCelebrating
                      ? "reaction-count-bump 520ms cubic-bezier(0.2, 0.9, 0.25, 1)"
                      : "none",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {!hasAny && (
          <span
            style={{
              marginLeft: "4px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#2e3f52",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            React
          </span>
        )}
      </div>
    </>
  );
}
