import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface GameState { current_cycle: number; total_cycles: number; extra_cycles: number; status: string; }
interface GameEvent { id: number; title: string; body: string; category: string; game_cycle: number; }
interface LeaderboardEntry { rank: number; player_id: number; name: string; cash: number; securities_value: number; total_value: number; performance: number; }
interface StockPerf { id: number; ticker: string; name: string; sector: string; current_price: number; cycle_change_pct: number; }

/* ─── Constants ───────────────────────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  geopolitica: "#ef4444",
  macroeconomia: "#f59e0b",
  regolamentazione: "#22d3ee",
  tech_disruption: "#a78bfa",
  crisi_ambientale: "#10b981",
  cigno_nero: "#fbbf24",
  default: "#64748b",
};
const catColor = (c: string) => CATEGORY_COLORS[c.toLowerCase()] ?? CATEGORY_COLORS.default;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  no_game: { label: "NO GAME", color: "#475569" },
  setup: { label: "SETUP", color: "#3b82f6" },
  events_generated: { label: "EVENTI", color: "#8b5cf6" },
  decision: { label: "TRADING OPEN", color: "#10b981" },
  closed: { label: "CLOSED", color: "#f59e0b" },
  finished: { label: "FINISHED", color: "#10b981" },
};

const fmtVal = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

/* ─── Timer helpers ───────────────────────────────────────────────────────── */

interface TimerState { total_seconds: number; remaining_seconds: number; running: boolean; }

