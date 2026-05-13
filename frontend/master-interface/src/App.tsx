import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────

interface GameState { current_cycle: number; total_cycles: number; extra_cycles: number; status: string; }
interface Position { ticker: string; quantity: number; current_value: number; current_price: number; avg_purchase_price: number; }
interface Player { id: number; name: string; current_cash: number; initial_cash: number; active: boolean; positions: Position[]; total_value: number; performance: number; }
interface LeaderboardEntry { rank: number; player_id: number; name: string; cash: number; securities_value: number; total_value: number; performance: number; }
interface GameEvent { id: number; title: string; body: string; category: string; game_cycle: number; }
interface EventTemplate { id: number; name: string; description: string; category: string; target_sector: string | null; target_region: string | null; intensity_level: number; active: boolean; }

// ── Helpers ────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(n: number): string {
  if (Math.abs(n) >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `€${(n / 1e3).toFixed(1)}k`;
  return `€${fmt(n)}`;
}

function perfColor(v: number): string {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-slate-400";
}

const STATUS_BADGES: Record<string, { label: string; cls: string; dot: string }> = {
  no_game:          { label: "No Game",           cls: "bg-slate-700/40 text-slate-300 border-slate-600/50",   dot: "#64748b" },
  setup:            { label: "Setup",             cls: "bg-blue-900/40 text-blue-300 border-blue-700/50",       dot: "#3b82f6" },
  events_generated: { label: "Events Generated",  cls: "bg-violet-900/40 text-violet-300 border-violet-700/50", dot: "#8b5cf6" },
  decision:         { label: "Decision Phase",    cls: "bg-amber-900/40 text-amber-300 border-amber-700/50",    dot: "#f59e0b" },
  closed:           { label: "Closed",            cls: "bg-orange-900/40 text-orange-300 border-orange-700/50", dot: "#f97316" },
  finished:         { label: "Finished",          cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50", dot: "#10b981" },
};

const CATEGORY_COLORS: Record<string, string> = {
  geopolitica:     "bg-red-900/40 text-red-300 border-red-700/50",
  macroeconomia:   "bg-blue-900/40 text-blue-300 border-blue-700/50",
  regolamentazione:"bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  tech_disruption: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  crisi_ambientale:"bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  cigno_nero:      "bg-amber-900/40 text-amber-300 border-amber-700/50",
};
function categoryBadge(cat: string) { return CATEGORY_COLORS[cat] ?? "bg-[#171727] text-slate-300 border-[#252540]"; }

// ── Section label component ────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div style={{ width: 3, height: 18, borderRadius: 2, background: "#7c3aed", flexShrink: 0 }} />
      <span className="text-base font-bebas text-violet-400 tracking-widest">{children}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────

export default function App() {
  const [game, setGame] = useState<GameState>({ current_cycle: 0, total_cycles: 0, extra_cycles: 0, status: "no_game" });
  const [totalCyclesInput, setTotalCyclesInput] = useState<number>(5);
  const [extraCyclesInput, setExtraCyclesInput] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerCash, setNewPlayerCash] = useState<number>(10000000);
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [podiumVisible, setPodiumVisible] = useState(false);
  const [volpeDoroVisible, setVolpeDoroVisible] = useState(false);
  const [dietroQuinteVisible, setDietroQuinteVisible] = useState(false);
  const [dietroQuinteSlide, setDietroQuinteSlide] = useState(1);

  // ── Timer state ──
  const [timerRemaining, setTimerRemaining] = useState(300);
  const [timerTotal, setTimerTotal] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState<{ m: number; s: number }>({ m: 5, s: 0 });

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Fetching ─────────────────────────────────────────────────────

  const fetchGameState = useCallback(async () => {
    try {
      const res = await axios.get("/api/game/state");
      if (!mountedRef.current) return;
      setGame(res.data?.status ? res.data : { current_cycle: 0, total_cycles: 0, extra_cycles: 0, status: "no_game" });
    } catch { if (mountedRef.current) setGame({ current_cycle: 0, total_cycles: 0, extra_cycles: 0, status: "no_game" }); }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await axios.get("/api/master/players");
      if (mountedRef.current) setPlayers(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get("/api/leaderboard");
      if (mountedRef.current) setLeaderboard(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get("/api/events/current");
      if (mountedRef.current) setEvents(Array.isArray(res.data) ? res.data : []);
    } catch { if (mountedRef.current) setEvents([]); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/event-templates");
      if (mountedRef.current) setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    const results = await Promise.allSettled([fetchGameState(), fetchPlayers(), fetchLeaderboard(), fetchEvents(), fetchTemplates()]);
    if (mountedRef.current) setLastRefresh(new Date().toLocaleTimeString());
    results.forEach((r, i) => { if (r.status === "rejected") console.warn(`[Master] fetch #${i} failed:`, r.reason); });
  }, [fetchGameState, fetchPlayers, fetchLeaderboard, fetchEvents, fetchTemplates]);

  const handleManualRefresh = async () => {
    setRefreshing(true); setError(null);
    try { await refreshAll(); } finally { if (mountedRef.current) setRefreshing(false); }
  };

  useEffect(() => { refreshAll(); const iv = setInterval(refreshAll, 5000); return () => clearInterval(iv); }, [refreshAll]);

  // ── Timer polling ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const res = await axios.get<{ total_seconds: number; remaining_seconds: number; running: boolean }>("/api/timer");
        if (!mountedRef.current) return;
        setTimerRemaining(res.data.remaining_seconds);
        setTimerTotal(res.data.total_seconds);
        setTimerRunning(res.data.running);
      } catch {}
    };
    fetchTimer();
    const iv = setInterval(fetchTimer, 500);
    return () => clearInterval(iv);
  }, []);

  const timerSet = async () => {
    const secs = timerInput.m * 60 + timerInput.s;
    if (secs <= 0) return;
    try { const r = await axios.post<{ remaining_seconds: number; total_seconds: number; running: boolean }>("/api/timer/set", { seconds: secs }); setTimerRemaining(r.data.remaining_seconds); setTimerTotal(r.data.total_seconds); setTimerRunning(r.data.running); } catch {}
  };
  const timerStart = async () => {
    try { const r = await axios.post<{ remaining_seconds: number; total_seconds: number; running: boolean }>("/api/timer/start"); setTimerRemaining(r.data.remaining_seconds); setTimerRunning(r.data.running); } catch {}
  };
  const timerStop = async () => {
    try { const r = await axios.post<{ remaining_seconds: number; total_seconds: number; running: boolean }>("/api/timer/stop"); setTimerRemaining(r.data.remaining_seconds); setTimerRunning(r.data.running); } catch {}
  };
  const timerReset = async () => {
    try { const r = await axios.post<{ remaining_seconds: number; total_seconds: number; running: boolean }>("/api/timer/reset"); setTimerRemaining(r.data.remaining_seconds); setTimerRunning(r.data.running); } catch {}
  };
  const timerPreset = async (secs: number) => {
    try {
      const r = await axios.post<{ remaining_seconds: number; total_seconds: number; running: boolean }>("/api/timer/set", { seconds: secs });
      setTimerRemaining(r.data.remaining_seconds); setTimerTotal(r.data.total_seconds); setTimerRunning(r.data.running);
      setTimerInput({ m: Math.floor(secs / 60), s: secs % 60 });
    } catch {}
  };

  const fmtTimerDisplay = (secs: number) => {
    const s = Math.max(0, Math.ceil(secs));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  // ── Actions ───────────────────────────────────────────────────────

  const startGame = async () => {
    setLoading("start"); setError(null);
    try { await axios.post("/api/master/game/start", { total_cycles: totalCyclesInput, extra_cycles: extraCyclesInput }); await refreshAll(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed to start game")); }
    finally { setLoading(null); }
  };

  const newGame = async () => {
    setLoading("new"); setError(null); setShowNewGameConfirm(false);
    try { await axios.post("/api/master/game/new", { total_cycles: totalCyclesInput, extra_cycles: extraCyclesInput }); await refreshAll(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed to start new game")); }
    finally { setLoading(null); }
  };

  const nextCycle = async () => {
    setLoading("next"); setError(null);
    try { await axios.post("/api/master/next_cycle"); await refreshAll(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
    finally { setLoading(null); }
  };

  const openTrading = async () => {
    setLoading("open_trading"); setError(null);
    try { await axios.post("/api/master/open_trading"); await refreshAll(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
    finally { setLoading(null); }
  };

  const closePhase = async () => {
    setLoading("close"); setError(null);
    try { await axios.post("/api/master/close_phase"); await refreshAll(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
    finally { setLoading(null); }
  };

  const createPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setLoading("create"); setError(null);
    try { await axios.post("/api/master/players", { name: newPlayerName.trim(), initial_cash: newPlayerCash }); setNewPlayerName(""); await fetchPlayers(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
    finally { setLoading(null); }
  };

  const togglePlayerActive = async (player: Player) => {
    try { await axios.patch(`/api/master/players/${player.id}`, { active: !player.active }); await fetchPlayers(); } catch {}
  };

  const deactivateTemplate = async (id: number) => {
    setError(null);
    try { await axios.delete(`/api/admin/event-templates/${id}`); await fetchTemplates(); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const showPodium = async () => {
    setError(null);
    try { await axios.post("/api/master/show_podium"); setPodiumVisible(true); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const hidePodium = async () => {
    setError(null);
    try { await axios.post("/api/master/hide_podium"); setPodiumVisible(false); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const showVolpeDoro = async () => {
    setError(null);
    try { await axios.post("/api/master/show_volpe_doro"); setVolpeDoroVisible(true); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const hideVolpeDoro = async () => {
    setError(null);
    try { await axios.post("/api/master/hide_volpe_doro"); setVolpeDoroVisible(false); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const showDietroQuinte = async () => {
    setError(null);
    try { await axios.post("/api/master/show_dietro_quinte"); setDietroQuinteVisible(true); setDietroQuinteSlide(1); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const hideDietroQuinte = async () => {
    setError(null);
    try { await axios.post("/api/master/hide_dietro_quinte"); setDietroQuinteVisible(false); }
    catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  const navigateDietroQuinte = async (direction: "next" | "prev") => {
    setError(null);
    try {
      const res = await axios.post("/api/master/dietro_quinte_navigate", { direction });
      setDietroQuinteSlide(res.data.slide);
    } catch (e: unknown) { setError(String(axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : "Failed")); }
  };

  // ── Derived ───────────────────────────────────────────────────────

  const statusInfo = STATUS_BADGES[game.status] ?? STATUS_BADGES.no_game;
  const canStart = game.status === "no_game";
  const canNext = game.status === "setup" || game.status === "closed";
  const canClose = game.status === "decision";
  const gameInProgress = !["no_game", "finished"].includes(game.status);
  const totalAUM = players.reduce((s, p) => s + p.total_value, 0);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0b0b16] text-slate-100 font-sans">

      {/* ── Header ── */}
      <header className="bg-[#0d0d1e]/98 backdrop-blur-xl border-b border-[#1e1e35] px-7 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff", boxShadow: "0 0 16px rgba(124,58,237,0.35)" }}>M</div>
          <div>
            <h1 className="text-xl font-bebas text-white tracking-widest leading-none">Master Interface</h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">Investment Portfolio Simulator</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-xs text-slate-600 font-mono">Last: {lastRefresh}</span>}
          <button onClick={handleManualRefresh} disabled={refreshing}
            className={`text-xs px-4 py-2.5 rounded-xl border font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              refreshing ? "bg-violet-900/30 border-violet-700/50 text-violet-300 cursor-wait" : "bg-[#171727] hover:bg-[#1c1c30] border-[#252540] hover:border-violet-600/40 text-slate-100 active:scale-95"
            }`}
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Aggiornamento..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* ── Error ── */}
      {error && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-900/30 border border-red-800/50 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* ── New Game Modal ── */}
      {showNewGameConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f1e] border border-[#1e1e35] rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-black/70">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-900/30 border border-red-800/50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Nuova Partita?</h3>
                <p className="text-sm text-slate-400 mt-0.5">Questa azione reimposta tutto il gioco</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed bg-[#171727]/60 rounded-2xl p-4 border border-[#252540]/50">
              Tutti i progressi andranno persi: trade, eventi, storico prezzi e portafogli verranno azzerati. I giocatori mantengono i loro account ma la liquidità viene reimpostata ai valori iniziali.
            </p>
            <div className="flex items-center gap-3 mb-3 bg-[#171727] border border-[#252540] rounded-2xl p-4">
              <label className="text-sm text-slate-400 font-semibold whitespace-nowrap">Cicli con eventi:</label>
              <input type="number" min={1} max={50} value={totalCyclesInput}
                onChange={(e) => setTotalCyclesInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f1e] border border-[#1e1e35] text-center text-lg font-black font-mono focus:outline-none focus:border-violet-500 transition-colors text-white"
              />
            </div>
            <div className="flex items-center gap-3 mb-6 bg-[#171727] border border-amber-900/30 rounded-2xl p-4">
              <label className="text-sm text-amber-500/80 font-semibold whitespace-nowrap">Cicli wind-down:</label>
              <input type="number" min={0} max={20} value={extraCyclesInput}
                onChange={(e) => setExtraCyclesInput(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f1e] border border-amber-900/40 text-center text-lg font-black font-mono focus:outline-none focus:border-amber-500 transition-colors text-amber-400"
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">solo drift</span>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setShowNewGameConfirm(false)}
                className="px-5 py-2.5 rounded-xl bg-[#171727] hover:bg-[#1c1c30] border border-[#252540] text-sm font-bold transition-colors cursor-pointer">
                Annulla
              </button>
              <button onClick={newGame} disabled={loading === "new"}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-sm font-black transition-all cursor-pointer shadow-lg shadow-red-900/40 active:scale-95">
                {loading === "new" ? "Reset in corso..." : "Reimposta e Inizia"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="p-6 space-y-6">

        {/* ── Game Controls ── */}
        <section className="bg-[#0f0f1e] rounded-3xl border border-[#1e1e35] p-6 shadow-xl shadow-black/30">
          <div className="flex flex-wrap items-center gap-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusInfo.dot, boxShadow: `0 0 10px ${statusInfo.dot}60`, flexShrink: 0 }} />
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border ${statusInfo.cls}`}>{statusInfo.label}</span>
            </div>

            {/* Cycle */}
            {(() => {
              const totalGame = game.total_cycles + (game.extra_cycles ?? 0);
              const isWindDown = game.current_cycle > game.total_cycles && game.extra_cycles > 0;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Ciclo</span>
                    <span className="text-3xl font-bebas text-white leading-none tracking-widest">
                      {game.current_cycle}
                      <span className="text-slate-600 text-2xl"> / {totalGame}</span>
                    </span>
                    {isWindDown && (
                      <span className="text-[10px] bg-amber-900/30 text-amber-400 border border-amber-700/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Wind-down</span>
                    )}
                  </div>

                  {/* Progress bar — two-tone: eventi (viola) + wind-down (ambra) */}
                  {totalGame > 0 && (
                    <div className="flex-1 min-w-[200px]">
                      <div className="h-2.5 bg-[#171727] rounded-full overflow-hidden border border-[#252540] relative">
                        {/* Events portion */}
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(game.current_cycle, game.total_cycles) / totalGame * 100}%` }} />
                        {/* Wind-down portion */}
                        {isWindDown && (
                          <div className="absolute top-0 h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700"
                            style={{
                              left: `${game.total_cycles / totalGame * 100}%`,
                              width: `${(game.current_cycle - game.total_cycles) / totalGame * 100}%`,
                            }} />
                        )}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                        <span>{game.extra_cycles > 0 ? `eventi: ${game.total_cycles} | wind-down: ${game.extra_cycles}` : ""}</span>
                        <span>{Math.round((game.current_cycle / Math.max(totalGame, 1)) * 100)}%</span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex-1" />

            {/* Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {canStart && (
                <div className="flex items-center gap-1.5 bg-[#171727] border border-[#252540] rounded-xl px-3 py-2">
                  <label className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">Cicli</label>
                  <input type="number" min={1} max={50} value={totalCyclesInput}
                    onChange={(e) => setTotalCyclesInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-transparent text-white text-center text-sm font-black font-mono focus:outline-none"
                  />
                  <span className="text-slate-600 text-xs font-bold">+</span>
                  <input type="number" min={0} max={20} value={extraCyclesInput}
                    onChange={(e) => setExtraCyclesInput(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-10 bg-transparent text-amber-400 text-center text-sm font-black font-mono focus:outline-none"
                    title="Cicli wind-down senza eventi"
                  />
                  <span className="text-amber-600 text-[10px] font-bold whitespace-nowrap">wd</span>
                </div>
              )}
              {canStart && (
                <button onClick={startGame} disabled={loading === "start"}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-black transition-all cursor-pointer shadow-lg shadow-violet-900/40 active:scale-95">
                  {loading === "start" ? "Avvio..." : "Inizia Gioco"}
                </button>
              )}
              {game.status === "setup" && (
                <button onClick={openTrading} disabled={loading === "open_trading"}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-black transition-all cursor-pointer shadow-lg shadow-emerald-900/40 active:scale-95">
                  {loading === "open_trading" ? "..." : "Inizia la Partita"}
                </button>
              )}
              {canNext && (
                <button onClick={nextCycle} disabled={loading === "next"}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-black transition-all cursor-pointer shadow-lg shadow-indigo-900/40 active:scale-95">
                  {loading === "next" ? "..." : game.status === "setup" ? "Genera Eventi" : "Ciclo Successivo"}
                </button>
              )}
              {canClose && (
                <button onClick={closePhase} disabled={loading === "close"}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm font-black transition-all cursor-pointer shadow-lg shadow-amber-900/40 active:scale-95">
                  {loading === "close" ? "..." : "Chiudi Fase"}
                </button>
              )}
              {(gameInProgress || game.status === "finished") && (
                <button onClick={() => setShowNewGameConfirm(true)} disabled={loading === "new"}
                  className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-red-900/40 active:scale-95">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading === "new" ? "Reset..." : "Nuova Partita"}
                </button>
              )}
              <button
                onClick={podiumVisible ? hidePodium : showPodium}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
                  podiumVisible
                    ? "bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 shadow-slate-900/40"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40"
                }`}
              >
                <span style={{ fontSize:16 }}>{podiumVisible ? "🙈" : "🏆"}</span>
                {podiumVisible ? "Nascondi Podio" : "Mostra Podio"}
              </button>
              <button
                onClick={volpeDoroVisible ? hideVolpeDoro : showVolpeDoro}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
                  volpeDoroVisible
                    ? "bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 shadow-slate-900/40"
                    : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/40"
                }`}
              >
                <span style={{ fontSize:16 }}>{volpeDoroVisible ? "🙈" : "🦊"}</span>
                {volpeDoroVisible ? "Nascondi Volpe" : "Volpe d'Oro"}
              </button>
              <button
                onClick={dietroQuinteVisible ? hideDietroQuinte : showDietroQuinte}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
                  dietroQuinteVisible
                    ? "bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 shadow-slate-900/40"
                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/40"
                }`}
              >
                <span style={{ fontSize:16 }}>{dietroQuinteVisible ? "🙈" : "🎓"}</span>
                {dietroQuinteVisible ? "Nascondi Slide" : "Dietro le Quinte"}
              </button>
              {dietroQuinteVisible && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateDietroQuinte("prev")}
                    disabled={dietroQuinteSlide <= 1}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                  >
                    Indietro
                  </button>
                  <span className="text-sm font-bebas text-slate-400 tracking-wider min-w-[40px] text-center">{dietroQuinteSlide}/3</span>
                  <button
                    onClick={() => navigateDietroQuinte("next")}
                    disabled={dietroQuinteSlide >= 3}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                  >
                    Avanti
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Timer Control ── */}
        <section className="bg-[#0f0f1e] rounded-3xl border border-[#1e1e35] p-6 shadow-xl shadow-black/30">
          <div className="flex flex-wrap items-center gap-6">

            {/* Label */}
            <SectionLabel>Timer TV</SectionLabel>

            {/* Big display */}
            <div className={`text-5xl font-bebas tracking-widest leading-none min-w-[130px] text-center ${
              timerRemaining <= 0 ? "text-slate-600"
              : timerRemaining <= 10 && timerRunning ? "text-red-400"
              : timerRemaining <= 30 && timerRunning ? "text-amber-400"
              : timerRunning ? "text-white"
              : "text-slate-400"
            }`}>
              {fmtTimerDisplay(timerRemaining)}
            </div>

            {/* Progress bar */}
            <div className="flex-1 min-w-[120px]">
              <div className="h-2 bg-[#171727] rounded-full overflow-hidden border border-[#252540]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: timerTotal > 0 ? `${(timerRemaining / timerTotal) * 100}%` : "0%",
                    background: timerRemaining <= 10 && timerRunning ? "#ef4444"
                      : timerRemaining <= 30 && timerRunning ? "#f59e0b"
                      : "linear-gradient(90deg,#7c3aed,#a78bfa)",
                  }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Start / Pause */}
              <button
                onClick={timerRunning ? timerStop : timerStart}
                className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 ${
                  timerRunning
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40"
                }`}
              >
                {timerRunning ? (
                  <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pausa</>
                ) : (
                  <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>Avvia</>
                )}
              </button>

              {/* Reset */}
              <button
                onClick={timerReset}
                className="px-4 py-2.5 rounded-xl bg-[#171727] hover:bg-[#1c1c30] border border-[#252540] hover:border-slate-500 text-sm font-black transition-all cursor-pointer active:scale-95 flex items-center gap-2 text-slate-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9"/></svg>
                Reset
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-[#252540]" />

              {/* Presets */}
              {[["1'", 60], ["2'", 120], ["3'", 180], ["5'", 300], ["10'", 600]].map(([label, secs]) => (
                <button
                  key={secs}
                  onClick={() => timerPreset(secs as number)}
                  className="px-3 py-2 rounded-lg bg-[#171727] hover:bg-violet-900/30 border border-[#252540] hover:border-violet-600/40 text-xs font-bold text-slate-400 hover:text-violet-300 transition-all cursor-pointer active:scale-95"
                >
                  {label}
                </button>
              ))}

              {/* Divider */}
              <div className="w-px h-8 bg-[#252540]" />

              {/* Custom input */}
              <div className="flex items-center gap-1 bg-[#171727] border border-[#252540] rounded-xl px-3 py-2">
                <input
                  type="number" min={0} max={99} value={timerInput.m}
                  onChange={e => setTimerInput(p => ({ ...p, m: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-10 bg-transparent text-white text-center text-sm font-black font-mono focus:outline-none"
                />
                <span className="text-slate-500 font-bold text-sm">m</span>
                <input
                  type="number" min={0} max={59} value={timerInput.s}
                  onChange={e => setTimerInput(p => ({ ...p, s: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                  className="w-10 bg-transparent text-white text-center text-sm font-black font-mono focus:outline-none"
                />
                <span className="text-slate-500 font-bold text-sm">s</span>
              </div>
              <button
                onClick={timerSet}
                className="px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-sm font-black transition-all cursor-pointer shadow-lg shadow-violet-900/40 active:scale-95"
              >
                Imposta
              </button>
            </div>
          </div>
        </section>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left (2 cols) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Players ── */}
            <section className="bg-[#0f0f1e] rounded-3xl border border-[#1e1e35] shadow-xl shadow-black/30">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e35]">
                <SectionLabel>Giocatori</SectionLabel>
                <span className="text-xs text-slate-500 bg-[#171727] px-2.5 py-1 rounded-full border border-[#252540] font-semibold">{players.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-[#1e1e35]">
                      <th className="px-6 py-3 text-left font-bold">Nome</th>
                      <th className="px-4 py-3 text-right font-bold">Cash</th>
                      <th className="px-4 py-3 text-right font-bold">Portafoglio</th>
                      <th className="px-4 py-3 text-right font-bold">Totale</th>
                      <th className="px-4 py-3 text-right font-bold">Perf %</th>
                      <th className="px-4 py-3 text-center font-bold">Attivo</th>
                      <th className="px-4 py-3 text-center font-bold">Det.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.length === 0 && (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-600 text-sm">Nessun giocatore. Creane uno qui sotto.</td></tr>
                    )}
                    {players.map((p) => {
                      const portfolioValue = p.total_value - p.current_cash;
                      const isExpanded = expandedPlayer === p.id;
                      return (
                        <tr key={p.id} className="border-b border-[#1e1e35]/50 last:border-0">
                          <td colSpan={7} className="p-0">
                            <div>
                              <div className="flex items-center hover:bg-[#171727]/30 transition-colors">
                                <div className="px-6 py-3.5 flex-1 min-w-[140px]">
                                  <div className="font-black text-white text-base">{p.name}</div>
                                </div>
                                <div className="px-4 py-3.5 w-[130px] text-right font-mono text-slate-300 font-semibold">€{fmt(p.current_cash)}</div>
                                <div className="px-4 py-3.5 w-[130px] text-right font-mono text-slate-300 font-semibold">€{fmt(portfolioValue)}</div>
                                <div className="px-4 py-3.5 w-[130px] text-right font-mono font-black text-white text-base">€{fmt(p.total_value)}</div>
                                <div className={`px-4 py-3.5 w-[110px] text-right font-mono font-black text-base ${perfColor(p.performance)}`}>
                                  {p.performance > 0 ? "+" : ""}{p.performance.toFixed(2)}%
                                </div>
                                <div className="px-4 py-3.5 w-[80px] text-center">
                                  <button onClick={() => togglePlayerActive(p)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                                      p.active ? "bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-900/40 scale-110" : "bg-[#171727] border-[#252540]"
                                    }`}
                                    title={p.active ? "Disattiva" : "Attiva"}
                                  />
                                </div>
                                <div className="px-4 py-3.5 w-[70px] text-center">
                                  <button onClick={() => setExpandedPlayer(isExpanded ? null : p.id)}
                                    className="text-slate-500 hover:text-violet-400 transition-colors cursor-pointer text-lg font-bold">
                                    {isExpanded ? "▲" : "▼"}
                                  </button>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="bg-[#171727]/30 px-8 py-4 border-t border-[#1e1e35]/50">
                                  {(!p.positions || p.positions.length === 0) ? (
                                    <p className="text-slate-600 text-xs italic">Nessuna posizione aperta</p>
                                  ) : (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                                          <th className="py-1 text-left font-bold">Ticker</th>
                                          <th className="py-1 text-right font-bold">Qtà</th>
                                          <th className="py-1 text-right font-bold">Prezzo</th>
                                          <th className="py-1 text-right font-bold">Valore</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {p.positions.map((pos, i) => (
                                          <tr key={i} className="text-slate-300">
                                            <td className="py-1.5 font-black text-violet-400">{pos.ticker}</td>
                                            <td className="py-1.5 text-right font-mono font-semibold">{pos.quantity}</td>
                                            <td className="py-1.5 text-right font-mono font-semibold">€{fmt(pos.current_price)}</td>
                                            <td className="py-1.5 text-right font-mono font-bold text-white">€{fmt(pos.current_value)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Create player */}
              <div className="px-6 py-4 border-t border-[#1e1e35] flex items-center gap-3 flex-wrap">
                <input type="text" placeholder="Nome giocatore..." value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createPlayer()}
                  className="px-4 py-2.5 rounded-xl bg-[#171727] border border-[#252540] text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors w-48"
                />
                <div className="flex items-center gap-2 bg-[#171727] border border-[#252540] rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-500 font-semibold">Cash €</span>
                  <input type="number" min={1000} step={1000} value={newPlayerCash}
                    onChange={(e) => setNewPlayerCash(Math.max(1000, parseInt(e.target.value) || 1000))}
                    className="w-24 bg-transparent text-sm font-black font-mono text-white focus:outline-none text-right"
                  />
                </div>
                <button onClick={createPlayer} disabled={!newPlayerName.trim() || loading === "create"}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-black transition-all cursor-pointer shadow-lg shadow-emerald-900/30 active:scale-95">
                  {loading === "create" ? "..." : "Aggiungi"}
                </button>
              </div>
            </section>

            {/* ── Current Events ── */}
            <section className="bg-[#0f0f1e] rounded-3xl border border-[#1e1e35] shadow-xl shadow-black/30">
              <div className="px-6 py-5 border-b border-[#1e1e35] flex items-center gap-3">
                <SectionLabel>Events Correnti</SectionLabel>
                <span className="text-slate-500 text-sm ml-1">— Ciclo {game.current_cycle}</span>
              </div>
              <div className="p-5 space-y-3">
                {events.length === 0 ? (
                  <p className="text-slate-600 text-sm italic text-center py-4">Nessun evento per questo ciclo.</p>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="p-4 rounded-2xl bg-[#171727]/50 border border-[#252540]/50 hover:border-[#2a2a45] transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-bold text-sm text-white leading-snug">{ev.title}</h3>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap ${categoryBadge(ev.category)}`}>{ev.category}</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{ev.body}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* ── Event Templates ── */}
            <section className="bg-[#0f0f1e] rounded-3xl border border-[#1e1e35] shadow-xl shadow-black/30">
              <div className="px-6 py-5 border-b border-[#1e1e35] flex items-center gap-3">
                <SectionLabel>Template Eventi</SectionLabel>
                <span className="ml-auto text-xs text-slate-500 bg-[#171727] px-2.5 py-1 rounded-full border border-[#252540] font-semibold">{templates.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-[#1e1e35]">
                      <th className="px-6 py-3 text-left font-bold">Nome</th>
                      <th className="px-4 py-3 text-left font-bold">Categoria</th>
                      <th className="px-4 py-3 text-left font-bold">Settore</th>
                      <th className="px-4 py-3 text-left font-bold">Regione</th>
                      <th className="px-4 py-3 text-center font-bold">Intensità</th>
                      <th className="px-4 py-3 text-center font-bold">Stato</th>
                      <th className="px-4 py-3 text-center font-bold">Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.length === 0 && (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-600 text-sm italic">Nessun template trovato.</td></tr>
                    )}
                    {templates.map((t) => (
                      <tr key={t.id} className="border-b border-[#1e1e35]/50 last:border-0 hover:bg-[#171727]/20 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-200">{t.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{t.description}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryBadge(t.category)}`}>{t.category}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-sm">{t.target_sector ?? "—"}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-sm">{t.target_region ?? "—"}</td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < t.intensity_level ? "bg-violet-400" : "bg-[#252540]"}`} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${t.active ? "bg-emerald-900/40 text-emerald-300" : "bg-[#171727] text-slate-500"}`}>
                            {t.active ? "Attivo" : "Inattivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {t.active && (
                            <button onClick={() => deactivateTemplate(t.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/60 border border-red-800/50 transition-colors cursor-pointer font-bold">
                              Disattiva
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* ── Quick Stats ── */}
            <div className="grid grid-cols-2 gap-4">
              <MiniStatCard label="Giocatori" value={String(players.length)} color="#8b5cf6" />
              <MiniStatCard label="Attivi" value={String(players.filter(p => p.active).length)} color="#10b981" />
              <MiniStatCard label="Events" value={String(events.length)} color="#f59e0b" />
              <MiniStatCard label="Templates" value={String(templates.filter(t => t.active).length)} color="#3b82f6" />
            </div>

            {/* ── Total AUM ── */}
            {players.length > 0 && (
              <div className="bg-gradient-to-br from-violet-900/30 via-[#0f0f1e] to-indigo-900/20 border border-violet-800/30 rounded-3xl p-6 shadow-xl shadow-violet-900/10">
                <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3">Total AUM</div>
                <div className="text-5xl font-bebas text-white leading-none mb-2 tracking-wide">{fmtK(totalAUM)}</div>
                <div className="text-xs text-slate-500">Assets under management</div>
              </div>
            )}

            {/* ── Leaderboard ── */}
            <section className="bg-[#0f0f1e] rounded-3xl border border-[#1e1e35] shadow-xl shadow-black/30">
              <div className="px-6 py-5 border-b border-[#1e1e35]">
                <SectionLabel>Classifica</SectionLabel>
              </div>
              <div className="p-4 space-y-2.5">
                {leaderboard.length === 0 ? (
                  <p className="text-slate-600 text-sm italic text-center py-5">Nessuna classifica.</p>
                ) : (
                  leaderboard.map((entry) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const medal = entry.rank <= 3 ? medals[entry.rank - 1] : null;
                    const isTop = entry.rank <= 3;
                    return (
                      <div key={entry.player_id}
                        className={`flex items-center gap-3 p-4 rounded-2xl transition-colors ${
                          isTop ? "bg-gradient-to-r from-violet-900/20 to-violet-900/5 border border-violet-800/20" : "bg-[#171727]/40 border border-[#252540]/30 hover:bg-[#171727]/60"
                        }`}
                      >
                        <span className="text-xl w-8 text-center shrink-0">
                          {medal ?? <span className="text-sm font-black text-slate-600">#{entry.rank}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-black text-sm truncate ${isTop ? "text-white" : "text-slate-300"}`}>{entry.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Cash €{fmt(entry.cash)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bebas text-lg text-white tracking-wide">€{fmt(entry.total_value)}</div>
                          <div className={`text-sm font-bebas tracking-wide ${perfColor(entry.performance)}`}>
                            {entry.performance > 0 ? "+" : ""}{entry.performance.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function MiniStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0f0f1e] border border-[#1e1e35] rounded-2xl p-5 shadow-lg shadow-black/20 hover:border-[#2a2a40] transition-colors">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{label}</div>
      <div className="text-4xl font-bebas leading-none tracking-wide" style={{ color }}>{value}</div>
    </div>
  );
}

// ── Mercato Overview ───────────────────────────────────────────────