function fmtTimer(secs: number): string {
  const s = Math.max(0, Math.ceil(secs));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */

const STYLES = `
  @keyframes news-in {
    from { opacity:0; transform:translateY(24px) scale(0.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .news-in { animation: news-in 0.55s cubic-bezier(0.16,1,0.3,1) forwards; }

  @keyframes pulse-dot { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:0.4; transform:scale(0.8);} }
  .pulse-dot { animation: pulse-dot 1.6s ease-in-out infinite; }

  @keyframes timer-urgent { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  .timer-urgent { animation: timer-urgent 0.7s ease-in-out infinite; }

  @keyframes lb-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .lb-track { display:flex; animation: lb-scroll 80s linear infinite; width:max-content; }
  .lb-track:hover { animation-play-state:paused; }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#1e1e35; border-radius:2px; }

  @keyframes podium-bg-in { from{opacity:0} to{opacity:1} }
  @keyframes podium-title-in { from{opacity:0;transform:translateY(-30px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes podium-block-rise { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
  @keyframes podium-player-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes confetti-fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes glow-pulse { 0%,100%{box-shadow:0 0 40px #fbbf2460,0 0 100px #fbbf2420} 50%{box-shadow:0 0 80px #fbbf2490,0 0 160px #fbbf2450} }
  @keyframes crown-float { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-10px) rotate(3deg)} }
  .podium-bg { animation: podium-bg-in 0.6s ease forwards; }
  .podium-title { animation: podium-title-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
  .podium-block-1 { transform-origin: bottom; animation: podium-block-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s both; }
  .podium-block-2 { transform-origin: bottom; animation: podium-block-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.8s both; }
  .podium-block-3 { transform-origin: bottom; animation: podium-block-rise 0.7s cubic-bezier(0.16,1,0.3,1) 1.0s both; }
  .podium-p1 { animation: podium-player-in 0.6s ease 1.4s both; }
  .podium-p2 { animation: podium-player-in 0.6s ease 1.6s both; }
  .podium-p3 { animation: podium-player-in 0.6s ease 1.8s both; }
  .glow-gold { animation: glow-pulse 2s ease-in-out infinite; }
  .crown-anim { animation: crown-float 2.5s ease-in-out 2s infinite; display:inline-block; }

  @keyframes dq-fade-in { from{opacity:0} to{opacity:1} }
  @keyframes dq-slide-in { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes dq-item-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .dq-bg { animation: dq-fade-in 0.5s ease forwards; }
  .dq-content { animation: dq-slide-in 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
`;

/* ─── App ─────────────────────────────────────────────────────────────────── */

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stocksPerf, setStocksPerf] = useState<StockPerf[]>([]);
  const [visibleCards, setVisibleCards] = useState(0);
  const [podiumData, setPodiumData] = useState<{ show: boolean; leaderboard: LeaderboardEntry[] }>({ show: false, leaderboard: [] });
  const [volpeDoroData, setVolpeDoroData] = useState<{ show: boolean; winner: VolpeDoroWinner | null }>({ show: false, winner: null });
  const [dietroQuinteData, setDietroQuinteData] = useState<{ show: boolean; slide: number }>({ show: false, slide: 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timer, setTimer] = useState<TimerState>({ total_seconds: 300, remaining_seconds: 300, running: false });
  const prevCycleRef = useRef<number | null>(null);
  const stylesRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stylesRef.current) return;
    stylesRef.current = true;
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    document.body.style.cssText = "margin:0;padding:0;overflow:hidden;background:#0b0b16;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";
  }, []);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      (rootRef.current ?? document.documentElement).requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  // ── Timer polling (500ms) ──
  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const res = await axios.get<TimerState>("/api/timer");
        setTimer(res.data);
      } catch { /* silent */ }
    };
    fetchTimer();
    const t = setInterval(fetchTimer, 500);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [gs, ev, lb, sp] = await Promise.allSettled([
        axios.get<GameState>("/api/game/state"),
        axios.get<GameEvent[]>("/api/events/current"),
        axios.get<LeaderboardEntry[]>("/api/leaderboard"),
        axios.get<StockPerf[]>("/api/stocks/performance"),
      ]);
      if (gs.status === "fulfilled") {
        const data = gs.value.data;
        const newCycle = data.current_cycle;
        if (prevCycleRef.current !== null && prevCycleRef.current !== newCycle) setVisibleCards(0);
        prevCycleRef.current = newCycle;
        setGameState(data.status ? data : null);
      }
      if (ev.status === "fulfilled") setEvents(Array.isArray(ev.value.data) ? ev.value.data : []);
      if (lb.status === "fulfilled") setLeaderboard(Array.isArray(lb.value.data) ? lb.value.data : []);
      if (sp.status === "fulfilled") setStocksPerf(Array.isArray(sp.value.data) ? sp.value.data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 8000);
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    if (visibleCards < events.length) {
      const t = setTimeout(() => setVisibleCards(v => v + 1), 700);
      return () => clearTimeout(t);
    }
  }, [visibleCards, events.length]);

  useEffect(() => {
    const fetchPodium = async () => {
      try {
        const res = await axios.get<{ show: boolean; leaderboard: LeaderboardEntry[] }>("/api/game/podium");
        setPodiumData(res.data);
      } catch { /* silent */ }
    };
    fetchPodium();
    const t = setInterval(fetchPodium, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchVolpeDoro = async () => {
      try {
        const res = await axios.get("/api/game/volpe-doro");
        setVolpeDoroData(res.data);
      } catch { /* silent */ }
    };
    fetchVolpeDoro();
    const t = setInterval(fetchVolpeDoro, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchDietroQuinte = async () => {
      try {
        const res = await axios.get("/api/game/dietro-quinte");
        setDietroQuinteData(res.data);
      } catch { /* silent */ }
    };
    fetchDietroQuinte();
    const t = setInterval(fetchDietroQuinte, 4000);
    return () => clearInterval(t);
  }, []);

  const statusInfo = gameState
    ? (STATUS_MAP[gameState.status] ?? { label: gameState.status.toUpperCase(), color: "#475569" })
    : { label: "---", color: "#475569" };

  const topGainers = [...stocksPerf].sort((a, b) => b.cycle_change_pct - a.cycle_change_pct).slice(0, 4);
  const topLosers = [...stocksPerf].sort((a, b) => a.cycle_change_pct - b.cycle_change_pct).slice(0, 4);
  const lbItems = leaderboard.length > 0 ? [...leaderboard, ...leaderboard] : [];
  const isWindDown = !!gameState && gameState.current_cycle > gameState.total_cycles;

  return (
    <div ref={rootRef} style={{ fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", background: "#0b0b16", color: "#e2e8f0", width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 80,
        background: "rgba(10,10,22,0.98)",
        borderBottom: "1px solid rgba(139,92,246,0.12)",
        flexShrink: 0,
        backdropFilter: "blur(20px)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 18, color: "#fff",
            boxShadow: "0 0 24px rgba(124,58,237,0.45)",
            flexShrink: 0,
          }}>MN</div>
          <div>
            <div style={{ fontSize: 34, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 6, color: "#fff", lineHeight: 1 }}>MARKET NEWS</div>
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: 3, marginTop: 3, textTransform: "uppercase" }}>Investment Portfolio Simulator</div>
          </div>
        </div>

        {/* Center: game info */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {gameState && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, padding: "10px 24px", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Ciclo</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 46, fontFamily: "'Bebas Neue', sans-serif", color: "#a78bfa", lineHeight: 1, letterSpacing: 2 }}>{gameState.current_cycle}</span>
                  <span style={{ fontSize: 24, color: "#475569", fontFamily: "'Bebas Neue', sans-serif" }}>/</span>
                  <span style={{ fontSize: 34, fontFamily: "'Bebas Neue', sans-serif", color: "#64748b", letterSpacing: 1 }}>{gameState.total_cycles}</span>
                </div>
              </div>
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: statusInfo.color + "14",
            border: `1px solid ${statusInfo.color}40`,
            padding: "10px 20px", borderRadius: 30,
          }}>
            {gameState?.status === "decision" && (
              <div className="pulse-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 19, fontFamily: "'Bebas Neue', sans-serif", color: statusInfo.color, letterSpacing: 3 }}>{statusInfo.label}</span>
          </div>
        </div>

        {/* Timer + Fullscreen */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, justifyContent: "flex-end" }}>
          <TVTimer timer={timer} />
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Esci dal fullscreen (F)" : "Fullscreen (F)"}
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 10,
              width: 42, height: 42,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s",
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.25)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.25)"; }}
          >
            {isFullscreen ? (
              /* compress icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            ) : (
              /* expand icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/>
                <path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Breaking News */}
        <main style={{ flex: 1, padding: "28px 48px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Section label */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 24, borderRadius: 2, background: "linear-gradient(180deg,#f59e0b,#d97706)", flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 5, color: "#f59e0b" }}>Breaking News</span>
            {gameState && <span style={{ fontSize: 12, color: "#475569", marginLeft: 4 }}>· Ciclo {gameState.current_cycle}</span>}
          </div>

          {events.length === 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 64, opacity: 0.06 }}>📰</div>
              <div style={{ fontSize: 20, color: "#2d3748", fontWeight: 600 }}>Waiting for news...</div>
            </div>
          )}

          {events.slice(0, visibleCards).map((ev, idx) => {
            const col = catColor(ev.category);
            return (
              <div
                key={ev.id}
                className="news-in"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${col}10 0%, rgba(11,11,22,0.97) 50%)`,
                  border: `1px solid ${col}20`,
                  borderLeft: `5px solid ${col}`,
                  borderRadius: 20,
                  padding: "36px 38px",
                  animationDelay: `${idx * 0.1}s`,
                  boxShadow: `0 8px 40px ${col}08`,
                }}
              >
                <h2 style={{ fontSize: 48, fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.1, margin: 0, color: "#fff", letterSpacing: 1.5 }}>{ev.title}</h2>
              </div>
            );
          })}
        </main>

        {/* RIGHT: Market Movers */}
        <aside style={{
          width: 440, flexShrink: 0,
          borderLeft: "1px solid rgba(139,92,246,0.1)",
          background: "rgba(10,10,22,0.85)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "28px 30px 18px", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: "linear-gradient(180deg,#10b981,#059669)", flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 5, color: "#10b981" }}>Market Movers</span>
            </div>
            <p style={{ fontSize: 12, color: "#475569", margin: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>Variazione ultimo ciclo</p>
          </div>

          {/* Gainers */}
          <div style={{ padding: "20px 30px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, color: "#22c55e" }}>▲</span>
              <span style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 3.5, color: "#22c55e" }}>Migliori</span>
            </div>
            {topGainers.length === 0 && <p style={{ fontSize: 12, color: "#2d3748", fontStyle: "italic" }}>Nessun dato — avvia il gioco</p>}
            {topGainers.map((s, i) => (
              <MoverCard key={s.id} stock={s} isGainer={true} rank={i} />
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(139,92,246,0.1)", margin: "0 30px" }} />

          {/* Losers */}
          <div style={{ padding: "18px 30px 14px", flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, color: "#ef4444" }}>▼</span>
              <span style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 3.5, color: "#ef4444" }}>Peggiori</span>
            </div>
            {topLosers.length === 0 && <p style={{ fontSize: 12, color: "#2d3748", fontStyle: "italic" }}>Nessun dato — avvia il gioco</p>}
            {topLosers.map((s, i) => (
              <MoverCard key={s.id} stock={s} isGainer={false} rank={i} />
            ))}
          </div>
        </aside>
      </div>

      {/* ── BOTTOM: Leaderboard ticker ── */}
      {isWindDown ? <WindDownTicker /> : <LeaderboardTicker entries={lbItems} />}

      {/* ── Podium overlay ── */}
      {podiumData.show && <TVPodiumOverlay leaderboard={podiumData.leaderboard} />}

      {/* ── Volpe d'Oro overlay ── */}
      {volpeDoroData.show && volpeDoroData.winner && <TVVolpeDoroOverlay winner={volpeDoroData.winner} />}

      {/* ── Dietro le Quinte overlay ── */}
      {dietroQuinteData.show && <TVDietroQuinteOverlay slide={dietroQuinteData.slide} />}
    </div>
  );
}

/* ─── TVTimer component ──────────────────────────────────────────────────── */

function TVTimer({ timer }: { timer: TimerState }) {
  const rem = timer.remaining_seconds;
  const isUrgent = rem <= 10 && rem > 0 && timer.running;
  const isWarning = rem <= 30 && rem > 10 && timer.running;
  const isDone = rem <= 0;

  const color = isDone
    ? "#475569"
    : isUrgent
    ? "#ef4444"
    : isWarning
    ? "#f59e0b"
    : timer.running
    ? "#e2e8f0"
    : "#64748b";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Running dot */}
      {timer.running && !isDone && (
        <div
          className={isUrgent ? "timer-urgent" : "pulse-dot"}
          style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}
        />
      )}
      <div
        className={isUrgent ? "timer-urgent" : ""}
        style={{
          fontSize: 34,
          fontFamily: "'Bebas Neue', sans-serif",
          color,
          letterSpacing: 4,
          minWidth: 100,
          textAlign: "right",
        }}
      >
        {fmtTimer(rem)}
      </div>
    </div>
  );
}

/* ─── MoverCard component ────────────────────────────────────────────────── */

function MoverCard({ stock, isGainer, rank }: { stock: StockPerf; isGainer: boolean; rank: number }) {
  const col = isGainer ? "#22c55e" : "#ef4444";
  const bgAlpha = 0.08 - rank * 0.015;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 22px", marginBottom: 12, borderRadius: 14,
      background: `rgba(${isGainer ? "34,197,94" : "239,68,68"},${bgAlpha})`,
      border: `1px solid rgba(${isGainer ? "34,197,94" : "239,68,68"},0.18)`,
      transition: "transform 0.2s",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", color: "#fff", letterSpacing: 2, lineHeight: 1 }}>{stock.ticker}</span>
          <span style={{ fontSize: 15, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{stock.name}</span>
        </div>
        <span style={{ fontSize: 15, color: "#64748b", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>€{stock.current_price.toFixed(2)}</span>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
        <div style={{ fontSize: 36, fontFamily: "'Bebas Neue', sans-serif", color: col, letterSpacing: 1, lineHeight: 1 }}>
          {isGainer ? "+" : ""}{stock.cycle_change_pct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

/* ─── TV Podium Overlay ──────────────────────────────────────────────────── */

const CONFETTI_COLORS = ["#fbbf24", "#a78bfa", "#34d399", "#f87171", "#60a5fa", "#fb923c", "#f472b6", "#22d3ee"];

function TVConfetti() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 70 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 4;
        const duration = 3.5 + Math.random() * 5;
        const size = 8 + Math.random() * 14;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const isRect = Math.random() > 0.5;
        return (
          <div key={i} style={{
            position: "absolute", left: `${left}%`, top: 0,
            width: isRect ? size : size * 0.6,
            height: isRect ? size * 0.5 : size,
            backgroundColor: color,
            borderRadius: isRect ? 2 : "50%",
            animation: `confetti-fall ${duration}s ease-in ${delay}s infinite`,
            opacity: 0,
          }} />
        );
      })}
    </div>
  );
}

function TVPodiumOverlay({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const fmtVal = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  const first = leaderboard.find(e => e.rank === 1);
  const second = leaderboard.find(e => e.rank === 2);
  const third = leaderboard.find(e => e.rank === 3);

  return (
    <div className="podium-bg" style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 40%, #1a0a3e 0%, #0b0b16 65%)",
    }}>
      <TVConfetti />

      {/* Title */}
      <div className="podium-title" style={{ textAlign: "center", marginBottom: 48, position: "relative", zIndex: 10 }}>
        <div style={{ fontSize: 13, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.4em", fontWeight: 900, marginBottom: 12 }}>
          Investment Portfolio Simulator
        </div>
        <div style={{
          fontSize: 110, fontFamily: "'Bebas Neue',sans-serif", color: "#fff",
          letterSpacing: 12, lineHeight: 1,
          textShadow: "0 0 80px rgba(251,191,36,0.6)",
        }}>FINE GIOCO</div>
        <div style={{ fontSize: 14, color: "#475569", textTransform: "uppercase", letterSpacing: "0.35em", marginTop: 14 }}>
          Classifica Finale
        </div>
      </div>

      {/* Podium stage */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 24, height: 420 }}>

        {/* 2nd */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 220 }}>
          <div className="podium-p2" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 54, marginBottom: 8 }}>🥈</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e2e8f0", textAlign: "center", lineHeight: 1.2, marginBottom: 6 }}>
              {second?.name ?? "—"}
            </div>
            <div style={{ fontSize: 26, fontFamily: "'Bebas Neue',sans-serif", color: "#94a3b8", letterSpacing: 2 }}>
              {second ? fmtVal(second.total_value) : "—"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: (second?.performance ?? 0) >= 0 ? "#34d399" : "#f87171" }}>
              {second ? fmtPct(second.performance) : ""}
            </div>
          </div>
          <div className="podium-block-2" style={{
            width: "100%", height: 190, borderRadius: "16px 16px 0 0",
            background: "linear-gradient(180deg,#64748b,#334155)",
            border: "1px solid #47556960",
            display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 18,
          }}>
            <span style={{ fontSize: 70, fontFamily: "'Bebas Neue',sans-serif", color: "#94a3b8", letterSpacing: 3 }}>2</span>
          </div>
        </div>

        {/* 1st */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260 }}>
          <div className="podium-p1" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
            <div className="crown-anim" style={{ fontSize: 70, marginBottom: 10 }}>👑</div>
            <div style={{
              fontSize: 28, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.2, marginBottom: 8,
              textShadow: "0 0 30px rgba(251,191,36,0.7)",
            }}>
              {first?.name ?? "—"}
            </div>
            <div style={{ fontSize: 32, fontFamily: "'Bebas Neue',sans-serif", color: "#fcd34d", letterSpacing: 2 }}>
              {first ? fmtVal(first.total_value) : "—"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: (first?.performance ?? 0) >= 0 ? "#34d399" : "#f87171" }}>
              {first ? fmtPct(first.performance) : ""}
            </div>
          </div>
          <div className="podium-block-1 glow-gold" style={{
            width: "100%", height: 270, borderRadius: "16px 16px 0 0",
            background: "linear-gradient(180deg,#b45309,#78350f)",
            border: "1px solid #fbbf2450",
            display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 22,
          }}>
            <span style={{ fontSize: 90, fontFamily: "'Bebas Neue',sans-serif", color: "#fbbf24", letterSpacing: 3 }}>1</span>
          </div>
        </div>

        {/* 3rd */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 220 }}>
          <div className="podium-p3" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 54, marginBottom: 8 }}>🥉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e2e8f0", textAlign: "center", lineHeight: 1.2, marginBottom: 6 }}>
              {third?.name ?? "—"}
            </div>
            <div style={{ fontSize: 26, fontFamily: "'Bebas Neue',sans-serif", color: "#94a3b8", letterSpacing: 2 }}>
              {third ? fmtVal(third.total_value) : "—"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: (third?.performance ?? 0) >= 0 ? "#34d399" : "#f87171" }}>
              {third ? fmtPct(third.performance) : ""}
            </div>
          </div>
          <div className="podium-block-3" style={{
            width: "100%", height: 130, borderRadius: "16px 16px 0 0",
            background: "linear-gradient(180deg,#9a3412,#7c2d12)",
            border: "1px solid #c2410c60",
            display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 14,
          }}>
            <span style={{ fontSize: 56, fontFamily: "'Bebas Neue',sans-serif", color: "#fb923c", letterSpacing: 3 }}>3</span>
          </div>
        </div>
      </div>

      {/* Others */}
      {leaderboard.filter(e => e.rank > 3).length > 0 && (
        <div className="podium-p3" style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: 48, marginTop: 24 }}>
          {leaderboard.filter(e => e.rank > 3).map(e => (
            <div key={e.player_id} style={{ textAlign: "center", opacity: 0.55 }}>
              <div style={{ fontSize: 13, color: "#475569", fontFamily: "monospace", marginBottom: 2 }}>#{e.rank}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>{e.name}</div>
              <div style={{ fontSize: 20, fontFamily: "'Bebas Neue',sans-serif", color: "#475569", letterSpacing: 1 }}>{fmtVal(e.total_value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── WindDown Ticker ────────────────────────────────────────────────────── */

function WindDownTicker() {
  const msg = "🔒  CLASSIFICA RISERVATA  ·  I RISULTATI SARANNO SVELATI A FINE SIMULAZIONE  ·  ";
  const repeated = msg.repeat(8);
  return (
    <div style={{
      flexShrink: 0,
      background: "rgba(8,8,18,0.99)",
      borderTop: "1px solid rgba(251,191,36,0.2)",
      height: 72,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      alignItems: "center",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 160, height: "100%", background: "linear-gradient(90deg,#0b0b16,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 160, height: "100%", background: "linear-gradient(270deg,#0b0b16,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div className="lb-track" style={{ whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: "#fbbf24" }}>{repeated}</span>
        <span style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: "#fbbf24" }}>{repeated}</span>
      </div>
    </div>
  );
}

/* ─── Leaderboard Ticker ─────────────────────────────────────────────────── */

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardTicker({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div style={{
      flexShrink: 0,
      background: "rgba(8,8,18,0.99)",
      borderTop: "1px solid rgba(139,92,246,0.12)",
      height: 72,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Fade edges */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 150, height: "100%", background: "linear-gradient(90deg,#0b0b16,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 150, height: "100%", background: "linear-gradient(270deg,#0b0b16,transparent)", zIndex: 2, pointerEvents: "none" }} />

      {/* Label pinned left */}
      <div style={{
        position: "absolute", left: 0, top: 0, height: "100%", zIndex: 3,
        display: "flex", alignItems: "center",
        paddingLeft: 24, paddingRight: 20,
        background: "rgba(8,8,18,0.99)",
        borderRight: "1px solid rgba(139,92,246,0.12)",
      }}>
        <span style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: "#a78bfa" }}>Classifica</span>
      </div>

      {entries.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 180 }}>
          <span style={{ fontSize: 12, color: "#2d3748", letterSpacing: 2, fontStyle: "italic" }}>In attesa di giocatori...</span>
        </div>
      ) : (
        <div className="lb-track" style={{ height: "100%", alignItems: "center", paddingLeft: 160 }}>
          {entries.map((e, i) => {
            const medal = RANK_MEDALS[e.rank];
            const perfColor = e.performance >= 0 ? "#22c55e" : "#ef4444";
            const isTop3 = e.rank <= 3;
            return (
              <div
                key={`${e.player_id}-${i}`}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "0 44px", whiteSpace: "nowrap",
                  borderRight: "1px solid rgba(139,92,246,0.1)",
                  height: "100%",
                }}
              >
                <span style={{ fontSize: medal ? 24 : 16, fontWeight: 800, color: isTop3 ? "#fff" : "#64748b", minWidth: 30, textAlign: "center" }}>
                  {medal ?? `#${e.rank}`}
                </span>
                <span style={{ fontSize: 20, fontFamily: "'Bebas Neue', sans-serif", color: isTop3 ? "#fff" : "#94a3b8", letterSpacing: 1.5 }}>{e.name}</span>
                <span style={{ fontSize: 20, fontFamily: "'Bebas Neue', sans-serif", color: "#fff", letterSpacing: 1 }}>{e.total_value.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
                <span style={{ fontSize: 19, fontFamily: "'Bebas Neue', sans-serif", color: perfColor, letterSpacing: 1 }}>
                  {e.performance >= 0 ? "+" : ""}{e.performance.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── TVVolpeDoroOverlay ─────────────────────────────────────────────────── */

interface VolpeDoroWinner {
  name: string;
  score: number;
  motivations: {
    icon: string;
    label: string;
    description: string;
    ticker: string | null;
    arrow: string | null;
    pct: number | null;
    cycle: number | null;
    event_title: string | null;
  }[];
  best_trades: {
    ticker: string;
    security_name: string;
    action: string;
    quantity: number;
    price: number;
    result_arrow: string;
    price_change_pct: number;
    cycle: number;
    event_title: string;
  }[];
}

const VD_ARROW_COLORS: Record<string, string> = {
  "↑↑↑": "#22c55e", "↑↑": "#4ade80", "↑": "#86efac",
  "↓": "#fca5a5", "↓↓": "#f87171", "↓↓↓": "#ef4444",
};

function TVVolpeDoroOverlay({ winner }: { winner: VolpeDoroWinner }) {
  return (
    <div className="dq-bg" style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "radial-gradient(ellipse at center, #451a03 0%, #1c0a00 50%, #000 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "40px 60px",
    }}>
      {/* Header */}
      <div className="dq-content" style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 4, filter: "drop-shadow(0 0 30px #f59e0b)" }}>🦊</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 58, letterSpacing: 10, color: "#f59e0b",
          textShadow: "0 0 40px rgba(245,158,11,0.6)", margin: "0 0 6px",
        }}>
          VOLPE D'ORO
        </h1>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: 5, color: "#92400e", margin: 0 }}>
          MIGLIOR LETTURA DEGLI EVENTI
        </p>
      </div>

      {/* Winner card */}
      <div className="dq-content" style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(180,83,9,0.08) 100%)",
        border: "2px solid rgba(245,158,11,0.35)", borderRadius: 20,
        padding: "20px 50px", textAlign: "center", marginBottom: 32,
        boxShadow: "0 0 60px rgba(245,158,11,0.12)",
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: 5, color: "#fbbf24" }}>
          {winner.name}
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: "#f59e0b", fontWeight: 900 }}>
          {winner.score.toFixed(1)}
          <span style={{ fontSize: 24, color: "#92400e", marginLeft: 6 }}>/100</span>
        </div>
      </div>

      {/* Motivazioni — sempre visibili */}
      {winner.motivations && winner.motivations.length > 0 && (
        <div className="dq-content" style={{ width: "100%", maxWidth: 950, marginBottom: 24 }}>
          <h3 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 4,
            color: "#d97706", marginBottom: 14, textAlign: "center",
          }}>
            PERCHE' HA VINTO
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {winner.motivations.map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 18,
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)",
                borderRadius: 14, padding: "16px 24px",
                animation: `dq-item-in 0.5s ease ${0.3 + i * 0.12}s both`,
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{m.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 2, color: "#f59e0b", marginBottom: 3 }}>
                    {m.label}
                  </div>
                  <p style={{ fontSize: 15, color: "#d4d4d8", lineHeight: 1.5, margin: 0 }}>
                    {m.description}
                  </p>
                  {m.event_title && (
                    <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>
                      Evento: {m.event_title}
                    </div>
                  )}
                </div>
                {m.arrow && m.pct != null && (
                  <div style={{ textAlign: "center", flexShrink: 0, minWidth: 60 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: VD_ARROW_COLORS[m.arrow] || "#fff" }}>{m.arrow}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: m.pct > 0 ? "#4ade80" : "#f87171" }}>
                      {m.pct > 0 ? "+" : ""}{m.pct}%
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Trades — solo se ci sono */}
      {winner.best_trades.length > 0 && (
        <div className="dq-content" style={{ width: "100%", maxWidth: 950 }}>
          <h3 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 4,
            color: "#d97706", marginBottom: 14, textAlign: "center",
          }}>
            LE MOSSE MIGLIORI
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {winner.best_trades.map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)",
                borderRadius: 14, padding: "14px 22px",
                animation: `dq-item-in 0.5s ease ${0.6 + i * 0.12}s both`,
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#f59e0b", minWidth: 32, textAlign: "center" }}>
                  #{i + 1}
                </div>
                <div style={{
                  padding: "3px 10px", borderRadius: 6, fontWeight: 800, fontSize: 12, letterSpacing: 1,
                  background: t.action === "BUY" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                  color: t.action === "BUY" ? "#4ade80" : "#f87171",
                  border: `1px solid ${t.action === "BUY" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                  minWidth: 44, textAlign: "center",
                }}>
                  {t.action}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fbbf24", letterSpacing: 1 }}>
                    {t.ticker}
                    <span style={{ fontSize: 12, color: "#92400e", fontWeight: 400, marginLeft: 8 }}>{t.security_name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                    Ciclo {t.cycle} — {t.event_title}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 70 }}>
                  <div style={{ fontSize: 13, color: "#a8a29e", fontWeight: 600 }}>{t.quantity} azioni</div>
                  <div style={{ fontSize: 11, color: "#78716c" }}>a €{t.price.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 60 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: VD_ARROW_COLORS[t.result_arrow] || "#fff" }}>{t.result_arrow}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.price_change_pct > 0 ? "#4ade80" : "#f87171" }}>
                    {t.price_change_pct > 0 ? "+" : ""}{t.price_change_pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dq-content" style={{ marginTop: 28, textAlign: "center" }}>
        <p style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 3,
          color: "#92400e",
        }}>
          Questa volpe ha letto il mercato meglio di tutti
        </p>
      </div>
    </div>
  );
}

/* ─── Dietro le Quinte overlay ──────────────────────────────────────────── */

interface DQItem { company: string; arrow: string; note?: string }
interface DQWave { title: string; explanation: string; items: DQItem[] }
interface DQSlide {
  title: string; icon: string; narrative: string;
  effettoDiretto: { items: DQItem[] };
  effettoCatena: DQWave[];
  lezione: string;
}

const ARROW_COLORS: Record<string, string> = {
  "↑↑↑": "#22c55e", "↑↑": "#4ade80", "↑": "#86efac",
  "↓": "#fca5a5", "↓↓": "#f87171", "↓↓↓": "#ef4444",
};

const DQ_SLIDES: DQSlide[] = [
  {
    title: "Blocco Navale di Taiwan",
    icon: "🚢",
    narrative: "La Cina impone un blocco navale intorno a Taiwan. TSMC, che produce il 60% dei semiconduttori mondiali e oltre il 90% dei chip avanzati, ferma completamente le esportazioni. Il mondo si ritrova senza chip da un giorno all'altro.",
    effettoDiretto: {
      items: [
        { company: "TSMC", arrow: "↓↓↓", note: "Export completamente fermi" },
        { company: "NVIDIA", arrow: "↓↓↓", note: "Niente GPU avanzate" },
        { company: "AMD", arrow: "↓↓↓", note: "Chip prodotti da TSMC" },
        { company: "Broadcom", arrow: "↓↓↓", note: "Dipende da fonderie Taiwan" },
        { company: "ARM", arrow: "↓↓↓", note: "Licenze senza chip da produrre" },
      ],
    },
    effettoCatena: [
      {
        title: "Onda 1: L'auto si ferma",
        explanation: "Le auto moderne contengono oltre 3.000 chip ciascuna. Senza semiconduttori, le linee di produzione di Tesla, Toyota e tutto il settore auto si bloccano in pochi giorni.",
        items: [
          { company: "Tesla", arrow: "↓↓↓" },
          { company: "Toyota", arrow: "↓↓" },
          { company: "BYD", arrow: "↓↓" },
          { company: "Honeywell", arrow: "↓↓" },
        ],
      },
      {
        title: "Onda 2: La robotica si spegne",
        explanation: "Robot industriali, automazione di fabbrica e sistemi di controllo dipendono tutti da chip avanzati. Siemens, ABB e l'intero settore automazione subiscono uno stop.",
        items: [
          { company: "Siemens", arrow: "↓↓↓" },
          { company: "ABB", arrow: "↓↓" },
          { company: "Caterpillar", arrow: "↓↓" },
        ],
      },
      {
        title: "Onda 3: L'energia crolla per mancanza di domanda",
        explanation: "Con le fabbriche ferme e la produzione industriale in caduta libera, la domanda di energia crolla. I titoli energetici, che sembravano al sicuro, vengono trascinati gi\u00f9.",
        items: [
          { company: "Exxon", arrow: "↓↓" },
          { company: "Chevron", arrow: "↓↓" },
          { company: "NextEra", arrow: "↓" },
        ],
      },
      {
        title: "Chi ne beneficia?",
        explanation: "I titoli difensivi diventano rifugio: farmaceutici, alimentari e beni di prima necessit\u00e0 attraggono capitali in fuga dal tech.",
        items: [
          { company: "J&J", arrow: "↑↑" },
          { company: "Novo Nordisk", arrow: "↑↑" },
          { company: "Coca-Cola", arrow: "↑" },
          { company: "UnitedHealth", arrow: "↑" },
        ],
      },
    ],
    lezione: "Un singolo collo di bottiglia nella supply chain (i chip) pu\u00f2 paralizzare settori apparentemente non collegati. L'auto, la robotica e persino l'energia vengono travolti. Solo i difensivi resistono \u2014 ma non sempre.",
  },
  {
    title: "Scandalo PFAS Alimentare",
    icon: "☣️",
    narrative: "L'EPA scopre livelli di PFAS (sostanze chimiche \"eterne\") 200 volte superiori ai limiti in 14 stabilimenti alimentari e farmaceutici negli USA. Scatta il ritiro prodotti di massa e partono class action miliardarie.",
    effettoDiretto: {
      items: [
        { company: "Coca-Cola", arrow: "↓↓↓", note: "Stabilimenti contaminati" },
        { company: "PepsiCo", arrow: "↓↓", note: "Ritiro prodotti preventivo" },
        { company: "Nestl\u00e9", arrow: "↓↓", note: "Esposizione globale PFAS" },
        { company: "McDonald's", arrow: "↓↓", note: "Supply chain contaminata" },
        { company: "Danone", arrow: "↓↓", note: "Prodotti lattiero-caseari a rischio" },
      ],
    },
    effettoCatena: [
      {
        title: "La sorpresa: i difensivi NON sono sicuri",
        explanation: "Di solito durante le crisi i giocatori comprano titoli alimentari e farmaceutici perch\u00e9 \"sono sicuri\". Questa volta sono proprio loro a crollare. Il rischio regolatorio colpisce dove meno te lo aspetti.",
        items: [
          { company: "J&J", arrow: "↓↓", note: "Farmaceutici sotto indagine" },
          { company: "Procter & Gamble", arrow: "↓", note: "Prodotti consumer a rischio" },
        ],
      },
      {
        title: "Il boom della diagnostica",
        explanation: "Serve uno screening PFAS su scala industriale: ogni stabilimento, ogni prodotto, ogni lotto. Le aziende di diagnostica e strumentazione scientifica esplodono.",
        items: [
          { company: "Danaher", arrow: "↑↑↑" },
          { company: "Waters Corp", arrow: "↑↑↑" },
          { company: "Agilent", arrow: "↑↑" },
        ],
      },
      {
        title: "La rotazione: il denaro fugge verso il growth",
        explanation: "Con i difensivi in crisi, il capitale cerca alternative. I titoli tech e growth, che non hanno nulla a che fare con PFAS, beneficiano della rotazione dei portafogli.",
        items: [
          { company: "NVIDIA", arrow: "↑" },
          { company: "Microsoft", arrow: "↑" },
          { company: "Apple", arrow: "↑" },
        ],
      },
    ],
    lezione: "\"Difensivo\" non significa \"immune al rischio\". Il rischio regolatorio pu\u00f2 colpire i settori pi\u00f9 stabili. Chi legge bene l'evento capisce che la diagnostica (Danaher, Waters) \u00e8 il vero vincitore nascosto.",
  },
  {
    title: "Collisione nello Stretto di Malacca",
    icon: "⚓",
    narrative: "Una collisione tra navi blocca lo Stretto di Malacca per 11 giorni. Attraverso questo stretto passa il 30% del commercio marittimo mondiale e 16 milioni di barili di petrolio al giorno. Il mondo scopre quanto \u00e8 fragile la logistica globale.",
    effettoDiretto: {
      items: [
        { company: "Exxon", arrow: "↑↑↑", note: "Petrolio alle stelle" },
        { company: "Chevron", arrow: "↑↑↑", note: "Margini in esplosione" },
        { company: "Shell", arrow: "↑↑↑", note: "Rotte alternative = prezzi su" },
        { company: "Maersk", arrow: "↓↓↓", note: "Flotta bloccata nello stretto" },
      ],
    },
    effettoCatena: [
      {
        title: "Onda 1: I costi di trasporto esplodono",
        explanation: "Le navi devono circumnavigare l'Indonesia, aggiungendo 7-10 giorni e costi enormi. Tutto ci\u00f2 che viaggia via mare diventa pi\u00f9 costoso.",
        items: [
          { company: "Caterpillar", arrow: "↓↓", note: "Materie prime bloccate" },
          { company: "Deere & Co", arrow: "↓↓", note: "Componenti in ritardo" },
          { company: "GE", arrow: "↓↓" },
        ],
      },
      {
        title: "Onda 2: I chip rallentano (di nuovo)",
        explanation: "Il 60% dei semiconduttori mondiali transita da Malacca. Non \u00e8 un blocco totale come Taiwan, ma il rallentamento logistico crea colli di bottiglia per settimane.",
        items: [
          { company: "TSMC", arrow: "↓↓" },
          { company: "NVIDIA", arrow: "↓" },
          { company: "Samsung", arrow: "↓↓" },
        ],
      },
      {
        title: "Onda 3: L'energia diventa bipolare",
        explanation: "I produttori di petrolio guadagnano, ma i consumatori di energia (manifattura, data center, trasporti) pagano di pi\u00f9. L'energia oscilla violentemente.",
        items: [
          { company: "NextEra", arrow: "↑↑", note: "Rinnovabili = alternativa" },
          { company: "Tesla", arrow: "↓", note: "Batterie pi\u00f9 costose" },
          { company: "Amazon", arrow: "↓", note: "Costi logistici +" },
        ],
      },
      {
        title: "Rifugio nei difensivi",
        explanation: "Farmaceutici e healthcare attraggono capitali come rifugio sicuro. Non dipendono dal trasporto marittimo quanto l'industria pesante.",
        items: [
          { company: "UnitedHealth", arrow: "↑↑" },
          { company: "J&J", arrow: "↑" },
          { company: "Novo Nordisk", arrow: "↑" },
        ],
      },
    ],
    lezione: "Uno stretto di 2.8 km di larghezza controlla il 30% del commercio mondiale. Quando si blocca, l'energia sale, i trasporti crollano, e gli effetti si propagano per settimane su settori lontanissimi tra loro.",
  },
];

function TVDietroQuinteOverlay({ slide }: { slide: number }) {
  const data = DQ_SLIDES[slide - 1];
  if (!data) return null;

  return (
    <div key={slide} className="dq-bg" style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "radial-gradient(ellipse at 50% 30%, #1a0a3e 0%, #0d0620 50%, #0b0b16 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "40px 60px",
    }}>
      {/* Header */}
      <div className="dq-content" style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(139,92,246,0.4))" }}>{data.icon}</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 6,
          color: "#fff", margin: 0, textShadow: "0 0 40px rgba(139,92,246,0.5)",
        }}>
          {data.title}
        </h1>
        <p style={{
          fontSize: 17, color: "#94a3b8", maxWidth: 750, margin: "12px auto 0",
          lineHeight: 1.6, letterSpacing: 0.3,
        }}>
          {data.narrative}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="dq-content" style={{
        display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 32,
        width: "100%", maxWidth: 1200, flex: 1, minHeight: 0,
      }}>
        {/* Left: Effetto Diretto */}
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 16, padding: "20px 24px", overflowY: "auto",
        }}>
          <h3 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3,
            color: "#f87171", margin: "0 0 16px", textTransform: "uppercase",
          }}>
            Effetto Diretto
          </h3>
          {data.effettoDiretto.items.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: i < data.effettoDiretto.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              animation: `dq-item-in 0.4s ease ${0.4 + i * 0.08}s both`,
            }}>
              <span style={{ fontSize: 22, color: ARROW_COLORS[item.arrow] || "#fff", minWidth: 36, textAlign: "center", fontWeight: 900 }}>{item.arrow}</span>
              <span style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 700, minWidth: 110 }}>{item.company}</span>
              {item.note && <span style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>{item.note}</span>}
            </div>
          ))}
        </div>

        {/* Right: Effetto a Catena */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3,
            color: "#a78bfa", margin: 0, textTransform: "uppercase",
          }}>
            Effetto a Catena
          </h3>
          {data.effettoCatena.map((wave, wi) => (
            <div key={wi} style={{
              background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)",
              borderRadius: 14, padding: "16px 20px",
              animation: `dq-item-in 0.5s ease ${0.5 + wi * 0.15}s both`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#c4b5fd", marginBottom: 6, letterSpacing: 0.5 }}>{wave.title}</div>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.55 }}>{wave.explanation}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {wave.items.map((item, ii) => (
                  <div key={ii} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 12px",
                  }}>
                    <span style={{ fontSize: 17, color: ARROW_COLORS[item.arrow] || "#fff", fontWeight: 900 }}>{item.arrow}</span>
                    <span style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 600 }}>{item.company}</span>
                    {item.note && <span style={{ fontSize: 11, color: "#64748b" }}>({item.note})</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lezione footer */}
      <div className="dq-content" style={{
        marginTop: 24, padding: "16px 28px", maxWidth: 1200, width: "100%",
        background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
        borderRadius: 14,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
          <div>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 2, color: "#a78bfa", textTransform: "uppercase" }}>Lezione</span>
            <p style={{ fontSize: 15, color: "#cbd5e1", margin: "4px 0 0", lineHeight: 1.6 }}>{data.lezione}</p>
          </div>
        </div>
      </div>

      {/* Slide indicator */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            width: n === slide ? 28 : 10, height: 10, borderRadius: 5,
            background: n === slide ? "#8b5cf6" : "rgba(139,92,246,0.25)",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>
    </div>
  );
}
