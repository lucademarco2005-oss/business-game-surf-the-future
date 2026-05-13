import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Label,
} from "recharts";
import EventVisualizer from "./EventVisualizer";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "stocks" | "portfolio" | "events";

interface GameState { current_cycle: number; total_cycles: number; status: string; }

interface Stock {
  id: number; ticker: string; name: string; description: string;
  sector: string; region: string; initial_price: number; current_price: number;
  market_cap: number; pe_ratio: number; eps: number; dividend_yield: number;
  roi: number; roe: number; target_price: number; risk_level: number;
  open_price: number; close_price: number; bid: number; ask: number;
  beta: number; revenue: number; ebitda: number; annual_performance: number;
}

interface PricePoint { cycle_number: number; price: number; }
interface StockHistoryData { security: Stock; history: PricePoint[]; }

interface Position {
  security_id: number; ticker: string; security_name: string; sector: string;
  quantity: number; current_price: number; position_value: number;
  avg_purchase_price: number; return_pct: number;
}

interface PortfolioHistoryPoint { cycle_number: number; total_value: number; }
interface Player { id: number; name: string; current_cash: number; initial_cash: number; }

interface BalanceMetrics {
  diversification_score: number;
  portfolio_beta: number;
  risk_score: number;
  sharpe_ratio: number | null;
  cash_pct: number;
  n_sectors: number;
}

interface PlayerData {
  player: Player; positions: Position[];
  portfolio_history: PortfolioHistoryPoint[];
  total_value: number; total_securities_value: number; performance: number;
  balance?: BalanceMetrics;
}

interface Trade {
  id: number; ticker: string; security_name: string; type: "BUY" | "SELL";
  quantity: number; price_at_execution: number; timestamp: string; cycle_number: number;
}

interface GameEvent {
  id: number; title: string; body: string; category: string; game_cycle: number;
}

interface PlayerOption { id: number; name: string; }

interface LeaderboardEntry { rank: number; player_id: number; name: string; cash: number; securities_value: number; total_value: number; performance: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTOR_ORDER = ["Biotech & Gene Therapy", "AI Drug Discovery", "Robotics & Automation", "Semiconductor & AI Infra", "Nuclear & Clean Energy", "Healthcare Systems", "Logistics & Supply Chain", "Food & AgriTech"];

const SECTOR_COLORS: Record<string, string> = {
  "Biotech & Gene Therapy": "#34d399",
  "AI Drug Discovery": "#a78bfa",
  "Robotics & Automation": "#fb923c",
  "Semiconductor & AI Infra": "#60a5fa",
  "Nuclear & Clean Energy": "#f87171",
  "Healthcare Systems": "#f472b6",
  "Logistics & Supply Chain": "#818cf8",
  "Food & AgriTech": "#86efac",
  Cash: "#64748b",
};

const CATEGORY_COLORS: Record<string, string> = {
  geopolitica: "bg-red-900/40 text-red-300 border-red-700/50",
  macroeconomia: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  regolamentazione: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  tech_disruption: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  crisi_ambientale: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  cigno_nero: "bg-amber-900/40 text-amber-300 border-amber-700/50",
};

const CATEGORY_ACCENT: Record<string, string> = {
  geopolitica: "#f87171",
  macroeconomia: "#60a5fa",
  regolamentazione: "#22d3ee",
  tech_disruption: "#a78bfa",
  crisi_ambientale: "#34d399",
  cigno_nero: "#fbbf24",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "Tutte",
  geopolitica: "Geopolitica",
  macroeconomia: "Macroeconomia",
  regolamentazione: "Regolamentazione",
  tech_disruption: "Tech Disruption",
  crisi_ambientale: "Crisi Ambientale",
  cigno_nero: "Cigno Nero",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1e12) return `€${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `€${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  return `€${fmt(n)}`;
};
const pctStr = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const pctCls = (v: number) => v >= 0 ? "text-emerald-400" : "text-red-400";
const catCls = (c: string) => CATEGORY_COLORS[c] ?? "bg-[#171727] text-slate-300 border-[#252540]";

// ─── Shared Tooltip style ─────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: { backgroundColor: "#0d0d1e", border: "1px solid #1e1e35", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" },
  labelStyle: { color: "#64748b" },
  cursor: { stroke: "rgba(139,92,246,0.3)", strokeWidth: 1 },
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allEvents, setAllEvents] = useState<GameEvent[]>([]);

  const [stockHistory, setStockHistory] = useState<StockHistoryData | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [portfolioChartType, setPortfolioChartType] = useState<"line" | "pie">("line");

  const [infoTooltip, setInfoTooltip] = useState<string | null>(null);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [tradeOpen, setTradeOpen] = useState<{ secId: number; type: "BUY" | "SELL" } | null>(null);
  const [tradeQty, setTradeQty] = useState("1");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [selectedEventCycle, setSelectedEventCycle] = useState<number | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [archiveCycle, setArchiveCycle] = useState<number | "all">("all");

  const [positionFilter, setPositionFilter] = useState<"all" | "positive" | "negative">("all");
  const [positionSort, setPositionSort] = useState<"value" | "return" | "weight">("value");
  const [positionSortDir, setPositionSortDir] = useState<"desc" | "asc">("desc");
  const [sectorPositionFilter, setSectorPositionFilter] = useState<string>("all");
  const [tradeMode, setTradeMode] = useState<"qty" | "amount">("qty");
  const [tradeAmount, setTradeAmount] = useState("");

  const [podiumData, setPodiumData] = useState<{ show: boolean; leaderboard: LeaderboardEntry[] }>({ show: false, leaderboard: [] });

  useEffect(() => {
    const checkPodium = () => {
      axios.get("/api/game/podium")
        .then(r => { if (mountedRef.current) setPodiumData(r.data); })
        .catch(() => { });
    };
    checkPodium();
    const iv = setInterval(checkPodium, 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    axios.get("/api/master/players")
      .then(r => { if (mountedRef.current) setPlayers(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { });
  }, []);

  const fetchAll = useCallback(async () => {
    if (playerId === null) return;
    await Promise.allSettled([
      axios.get("/api/game/state").then(r => { if (mountedRef.current && r.data?.status) setGameState(r.data); }),
      axios.get("/api/stocks").then(r => { if (mountedRef.current) setStocks(Array.isArray(r.data) ? r.data : []); }),
      axios.get(`/api/player/${playerId}`).then(r => { if (mountedRef.current) setPlayerData(r.data); }),
      axios.get(`/api/player/${playerId}/trades`).then(r => { if (mountedRef.current) setTrades(Array.isArray(r.data) ? r.data : []); }),
      axios.get("/api/events").then(r => { if (mountedRef.current) setAllEvents(Array.isArray(r.data) ? r.data : []); }),
    ]);
  }, [playerId]);

  useEffect(() => {
    fetchAll();
    if (playerId === null) return;
    const iv = setInterval(fetchAll, 5000);
    return () => clearInterval(iv);
  }, [fetchAll, playerId]);

  useEffect(() => {
    if (selectedStockId === null) { setStockHistory(null); return; }
    axios.get(`/api/stocks/${selectedStockId}/history`)
      .then(r => { if (mountedRef.current) setStockHistory(r.data); })
      .catch(() => setStockHistory(null));
  }, [selectedStockId]);

  const executeTrade = async () => {
    if (!tradeOpen || playerId === null) return;
    const stock = stocks.find(s => s.id === tradeOpen.secId);
    if (!stock || stock.current_price <= 0) { setTradeMsg({ text: "Titolo non disponibile", ok: false }); return; }
    const qty = tradeMode === "qty"
      ? parseInt(tradeQty, 10)
      : Math.floor((parseFloat(tradeAmount) || 0) / stock.current_price);
    if (isNaN(qty) || qty <= 0) { setTradeMsg({ text: "Quantità non valida", ok: false }); return; }
    setTradeLoading(true); setTradeMsg(null);
    try {
      await axios.post(`/api/player/${playerId}/trade`, { security_id: tradeOpen.secId, type: tradeOpen.type, quantity: qty });
      setTradeMsg({ text: `${tradeOpen.type} ${qty} azioni eseguito`, ok: true });
      await fetchAll();
      if (selectedStockId === tradeOpen.secId) {
        const hist = await axios.get(`/api/stocks/${tradeOpen.secId}/history`);
        if (mountedRef.current) setStockHistory(hist.data);
      }
      setTimeout(() => { if (mountedRef.current) { setTradeOpen(null); setTradeMsg(null); } }, 1500);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.detail ? err.response.data.detail : "Ordine fallito";
      setTradeMsg({ text: String(msg), ok: false });
    } finally { setTradeLoading(false); }
  };

  const viewStock = (secId: number) => { setSelectedStockId(secId); setActiveTab("stocks"); };

  // ─── Derived ───────────────────────────────────────────────────────────────
  const selectedStock = stocks.find(s => s.id === selectedStockId) ?? null;
  const player = playerData?.player ?? null;
  const positions = playerData?.positions ?? [];
  const portfolioHistory = playerData?.portfolio_history ?? [];
  const totalValue = playerData?.total_value ?? 0;
  const performance = playerData?.performance ?? 0;

  const filteredStocks = stocks.filter(s => {
    const q = sidebarSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q);
  });
  const groupedStocks: Record<string, Stock[]> = {};
  for (const sector of SECTOR_ORDER) {
    const list = filteredStocks
      .filter(s => s.sector.toLowerCase() === sector.toLowerCase())
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
    if (list.length > 0) groupedStocks[sector] = list;
  }

  const history = stockHistory?.history ?? [];
  const cycleChangePct = history.length >= 2
    ? ((history[history.length - 1].price - history[history.length - 2].price) / history[history.length - 2].price) * 100
    : 0;

  const sectorPieData = (() => {
    const map: Record<string, number> = {};
    for (const pos of positions) {
      const key = pos.sector || "Other";
      map[key] = (map[key] || 0) + pos.position_value;
    }
    if ((playerData?.player.current_cash ?? 0) > 0) map["Cash"] = playerData!.player.current_cash;
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value), color: SECTOR_COLORS[name] ?? "#6b7280" }));
  })();

  const eventsByCycle = allEvents.reduce((acc, ev) => {
    const k = ev.game_cycle;
    if (!acc[k]) acc[k] = [];
    acc[k].push(ev);
    return acc;
  }, {} as Record<number, GameEvent[]>);
  const cycleKeys = Object.keys(eventsByCycle).map(Number).sort((a, b) => b - a);

  const filteredEvents = allEvents
    .filter(ev => selectedEventCycle === "all" || ev.game_cycle === selectedEventCycle)
    .filter(ev => categoryFilter === "all" || ev.category === categoryFilter)
    .sort((a, b) => b.game_cycle - a.game_cycle);

  const uniqueSectors = [...new Set(positions.map(p => p.sector))].sort();

  const visiblePositions = [...positions]
    .filter(pos => {
      if (positionFilter === "positive") return pos.return_pct >= 0;
      if (positionFilter === "negative") return pos.return_pct < 0;
      return true;
    })
    .filter(pos => sectorPositionFilter === "all" || pos.sector === sectorPositionFilter)
    .sort((a, b) => {
      const dir = positionSortDir === "asc" ? 1 : -1;
      if (positionSort === "return") return (a.return_pct - b.return_pct) * dir;
      if (positionSort === "weight") return (a.position_value - b.position_value) * dir;
      return (a.position_value - b.position_value) * dir;
    });

  // ─────────────────────────────────────────────────────────────────────────────
  // PLAYER SELECTION SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (playerId === null) {
    return (
      <div className="min-h-screen bg-[#0b0b16] flex items-center justify-center p-6">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)" }} />
        </div>
        <div className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl p-10 w-full max-w-md shadow-2xl shadow-black/60 relative">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(124,58,237,0.4)", fontSize: 24, fontWeight: 900, color: "#fff" }}>
              PS
            </div>
          </div>
          <h1 className="text-4xl font-bebas text-white mb-1 text-center tracking-widest">Portfolio Simulator</h1>
          <p className="text-slate-500 text-sm text-center mb-8">Seleziona il tuo profilo per iniziare</p>
          {players.length === 0 ? (
            <p className="text-slate-500 text-center text-sm">Caricamento giocatori...</p>
          ) : (
            <div className="space-y-3">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlayerId(p.id)}
                  className="w-full flex items-center gap-4 bg-[#171727] hover:bg-[#1c1c30] border border-[#252540] hover:border-violet-600/50 rounded-2xl px-5 py-4 transition-all duration-200 cursor-pointer group"
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#a78bfa" }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="text-white font-semibold text-base group-hover:text-violet-300 transition-colors">{p.name}</span>
                  <svg className="ml-auto w-5 h-5 text-slate-600 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN INTERFACE
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0b0b16] text-slate-200 flex flex-col">

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b16]/95 backdrop-blur-xl border-b border-[#1e1e32] px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>PS</div>
          <span className="text-lg font-bebas text-white tracking-widest">Portfolio Simulator</span>
          {gameState && (
            <span className="text-xs bg-[#171727] text-slate-400 px-2.5 py-0.5 rounded-full font-mono border border-[#252540]">
              Ciclo {gameState.current_cycle}/{gameState.total_cycles}
            </span>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 bg-[#171727] rounded-xl p-1 border border-[#252540]">
          {(["stocks", "portfolio", "events"] as Tab[]).map(tab => {
            const labels: Record<Tab, string> = { stocks: "Aziende", portfolio: "Portafoglio", events: "Eventi" };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === tab ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50" : "text-slate-400 hover:text-white"
                  }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </nav>

        {/* Mini stats */}
        <div className="flex items-center gap-3 shrink-0">
          {player && (
            <>
              <StatPill label="Cash" value={`€${fmt(player.current_cash)}`} />
              <StatPill label="Totale" value={`€${fmt(totalValue)}`} />
              <StatPill label="Perf" value={pctStr(performance)} colored pct={performance} />
            </>
          )}
          <button onClick={() => { setPlayerId(null); setPlayerData(null); setStocks([]); setTrades([]); setAllEvents([]); setSelectedStockId(null); }}
            className="text-xs text-slate-500 hover:text-white border border-[#252540] hover:border-[#3a3a55] rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
          >
            Cambia
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 pt-14">

        {/* ══════════════════════════════════════════════════════════════
            TAB: AZIENDE
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "stocks" && (
          <>
            {/* Sidebar */}
            <aside className="w-64 shrink-0 bg-[#0d0d1c] border-r border-[#1a1a30] flex flex-col h-[calc(100vh-56px)] sticky top-14">
              <div className="p-4 border-b border-[#1a1a30]">
                <input type="text" placeholder="Cerca titolo..." value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  className="w-full bg-[#171727] border border-[#252540] text-base text-white placeholder-slate-500 rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {Object.entries(groupedStocks).map(([sector, list]) => (
                  <div key={sector}>
                    <div className="px-4 py-2.5 text-xs font-black uppercase tracking-widest sticky top-0 bg-[#0d0d1c] border-b border-[#1a1a30]/40"
                      style={{ color: SECTOR_COLORS[sector] ?? "#94a3b8" }}>
                      {sector}
                    </div>
                    {list.map(s => (
                      <button key={s.id} onClick={() => setSelectedStockId(s.id)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#171727] transition-colors cursor-pointer border-l-2 ${selectedStockId === s.id ? "bg-[#171727] border-violet-500" : "border-transparent"
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="text-base font-bold text-white">{s.ticker}</div>
                          <div className="text-sm text-slate-400 truncate">{s.name}</div>
                        </div>
                        <div className={`text-sm font-mono ml-1 shrink-0 font-semibold ${s.current_price > s.open_price ? "text-emerald-400" : s.current_price < s.open_price ? "text-red-400" : "text-slate-400"
                          }`}>€{fmt(s.current_price)}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </aside>

            {/* Stock Detail */}
            <main className="flex-1 overflow-y-auto p-6 space-y-5">
              {!selectedStock ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-7xl mb-5 opacity-10">📈</div>
                    <p className="text-xl font-semibold text-slate-500 mb-2">Seleziona un titolo dalla sidebar</p>
                    <p className="text-sm text-slate-600">Visualizza grafico, fondamentali e opera</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Stock Card ── */}
                  <div className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl p-6 shadow-2xl shadow-black/40">

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-4xl font-bebas text-white tracking-widest">{selectedStock.ticker}</h2>
                          <span className="text-xs px-3 py-1 rounded-full font-bold"
                            style={{ color: SECTOR_COLORS[selectedStock.sector] ?? "#94a3b8", backgroundColor: `${SECTOR_COLORS[selectedStock.sector] ?? "#94a3b8"}18`, border: `1px solid ${SECTOR_COLORS[selectedStock.sector] ?? "#94a3b8"}40` }}>
                            {selectedStock.sector}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{selectedStock.region}</span>
                        </div>
                        <p className="text-lg text-slate-300 font-medium">{selectedStock.name}</p>
                      </div>
                      {/* Price block */}
                      <div className="text-right shrink-0 ml-6">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Prezzo attuale</div>
                        <div className="text-6xl font-bebas text-white leading-none tracking-wide">€{fmt(selectedStock.current_price)}</div>
                        <div className={`text-xl font-bebas tracking-wide mt-1.5 ${pctCls(cycleChangePct)}`}>
                          {pctStr(cycleChangePct)} <span className="text-sm font-sans font-normal text-slate-500">ultimo ciclo</span>
                        </div>
                      </div>
                    </div>

                    {/* Area Chart */}
                    {history.length > 0 ? (
                      <div className="h-72 mb-5">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a30" vertical={false} />
                            <XAxis dataKey="cycle_number" tick={{ fill: "#475569", fontSize: 13 }} axisLine={false} tickLine={false} label={{ value: "Ciclo", position: "insideBottomRight", offset: -5, fill: "#475569", fontSize: 13 }} />
                            <YAxis tick={{ fill: "#475569", fontSize: 13 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v: number) => `€${v.toFixed(0)}`} width={62} />
                            <Tooltip {...tooltipStyle} formatter={(v: number) => [`€${fmt(v)}`, "Prezzo"]} labelFormatter={(l: number) => `Ciclo ${l}`} />
                            <Area type="linear" dataKey="price" stroke="#8b5cf6" strokeWidth={2.5} fill="none" dot={false} activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 mb-5 flex items-center justify-center text-slate-600 text-sm">Nessuno storico prezzi disponibile</div>
                    )}

                    {/* Fundamentals */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div style={{ width: 3, height: 16, borderRadius: 2, background: "#7c3aed" }} />
                        <span className="text-sm font-bebas text-violet-400 tracking-widest">Fondamentali</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "Market Cap", value: fmtCompact(selectedStock.market_cap), accent: "#a78bfa" },
                          { label: "P/E Ratio", value: selectedStock.pe_ratio !== 0 ? selectedStock.pe_ratio.toFixed(1) : "N/A", accent: selectedStock.pe_ratio >= 0 ? "#60a5fa" : "#f87171" },
                          { label: "ROI", value: `${(selectedStock.roi * 100).toFixed(1)}%`, accent: selectedStock.roi >= 0 ? "#34d399" : "#f87171" },
                          { label: "ROE", value: `${(selectedStock.roe * 100).toFixed(1)}%`, accent: selectedStock.roe >= 0 ? "#34d399" : "#f87171" },
                          { label: "Revenue", value: fmtCompact(selectedStock.revenue), accent: "#fbbf24" },
                          { label: "EBITDA", value: fmtCompact(selectedStock.ebitda), accent: "#fb923c" },
                          { label: "Δ% Ciclo", value: pctStr(cycleChangePct), accent: cycleChangePct >= 0 ? "#34d399" : "#f87171" },
                          { label: "Beta", value: selectedStock.beta != null ? selectedStock.beta.toFixed(2) : "N/A", accent: (selectedStock.beta ?? 1) > 1 ? "#f59e0b" : "#22d3ee" },
                        ].map((m, i) => (
                          <div key={i} className="bg-[#171727]/60 border border-[#252540]/40 rounded-2xl p-4 hover:border-[#3a3a55] transition-all duration-200 group">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{m.label}</div>
                            <div className="text-3xl font-bebas text-white leading-none tracking-wide">{m.value}</div>
                            <div className="mt-2 h-0.5 rounded-full" style={{ background: `${m.accent}60`, width: "100%" }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ background: m.accent, width: "40%" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Descrizione azienda */}
                    {selectedStock.description && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div style={{ width: 3, height: 16, borderRadius: 2, background: "#7c3aed" }} />
                          <span className="text-sm font-bebas text-violet-400 tracking-widest">Descrizione</span>
                        </div>
                        <div className="bg-[#171727]/60 border border-[#252540]/40 rounded-2xl p-5">
                          <p className="text-sm text-slate-300 leading-relaxed">{selectedStock.description}</p>
                        </div>
                      </div>
                    )}

                    {/* Trade section */}
                    {(() => {
                      const ownedPos = positions.find(p => p.security_id === selectedStock.id);
                      const ownedQty = ownedPos?.quantity ?? 0;
                      const price = selectedStock.current_price;
                      const cash = player?.current_cash ?? 0;
                      const maxAffordable = Math.floor(cash / price);
                      // Compute effective quantity based on trade mode
                      const effectiveQty = tradeMode === "qty"
                        ? parseInt(tradeQty, 10) || 0
                        : Math.floor((parseFloat(tradeAmount) || 0) / price);
                      const orderTotal = effectiveQty * price;
                      const remainingCash = cash - orderTotal;
                      const canAfford = remainingCash >= 0 && effectiveQty > 0;

                      const doTrade = async (type: "BUY" | "SELL") => {
                        if (playerId === null || effectiveQty <= 0) {
                          setTradeMsg({ text: "Quantità non valida", ok: false }); return;
                        }
                        setTradeLoading(true); setTradeMsg(null);
                        try {
                          await axios.post(`/api/player/${playerId}/trade`, { security_id: selectedStock.id, type, quantity: effectiveQty });
                          setTradeMsg({ text: `${type} ${effectiveQty} azioni eseguito`, ok: true });
                          await fetchAll();
                          const h = await axios.get(`/api/stocks/${selectedStock.id}/history`);
                          if (mountedRef.current) setStockHistory(h.data);
                          setTimeout(() => { if (mountedRef.current) setTradeMsg(null); }, 2000);
                        } catch (err: unknown) {
                          const msg = axios.isAxiosError(err) && err.response?.data?.detail ? err.response.data.detail : "Ordine fallito";
                          setTradeMsg({ text: String(msg), ok: false });
                        } finally { setTradeLoading(false); }
                      };

                      return (
                        <div className="border-t border-[#1e1e32] pt-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div style={{ width: 3, height: 16, borderRadius: 2, background: "#7c3aed" }} />
                            <span className="text-sm font-bebas text-violet-400 tracking-widest">Operazioni</span>
                            {ownedQty > 0 && (
                              <span className="ml-2 text-xs bg-violet-900/30 text-violet-300 border border-violet-700/40 px-2.5 py-0.5 rounded-full font-bold">
                                Possiedi: {ownedQty} az. · €{fmt(ownedQty * price)}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-[1fr_auto] gap-5">
                            {/* Left: Input + mode toggle */}
                            <div className="space-y-3">
                              {/* Mode toggle */}
                              <div className="flex items-center gap-1 bg-[#171727] rounded-xl p-1 border border-[#252540] w-fit">
                                <button onClick={() => setTradeMode("qty")}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${tradeMode === "qty" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                                    }`}>Quantità</button>
                                <button onClick={() => setTradeMode("amount")}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${tradeMode === "amount" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                                    }`}>Importo €</button>
                              </div>

                              {/* Input row */}
                              <div className="flex items-center gap-3 flex-wrap">
                                {tradeMode === "qty" ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setTradeQty(q => String(Math.max(1, (parseInt(q) || 1) - 1)))}
                                      className="w-8 h-8 rounded-lg bg-[#171727] border border-[#252540] text-slate-300 hover:text-white hover:border-[#3a3a55] flex items-center justify-center cursor-pointer font-bold text-lg transition-colors">−</button>
                                    <input type="number" min={1} value={tradeQty} onChange={e => setTradeQty(e.target.value)}
                                      className="w-20 bg-[#171727] border border-[#252540] text-white font-mono text-sm font-bold focus:outline-none focus:border-violet-500 text-center rounded-lg px-2 py-1.5 transition-colors"
                                    />
                                    <button onClick={() => setTradeQty(q => String((parseInt(q) || 0) + 1))}
                                      className="w-8 h-8 rounded-lg bg-[#171727] border border-[#252540] text-slate-300 hover:text-white hover:border-[#3a3a55] flex items-center justify-center cursor-pointer font-bold text-lg transition-colors">+</button>
                                    <button onClick={() => setTradeQty(String(maxAffordable))}
                                      className="text-xs px-2 py-1 rounded-lg bg-[#171727] border border-[#252540] text-slate-500 hover:text-violet-300 hover:border-violet-600/40 cursor-pointer font-bold transition-colors ml-1"
                                      title="Massimo acquistabile">MAX</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-bold">€</span>
                                    <input type="number" min={0} step={100} value={tradeAmount} onChange={e => setTradeAmount(e.target.value)}
                                      placeholder="10000"
                                      className="w-32 bg-[#171727] border border-[#252540] text-white font-mono text-sm font-bold focus:outline-none focus:border-violet-500 text-right rounded-lg px-3 py-1.5 transition-colors placeholder-slate-600"
                                    />
                                    <button onClick={() => setTradeAmount(String(Math.floor(cash)))}
                                      className="text-xs px-2 py-1 rounded-lg bg-[#171727] border border-[#252540] text-slate-500 hover:text-violet-300 hover:border-violet-600/40 cursor-pointer font-bold transition-colors"
                                      title="Tutto il cash disponibile">MAX</button>
                                  </div>
                                )}

                                <button disabled={tradeLoading || !canAfford} onClick={() => doTrade("BUY")}
                                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-base px-8 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-900/40 active:scale-95">
                                  BUY
                                </button>
                                <button disabled={tradeLoading || effectiveQty <= 0 || effectiveQty > ownedQty} onClick={() => doTrade("SELL")}
                                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-base px-8 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-900/40 active:scale-95">
                                  SELL
                                </button>
                                {tradeMsg && (
                                  <span className={`text-sm font-semibold font-mono ${tradeMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{tradeMsg.text}</span>
                                )}
                              </div>
                            </div>

                            {/* Right: Order summary */}
                            <div className="bg-[#171727]/80 border border-[#252540]/60 rounded-2xl p-5 min-w-[280px] space-y-3">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Riepilogo ordine</div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-slate-500 mb-0.5">Prezzo unitario</div>
                                  <div className="text-sm font-bold font-mono text-slate-200">€{fmt(price)}</div>
                                </div>
                                {tradeMode === "amount" && effectiveQty > 0 && (
                                  <div>
                                    <div className="text-xs text-slate-500 mb-0.5">Azioni</div>
                                    <div className="text-sm font-bold font-mono text-white">{effectiveQty}</div>
                                  </div>
                                )}
                                <div className={tradeMode === "amount" && effectiveQty > 0 ? "col-span-2" : ""}>
                                  <div className="text-xs text-slate-500 mb-0.5">Totale ordine</div>
                                  <div className="text-base font-bold font-mono text-white">€{fmt(orderTotal)}</div>
                                </div>
                              </div>

                              <div className="h-px bg-[#252540]" />

                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">Cash disponibile</div>
                                <div className="text-sm font-mono text-slate-300">€{fmt(cash)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">Cash residuo</div>
                                <div className={`text-base font-bold font-mono ${remainingCash >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  €{fmt(remainingCash)}
                                </div>
                              </div>

                              {ownedQty > 0 && (
                                <>
                                  <div className="h-px bg-[#252540]" />
                                  <div>
                                    <div className="text-xs text-slate-500 mb-0.5">Azioni possedute</div>
                                    <div className="text-sm font-bold font-mono text-violet-300">{ownedQty} az.</div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </main>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: PORTAFOGLIO
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "portfolio" && (
          <main className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* ── Big stats row ── */}
            {player && (
              <div className="grid grid-cols-3 gap-4">
                <BigStatCard
                  label="Valore Totale"
                  value={`€${fmt(totalValue)}`}
                  sub="Portafoglio + Cash"
                  gradient="from-violet-900/30 to-violet-900/5"
                  border="border-violet-800/30"
                  valueColor="text-white"
                />
                <BigStatCard
                  label="Liquidità"
                  value={`€${fmt(player.current_cash)}`}
                  sub={`Su €${fmt(player.initial_cash)} iniziali`}
                  gradient="from-blue-900/30 to-blue-900/5"
                  border="border-blue-800/30"
                  valueColor="text-white"
                />
                <BigStatCard
                  label="Performance"
                  value={pctStr(performance)}
                  sub={performance >= 0 ? "In guadagno" : "In perdita"}
                  gradient={performance >= 0 ? "from-emerald-900/30 to-emerald-900/5" : "from-red-900/30 to-red-900/5"}
                  border={performance >= 0 ? "border-emerald-800/30" : "border-red-800/30"}
                  valueColor={pctCls(performance)}
                />
              </div>
            )}

            {/* ── Diversification Index ── */}
            {playerData?.balance && (() => {
              const b = playerData.balance!;
              const divScore = b.diversification_score;
              const divLabel = divScore >= 65 ? "Ben diversificato" : divScore >= 35 ? "Parzialmente diversificato" : "Concentrato";
              const divColor = divScore >= 65 ? "#34d399" : divScore >= 35 ? "#fbbf24" : "#f87171";
              const betaLabel = b.portfolio_beta < 0.8 ? "Difensivo" : b.portfolio_beta <= 1.2 ? "Neutro" : "Aggressivo";
              const betaColor = b.portfolio_beta < 0.8 ? "text-emerald-400" : b.portfolio_beta <= 1.2 ? "text-yellow-400" : "text-red-400";
              const betaBg = b.portfolio_beta < 0.8 ? "bg-emerald-900/30 border-emerald-700/40" : b.portfolio_beta <= 1.2 ? "bg-yellow-900/30 border-yellow-700/40" : "bg-red-900/30 border-red-700/40";
              const riskLabel = b.risk_score < 4 ? "Basso" : b.risk_score < 7 ? "Moderato" : "Alto";
              const riskColor = b.risk_score < 4 ? "#34d399" : b.risk_score < 7 ? "#fbbf24" : "#f87171";
              return (
                <section className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl p-6 shadow-xl shadow-black/30">
                  <div className="flex items-center gap-2 mb-5">
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: "#a78bfa" }} />
                    <h3 className="text-base font-bebas text-violet-400 tracking-widest">Indice di Diversificazione</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Diversification Score */}
                    <div className="bg-[#171727] border border-[#252540] rounded-2xl p-4 relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Score Diversificazione</span>
                          <button onClick={() => setInfoTooltip(infoTooltip === "div" ? null : "div")} className="w-5 h-5 rounded-full bg-[#252540] text-slate-500 hover:text-white hover:bg-violet-600/40 transition-all text-[10px] font-bold flex items-center justify-center cursor-pointer">i</button>
                        </div>
                        <span className="text-lg font-black font-mono" style={{ color: divColor }}>{divScore}<span className="text-slate-500 text-sm">/100</span></span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#0d0d1e] mb-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${divScore}%`, background: divColor }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: divColor }}>{divLabel}</span>
                        <span className="text-xs text-slate-600">{b.n_sectors} settori</span>
                      </div>
                      {infoTooltip === "div" && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-[#1a1a30] border border-violet-500/30 rounded-xl p-4 shadow-2xl shadow-black/50 text-xs text-slate-300 leading-relaxed">
                          <p className="mb-1"><strong className="text-violet-300">Cosa misura:</strong> Quanto il tuo portafoglio è distribuito tra settori diversi.</p>
                          <p className="mb-1"><strong className="text-violet-300">Perché è importante:</strong> Se investi tutto nello stesso settore, basta un singolo evento negativo per colpirti duramente. Diversificare ti protegge.</p>
                          <p><strong className="text-violet-300">Come leggerlo:</strong> 100 = perfettamente distribuito su tutti i settori. Sotto 35 sei troppo concentrato.</p>
                        </div>
                      )}
                    </div>

                    {/* Portfolio Beta */}
                    <div className="bg-[#171727] border border-[#252540] rounded-2xl p-4 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Portfolio Beta</span>
                        <button onClick={() => setInfoTooltip(infoTooltip === "beta" ? null : "beta")} className="w-5 h-5 rounded-full bg-[#252540] text-slate-500 hover:text-white hover:bg-violet-600/40 transition-all text-[10px] font-bold flex items-center justify-center cursor-pointer">i</button>
                      </div>
                      <div className="flex items-end gap-3">
                        <span className={`text-3xl font-black font-mono ${betaColor}`}>β{b.portfolio_beta.toFixed(2)}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border mb-1 ${betaBg} ${betaColor}`}>{betaLabel}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Sensibilità agli eventi di mercato</p>
                      {infoTooltip === "beta" && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-[#1a1a30] border border-violet-500/30 rounded-xl p-4 shadow-2xl shadow-black/50 text-xs text-slate-300 leading-relaxed">
                          <p className="mb-1"><strong className="text-violet-300">Cosa misura:</strong> Quanto il tuo portafoglio reagisce quando il mercato si muove.</p>
                          <p className="mb-1"><strong className="text-violet-300">Perché è importante:</strong> Un portafoglio con beta alto guadagna di più quando va bene, ma perde di più quando va male. Un beta basso è più stabile ma meno reattivo.</p>
                          <p><strong className="text-violet-300">Come leggerlo:</strong> Sopra 1 = aggressivo (oscillazioni amplificate). Sotto 1 = difensivo (oscillazioni smorzate). Uguale a 1 = si muove come il mercato.</p>
                        </div>
                      )}
                    </div>

                    {/* Risk Score */}
                    <div className="bg-[#171727] border border-[#252540] rounded-2xl p-4 relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Risk Score</span>
                          <button onClick={() => setInfoTooltip(infoTooltip === "risk" ? null : "risk")} className="w-5 h-5 rounded-full bg-[#252540] text-slate-500 hover:text-white hover:bg-violet-600/40 transition-all text-[10px] font-bold flex items-center justify-center cursor-pointer">i</button>
                        </div>
                        <span className="text-lg font-black font-mono" style={{ color: riskColor }}>{b.risk_score.toFixed(1)}<span className="text-slate-500 text-sm">/10</span></span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#0d0d1e] mb-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(b.risk_score / 10) * 100}%`, background: riskColor }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: riskColor }}>{riskLabel}</span>
                      {infoTooltip === "risk" && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-[#1a1a30] border border-violet-500/30 rounded-xl p-4 shadow-2xl shadow-black/50 text-xs text-slate-300 leading-relaxed">
                          <p className="mb-1"><strong className="text-violet-300">Cosa misura:</strong> Il livello di rischio complessivo del tuo portafoglio, da 0 (molto sicuro) a 10 (molto rischioso).</p>
                          <p className="mb-1"><strong className="text-violet-300">Perché è importante:</strong> Ti dice se stai giocando in modo prudente o aggressivo. Un rischio alto può portare grandi guadagni, ma anche grandi perdite quando arrivano eventi negativi.</p>
                          <p><strong className="text-violet-300">Come leggerlo:</strong> 0-3 = basso rischio (difensivo). 4-6 = rischio moderato (bilanciato). 7-10 = rischio alto (aggressivo).</p>
                        </div>
                      )}
                    </div>

                    {/* Cash & Sharpe */}
                    <div className="bg-[#171727] border border-[#252540] rounded-2xl p-4 relative">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Liquidità & Sharpe</span>
                        <button onClick={() => setInfoTooltip(infoTooltip === "sharpe" ? null : "sharpe")} className="w-5 h-5 rounded-full bg-[#252540] text-slate-500 hover:text-white hover:bg-violet-600/40 transition-all text-[10px] font-bold flex items-center justify-center cursor-pointer">i</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Cash %</span>
                          <span className="text-sm font-black font-mono text-blue-300">{b.cash_pct.toFixed(1)}%</span>
                        </div>
                        {b.sharpe_ratio !== null ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Sharpe Ratio</span>
                            <span className={`text-sm font-black font-mono ${b.sharpe_ratio >= 0 ? "text-emerald-400" : "text-red-400"}`}>{b.sharpe_ratio > 0 ? "+" : ""}{b.sharpe_ratio}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600">Sharpe disponibile dopo 3+ cicli</p>
                        )}
                      </div>
                      {infoTooltip === "sharpe" && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-[#1a1a30] border border-violet-500/30 rounded-xl p-4 shadow-2xl shadow-black/50 text-xs text-slate-300 leading-relaxed">
                          <p className="mb-1"><strong className="text-violet-300">Cash %:</strong> Quanta parte del tuo portafoglio è in contanti. Avere liquidità ti permette di comprare quando arrivano opportunità, ma troppa liquidità non genera rendimento.</p>
                          <p><strong className="text-violet-300">Sharpe Ratio:</strong> Misura quanto rendimento stai ottenendo rispetto al rischio che stai correndo. Sopra 1 = stai facendo molto bene. Tra 0 e 1 = accettabile. Sotto 0 = stai perdendo soldi rispetto al rischio. Disponibile dopo 3 cicli.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </section>
              );
            })()}

            {/* ── Chart section ── */}
            <section className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl p-6 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: "#7c3aed" }} />
                  <h3 className="text-base font-bebas text-violet-400 tracking-widest">Andamento Portafoglio</h3>
                </div>
                <div className="flex items-center gap-1 bg-[#171727] rounded-xl p-1 border border-[#252540]">
                  {(["line", "pie"] as const).map(t => (
                    <button key={t} onClick={() => setPortfolioChartType(t)}
                      className={`text-xs px-4 py-2 rounded-lg font-bold transition-all duration-200 cursor-pointer ${portfolioChartType === t ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" : "text-slate-400 hover:text-white"
                        }`}
                    >
                      {t === "line" ? "Linea" : "Settori"}
                    </button>
                  ))}
                </div>
              </div>

              <div className={portfolioChartType === "pie" ? "min-h-[320px]" : "h-72"}>
                {portfolioChartType === "line" ? (
                  portfolioHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={portfolioHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a30" vertical={false} />
                        <XAxis dataKey="cycle_number" tick={{ fill: "#475569", fontSize: 13 }} axisLine={false} tickLine={false} label={{ value: "Ciclo", position: "insideBottomRight", offset: -5, fill: "#475569", fontSize: 13 }} />
                        <YAxis tick={{ fill: "#475569", fontSize: 13 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} width={62} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`€${fmt(v)}`, "Valore"]} labelFormatter={(l: number) => `Ciclo ${l}`} />
                        <Area type="linear" dataKey="total_value" stroke="#8b5cf6" strokeWidth={2.5} fill="none" dot={{ r: 4, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#8b5cf6" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Nessuno storico disponibile</div>
                  )
                ) : (
                  sectorPieData.length > 0 ? (
                    <div className="flex flex-col items-center">
                      {/* Pie chart */}
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={sectorPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%" cy="50%"
                            outerRadius={125}
                            innerRadius={0}
                            paddingAngle={2}
                            strokeWidth={0}
                            animationBegin={0}
                            animationDuration={800}
                          >
                            {sectorPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="#0b0b16" strokeWidth={4} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [`€${fmt(v)}`, ""]}
                            contentStyle={{ backgroundColor: "#0d0d1e", border: "1px solid #1e1e35", borderRadius: 8, fontSize: 13, color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Custom legend */}
                      <div className="w-full grid grid-cols-2 gap-2.5 px-2 pb-1">
                        {sectorPieData.map((entry, i) => {
                          const pct = totalValue > 0 ? (entry.value / totalValue) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center gap-3 bg-[#171727]/60 rounded-xl px-4 py-3 border border-[#252540]/50 hover:border-[#353560]/60 transition-colors">
                              <div style={{ width: 12, height: 12, borderRadius: "50%", background: entry.color, boxShadow: `0 0 10px ${entry.color}50`, flexShrink: 0 }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-200 truncate">{entry.name}</div>
                                <div className="text-xs text-slate-500 font-mono">€{fmt(entry.value)}</div>
                              </div>
                              <div className="text-lg font-bebas tracking-wide" style={{ color: entry.color }}>{pct.toFixed(0)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Nessuna posizione aperta</div>
                  )
                )}
              </div>
            </section>

            {/* ── Positions table ── */}
            <section className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl overflow-hidden shadow-xl shadow-black/30">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#1e1e32] flex items-center gap-2">
                <div style={{ width: 3, height: 18, borderRadius: 2, background: "#7c3aed" }} />
                <h3 className="text-base font-bebas text-violet-400 tracking-widest">Posizioni Aperte</h3>
                <span className="ml-auto text-xs text-slate-500 bg-[#171727] px-2.5 py-1 rounded-full border border-[#252540]">{visiblePositions.length}/{positions.length} titoli</span>
              </div>

              {/* Filter + Sort bar */}
              {positions.length > 0 && (
                <div className="px-6 py-3 border-b border-[#1e1e32]/60 bg-[#0d0d1c]/50 flex items-center gap-4 flex-wrap">
                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 uppercase tracking-widest font-bold mr-1">Filtro</span>
                    {([["all", "Tutti"], ["positive", "▲ Positivi"], ["negative", "▼ Negativi"]] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setPositionFilter(val)}
                        className={`text-xs px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer ${positionFilter === val
                          ? val === "positive" ? "bg-emerald-900/30 border-emerald-700/50 text-emerald-300"
                            : val === "negative" ? "bg-red-900/30 border-red-700/50 text-red-300"
                              : "bg-violet-600/20 border-violet-600/50 text-violet-300"
                          : "bg-transparent border-[#252540] text-slate-500 hover:text-slate-300 hover:border-[#3a3a55]"
                          }`}
                      >{label}</button>
                    ))}
                  </div>
                  <div className="w-px h-5 bg-[#252540]" />
                  {/* Sector filter */}
                  {uniqueSectors.length > 1 && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600 uppercase tracking-widest font-bold mr-1">Settore</span>
                        <button onClick={() => setSectorPositionFilter("all")}
                          className={`text-xs px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer ${sectorPositionFilter === "all"
                            ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                            : "bg-transparent border-[#252540] text-slate-500 hover:text-slate-300 hover:border-[#3a3a55]"
                            }`}
                        >Tutti</button>
                        {uniqueSectors.map(sec => (
                          <button key={sec} onClick={() => setSectorPositionFilter(sec)}
                            className={`text-xs px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer ${sectorPositionFilter === sec
                              ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                              : "bg-transparent border-[#252540] text-slate-500 hover:text-slate-300 hover:border-[#3a3a55]"
                              }`}
                            style={sectorPositionFilter === sec ? { borderColor: `${SECTOR_COLORS[sec] ?? "#8b5cf6"}60`, color: SECTOR_COLORS[sec] ?? "#a78bfa", backgroundColor: `${SECTOR_COLORS[sec] ?? "#8b5cf6"}18` } : {}}
                          >{sec}</button>
                        ))}
                      </div>
                      <div className="w-px h-5 bg-[#252540]" />
                    </>
                  )}
                  {/* Sort chips */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 uppercase tracking-widest font-bold mr-1">Ordina</span>
                    {([["value", "Valore"], ["return", "Rendimento"], ["weight", "Peso %"]] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setPositionSort(val)}
                        className={`text-xs px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer ${positionSort === val
                          ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                          : "bg-transparent border-[#252540] text-slate-500 hover:text-slate-300 hover:border-[#3a3a55]"
                          }`}
                      >{label}</button>
                    ))}
                    {/* Asc/Desc toggle */}
                    <button onClick={() => setPositionSortDir(d => d === "desc" ? "asc" : "desc")}
                      className="text-xs px-2.5 py-1 rounded-xl border border-[#252540] text-slate-500 hover:text-slate-300 hover:border-[#3a3a55] font-bold transition-all cursor-pointer"
                      title={positionSortDir === "desc" ? "Ordine decrescente" : "Ordine crescente"}
                    >
                      {positionSortDir === "desc" ? "↓" : "↑"}
                    </button>
                  </div>
                </div>
              )}

              {positions.length === 0 ? (
                <div className="p-8 text-sm text-slate-500 text-center">Nessuna posizione aperta</div>
              ) : visiblePositions.length === 0 ? (
                <div className="p-8 text-sm text-slate-500 text-center">Nessuna posizione corrisponde al filtro</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-[#1e1e32]">
                        <th className="text-left px-6 py-4 font-bold">Titolo</th>
                        <th className="text-right px-4 py-4 font-bold">Qtà</th>
                        <th className="text-right px-4 py-4 font-bold">Peso</th>
                        <th className="text-right px-4 py-4 font-bold">Rendimento</th>
                        <th className="text-right px-4 py-4 font-bold">Prezzo</th>
                        <th className="text-right px-5 py-4 font-bold">Valore</th>
                        <th className="text-center px-4 py-4 font-bold">Op.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePositions.map(pos => {
                        const weightPct = totalValue > 0 ? (pos.position_value / totalValue) * 100 : 0;
                        const isOpen = tradeOpen?.secId === pos.security_id;
                        const sectorColor = SECTOR_COLORS[pos.sector] ?? "#64748b";
                        return (
                          <>
                            <tr key={pos.security_id} className="border-t border-[#1e1e32]/50 hover:bg-[#171727]/30 transition-colors">
                              {/* Ticker */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div style={{ width: 3, height: 36, borderRadius: 2, background: sectorColor, flexShrink: 0 }} />
                                  <div>
                                    <div className="text-xl font-bebas text-white tracking-wider leading-none mb-0.5">{pos.ticker}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-[160px]">{pos.security_name}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: sectorColor }}>{pos.sector}</div>
                                  </div>
                                </div>
                              </td>
                              {/* Quantità */}
                              <td className="px-4 py-4 text-right">
                                <div className="text-lg font-bebas text-white tracking-wide">{pos.quantity}</div>
                                <div className="text-xs text-slate-500 font-mono">azioni</div>
                              </td>
                              {/* Peso con barra */}
                              <td className="px-4 py-4 text-right">
                                <div className="text-base font-bebas text-white tracking-wide">{weightPct.toFixed(1)}%</div>
                                <div className="mt-1.5 h-1 bg-[#252540] rounded-full overflow-hidden w-16 ml-auto">
                                  <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${Math.min(weightPct, 100)}%` }} />
                                </div>
                              </td>
                              {/* Rendimento */}
                              <td className="px-4 py-4 text-right">
                                <div className={`text-2xl font-bebas tracking-wide leading-none ${pctCls(pos.return_pct)}`}>{pctStr(pos.return_pct)}</div>
                              </td>
                              {/* Prezzo */}
                              <td className="px-4 py-4 text-right">
                                <div className="text-base font-bebas text-white tracking-wide">€{fmt(pos.current_price)}</div>
                                <div className="text-xs text-slate-600 mt-0.5 font-mono">avg €{fmt(pos.avg_purchase_price)}</div>
                              </td>
                              {/* Valore */}
                              <td className="px-5 py-4 text-right">
                                <div className="text-xl font-bebas text-white tracking-wide">€{fmt(pos.position_value)}</div>
                              </td>
                              {/* Azioni */}
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => { setTradeOpen(isOpen && tradeOpen?.type === "BUY" ? null : { secId: pos.security_id, type: "BUY" }); setTradeQty("1"); setTradeAmount(""); setTradeMode("qty"); setTradeMsg(null); }}
                                    className="text-xs px-3 py-1.5 rounded-xl bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50 border border-emerald-800/50 transition-colors cursor-pointer font-black"
                                  >BUY</button>
                                  <button onClick={() => { setTradeOpen(isOpen && tradeOpen?.type === "SELL" ? null : { secId: pos.security_id, type: "SELL" }); setTradeQty(String(pos.quantity)); setTradeAmount(""); setTradeMode("qty"); setTradeMsg(null); }}
                                    className="text-xs px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-800/50 border border-red-800/50 transition-colors cursor-pointer font-black"
                                  >SELL</button>
                                  <button onClick={() => viewStock(pos.security_id)}
                                    className="text-xs px-2.5 py-1.5 rounded-xl bg-[#171727] text-slate-400 hover:text-violet-300 hover:border-violet-600/40 border border-[#252540] transition-colors cursor-pointer"
                                    title="Vai al titolo"
                                  >↗</button>
                                </div>
                              </td>
                            </tr>
                            {isOpen && (() => {
                              const inlineCash = player?.current_cash ?? 0;
                              const inlineEffectiveQty = tradeMode === "qty"
                                ? parseInt(tradeQty, 10) || 0
                                : Math.floor((parseFloat(tradeAmount) || 0) / pos.current_price);
                              const inlineTotal = inlineEffectiveQty * pos.current_price;
                              const inlineRemaining = inlineCash - (tradeOpen.type === "BUY" ? inlineTotal : -inlineTotal);
                              const inlineMaxAmount = tradeOpen.type === "BUY"
                                ? Math.floor(inlineCash)
                                : Math.floor(pos.quantity * pos.current_price);
                              const inlineCanExecute = inlineEffectiveQty > 0
                                && (tradeOpen.type === "BUY" ? inlineRemaining >= 0 : inlineEffectiveQty <= pos.quantity);
                              return (
                                <tr key={`trade-${pos.security_id}`} className="bg-[#171727]/40">
                                  <td colSpan={7} className="px-6 py-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className={`text-sm font-black ${tradeOpen.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{tradeOpen.type}</span>
                                      <span className="text-sm font-bebas tracking-wider text-white">{pos.ticker}</span>
                                      <span className="text-xs text-slate-500">@ €{fmt(pos.current_price)}</span>
                                      {/* Toggle Quantità / Importo */}
                                      <div className="flex items-center gap-1 bg-[#0f0f1e] rounded-lg p-0.5 border border-[#252540]">
                                        <button onClick={() => setTradeMode("qty")}
                                          className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${tradeMode === "qty" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
                                        >Qtà</button>
                                        <button onClick={() => setTradeMode("amount")}
                                          className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${tradeMode === "amount" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
                                        >€</button>
                                      </div>
                                      {tradeMode === "qty" ? (
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => setTradeQty(q => String(Math.max(1, (parseInt(q) || 1) - 1)))}
                                            className="w-7 h-7 rounded-lg bg-[#0f0f1e] border border-[#252540] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer font-bold transition-colors">−</button>
                                          <input type="number" min={1} value={tradeQty} onChange={e => setTradeQty(e.target.value)}
                                            className="w-16 bg-[#0f0f1e] border border-[#252540] text-white font-mono text-sm font-bold focus:outline-none focus:border-violet-500 text-center rounded-lg px-2 py-1 transition-colors"
                                          />
                                          <button onClick={() => setTradeQty(q => String((parseInt(q) || 0) + 1))}
                                            className="w-7 h-7 rounded-lg bg-[#0f0f1e] border border-[#252540] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer font-bold transition-colors">+</button>
                                          <button onClick={() => setTradeQty(String(tradeOpen.type === "BUY" ? Math.floor(inlineCash / pos.current_price) : pos.quantity))}
                                            className="text-[10px] px-2 py-1 rounded-md bg-[#0f0f1e] border border-[#252540] text-slate-500 hover:text-violet-300 hover:border-violet-600/40 cursor-pointer font-bold transition-colors ml-1"
                                            title="Massimo">MAX</button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-500 font-bold text-sm">€</span>
                                          <input type="number" min={0} step={100} value={tradeAmount} onChange={e => setTradeAmount(e.target.value)}
                                            placeholder="10000"
                                            className="w-28 bg-[#0f0f1e] border border-[#252540] text-white font-mono text-sm font-bold focus:outline-none focus:border-violet-500 text-right rounded-lg px-2 py-1 transition-colors placeholder-slate-600"
                                          />
                                          <button onClick={() => setTradeAmount(String(inlineMaxAmount))}
                                            className="text-[10px] px-2 py-1 rounded-md bg-[#0f0f1e] border border-[#252540] text-slate-500 hover:text-violet-300 hover:border-violet-600/40 cursor-pointer font-bold transition-colors"
                                            title="Massimo">MAX</button>
                                          {inlineEffectiveQty > 0 && (
                                            <span className="text-[11px] text-slate-400 font-mono">→ <span className="text-white font-bold">{inlineEffectiveQty}</span> az.</span>
                                          )}
                                        </div>
                                      )}
                                      <span className="text-xs text-slate-400 font-mono">= <span className="text-white font-bold">€{fmt(inlineTotal)}</span></span>
                                      {tradeOpen.type === "BUY" && (
                                        <span className={`text-xs font-mono ${inlineRemaining >= 0 ? "text-slate-500" : "text-red-400"}`}>
                                          residuo €{fmt(inlineRemaining)}
                                        </span>
                                      )}
                                      <button disabled={tradeLoading || !inlineCanExecute} onClick={executeTrade}
                                        className={`text-sm px-4 py-1.5 rounded-xl font-black transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-lg ${tradeOpen.type === "BUY" ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40" : "bg-red-600 hover:bg-red-500 text-white shadow-red-900/40"
                                          }`}
                                      >
                                        {tradeLoading ? "..." : "Conferma"}
                                      </button>
                                      <button onClick={() => { setTradeOpen(null); setTradeMsg(null); }} className="text-xs text-slate-500 hover:text-white cursor-pointer font-bold">✕</button>
                                      {tradeMsg && <span className={`text-sm font-semibold font-mono ${tradeMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{tradeMsg.text}</span>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Trade History ── */}
            <section className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl overflow-hidden shadow-xl shadow-black/30">
              <div className="px-6 py-4 border-b border-[#1e1e32] flex items-center gap-2">
                <div style={{ width: 3, height: 18, borderRadius: 2, background: "#7c3aed" }} />
                <h3 className="text-base font-bebas text-violet-400 tracking-widest">Storico Ordini</h3>
                {trades.length > 0 && <span className="ml-auto text-xs text-slate-500 bg-[#171727] px-2.5 py-1 rounded-full border border-[#252540]">{trades.length}</span>}
              </div>
              {trades.length === 0 ? (
                <div className="p-8 text-sm text-slate-500 text-center">Nessun ordine eseguito</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-[#1e1e32]">
                        <th className="text-left px-6 py-3">Ciclo</th>
                        <th className="text-left px-4 py-3">Tipo</th>
                        <th className="text-left px-4 py-3">Titolo</th>
                        <th className="text-right px-4 py-3">Qtà</th>
                        <th className="text-right px-4 py-3">Prezzo</th>
                        <th className="text-right px-4 py-3">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map(t => (
                        <tr key={t.id} className="border-t border-[#1e1e32]/50 hover:bg-[#171727]/20 transition-colors">
                          <td className="px-6 py-3 font-mono text-slate-400 font-semibold">{t.cycle_number}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${t.type === "BUY" ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>{t.type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-black text-white mr-1.5">{t.ticker}</span>
                            <span className="text-slate-500 text-xs">{t.security_name}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-white">{t.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300 font-semibold">€{fmt(t.price_at_execution)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: EVENTI — redesign
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "events" && (() => {
          const currentCycleEvents = allEvents.filter(ev =>
            ev.game_cycle === gameState?.current_cycle &&
            (categoryFilter === "all" || ev.category === categoryFilter)
          );
          const pastEvents = allEvents.filter(ev =>
            ev.game_cycle !== gameState?.current_cycle &&
            (categoryFilter === "all" || ev.category === categoryFilter)
          ).sort((a, b) => b.game_cycle - a.game_cycle);
          const pastCycles = [...new Set(pastEvents.map(e => e.game_cycle))].sort((a, b) => b - a);
          const shownPast = archiveCycle === "all" ? pastEvents : pastEvents.filter(e => e.game_cycle === archiveCycle);

          return (
            <div className="flex flex-col flex-1 overflow-y-auto" style={{ height: "calc(100vh - 56px)" }}>

              {/* CATEGORY FILTERS REMOVED AS PER USER REQUEST */}

              <div className="flex-1 px-5 pb-8 space-y-8 pt-2">

                {/* ── LIVE: eventi ciclo corrente ── */}
                {gameState && gameState.current_cycle > 0 && (
                  <section>
                    {/* Live header */}
                    <div className="flex items-center gap-3 mb-5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                      </span>
                      <span className="font-bebas text-2xl text-white tracking-widest">LIVE</span>
                      <span className="font-bebas text-2xl text-slate-500 tracking-wide">— CICLO {gameState.current_cycle} / {gameState.total_cycles}</span>
                    </div>

                    {currentCycleEvents.length === 0 ? (
                      <div className="text-center py-12 rounded-2xl bg-[#0f0f1e] border border-[#1e1e32]">
                        <div className="text-5xl mb-3 opacity-10">📡</div>
                        <p className="text-slate-500 text-sm">Nessun evento per questo ciclo</p>
                      </div>
                    ) : (
                      <div className={`grid gap-5 ${currentCycleEvents.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"}`}>
                        {currentCycleEvents.map((ev, idx) => {
                          const accent = CATEGORY_ACCENT[ev.category] ?? "#7c3aed";
                          return (
                            <article key={ev.id}
                              className="relative rounded-2xl overflow-hidden flex flex-col cursor-pointer group"
                              style={{
                                background: `linear-gradient(135deg, ${accent}12 0%, #0f0f1e 60%)`,
                                border: `1px solid ${accent}30`,
                                borderLeft: `6px solid ${accent}`,
                                boxShadow: idx === 0 ? `0 8px 40px ${accent}18` : "none",
                              }}
                              onClick={() => setSelectedEvent(ev)}
                            >
                              <div className="p-6 flex flex-col flex-1">
                                {/* Top badges removed */}
                                {/* Title */}
                                <h3 className="font-bebas text-2xl text-white leading-tight mb-4 tracking-wide group-hover:text-violet-200 transition-colors"
                                  style={{ letterSpacing: "0.04em" }}>
                                  {ev.title}
                                </h3>
                                {/* Full body */}
                                <p className="text-sm text-slate-300 leading-relaxed flex-1">{ev.body}</p>
                              </div>
                              {/* Bottom bar */}
                              <div className="px-6 py-3 border-t flex items-center gap-2" style={{ borderColor: `${accent}20` }}>
                                <span className="text-xs text-slate-500 font-mono">Ciclo {ev.game_cycle}</span>
                                <span className="text-xs text-slate-600 ml-auto">Clicca per dettaglio →</span>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* ── ARCHIVIO: cicli passati ── */}
                {pastEvents.length > 0 && (
                  <section>
                    {/* Archive header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 3, height: 16, borderRadius: 2, background: "#475569" }} />
                        <span className="font-bebas text-lg text-slate-400 tracking-widest uppercase">Archivio</span>
                      </div>
                      {/* Cycle pills */}
                      <div className="flex items-center gap-2 overflow-x-auto">
                        <button onClick={() => setArchiveCycle("all")}
                          className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer"
                          style={archiveCycle === "all"
                            ? { backgroundColor: "#47556920", borderColor: "#47556960", color: "#94a3b8" }
                            : { backgroundColor: "transparent", borderColor: "#1e1e32", color: "#475569" }}>
                          Tutti
                        </button>
                        {pastCycles.map(c => (
                          <button key={c} onClick={() => setArchiveCycle(c)}
                            className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer"
                            style={archiveCycle === c
                              ? { backgroundColor: "#7c3aed20", borderColor: "#7c3aed60", color: "#a78bfa" }
                              : { backgroundColor: "transparent", borderColor: "#1e1e32", color: "#475569" }}>
                            Ciclo {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {shownPast.map(ev => {
                        const accent = CATEGORY_ACCENT[ev.category] ?? "#64748b";
                        const teaser = ev.body.length > 120 ? ev.body.slice(0, 120).trimEnd() + "…" : ev.body;
                        return (
                          <article key={ev.id}
                            className="bg-[#0c0c1c] border border-[#1a1a2e] rounded-xl overflow-hidden hover:border-[#2a2a40] transition-all cursor-pointer group opacity-70 hover:opacity-100"
                            style={{ borderLeft: `4px solid ${accent}60` }}
                            onClick={() => setSelectedEvent(ev)}
                          >
                            <div className="p-4">
                              <div className="flex items-center justify-end mb-2">
                                <span className="text-xs font-mono text-slate-600 bg-[#171727] px-2 py-0.5 rounded border border-[#252540]">
                                  C.{ev.game_cycle}
                                </span>
                              </div>
                              <h4 className="text-sm font-black text-slate-300 leading-snug mb-2 group-hover:text-white transition-colors">{ev.title}</h4>
                              <p className="text-xs text-slate-600 leading-relaxed">{teaser}</p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {allEvents.length === 0 && (
                  <div className="text-center py-28">
                    <div className="text-7xl mb-5 opacity-10">📰</div>
                    <p className="text-xl font-semibold text-slate-500 mb-2">Nessun evento ancora</p>
                    <p className="text-sm text-slate-600">Gli eventi appariranno qui quando il gioco inizia</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* ── Podium Overlay ── */}
      {podiumData.show && <PodiumOverlay leaderboard={podiumData.leaderboard} />}

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-[#0f0f1e] border border-[#1e1e32] rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/70 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-[#171727] border border-[#252540] text-slate-400 hover:text-white hover:border-[#3a3a55] transition-all flex items-center justify-center cursor-pointer text-base font-bold z-10"
            >
              ✕
            </button>

            {(() => {
              const accent = CATEGORY_ACCENT[selectedEvent.category] ?? "#64748b";
              return (
                <div className="p-10">
                  {/* Badges */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-sm font-mono text-slate-500 bg-[#171727] px-4 py-2 rounded-xl border border-[#252540]">
                      Ciclo {selectedEvent.game_cycle}{selectedEvent.game_cycle === gameState?.current_cycle ? " · LIVE" : ""}
                    </span>
                  </div>

                  {/* Title with left accent bar */}
                  <div className="flex gap-4 mb-7">
                    <div style={{ width: 5, minHeight: 48, borderRadius: 3, background: accent, flexShrink: 0, marginTop: 3 }} />
                    <h2 className="text-3xl font-black text-white leading-snug">{selectedEvent.title}</h2>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#1e1e32] mb-7" />

                  {/* Body */}
                  <div className="text-base text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedEvent.body}</div>

                  {/* Visualizza Impatto button */}
                  <div className="mt-8 pt-6 border-t border-[#1e1e32]">
                    <button
                      onClick={() => setShowVisualizer(true)}
                      className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span className="text-lg">⚡</span>
                      Visualizza Impatto · Onda d'Urto
                    </button>
                    <p className="text-[11px] text-slate-600 mt-2 text-center">
                      Simulatore interattivo: zoom sui settori, esplora gli effetti a catena
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Event Impact Visualizer ── */}
      {showVisualizer && selectedEvent && (
        <EventVisualizer
          eventTitle={selectedEvent.title}
          eventNarrative={selectedEvent.body}
          stocks={stocks.map(s => ({ ticker: s.ticker, sector: s.sector }))}
          triggerCycle={selectedEvent.game_cycle}
          currentGameCycle={gameState?.current_cycle ?? selectedEvent.game_cycle}
          onClose={() => setShowVisualizer(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, colored, pct }: { label: string; value: string; colored?: boolean; pct?: number }) {
  const cls = colored && pct !== undefined ? pctCls(pct) : "text-white";
  return (
    <div className="text-right">
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold font-mono ${cls}`}>{value}</div>
    </div>
  );
}

function BigStatCard({ label, value, sub, gradient, border, valueColor }: {
  label: string; value: string; sub: string;
  gradient: string; border: string; valueColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 shadow-xl shadow-black/20`}>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{label}</div>
      <div className={`text-5xl font-bebas tracking-wide ${valueColor} leading-none mb-2`}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

// ─── Podium Overlay ───────────────────────────────────────────────────────────

const PODIUM_STYLES = `
  @keyframes podium-bg-in { from{opacity:0} to{opacity:1} }
  @keyframes podium-title-in { from{opacity:0;transform:translateY(-30px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes podium-block-rise { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
  @keyframes podium-player-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes confetti-fall {
    0%   { transform: translateY(-20px) rotate(0deg); opacity:1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity:0; }
  }
  @keyframes glow-pulse { 0%,100%{box-shadow:0 0 30px #fbbf2460,0 0 80px #fbbf2420} 50%{box-shadow:0 0 60px #fbbf2480,0 0 120px #fbbf2440} }
  @keyframes crown-float { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-8px) rotate(3deg)} }
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
`;

const CONFETTI_COLORS = ["#fbbf24", "#a78bfa", "#34d399", "#f87171", "#60a5fa", "#fb923c", "#f472b6", "#22d3ee"];

function Confetti() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 3 + Math.random() * 4;
        const size = 6 + Math.random() * 10;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const isRect = Math.random() > 0.5;
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${left}%`,
            top: 0,
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

function PodiumOverlay({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const stylesRef = useRef(false);
  useEffect(() => {
    if (stylesRef.current) return;
    stylesRef.current = true;
    const el = document.createElement("style");
    el.textContent = PODIUM_STYLES;
    document.head.appendChild(el);
  }, []);

  const fmt = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  const first = leaderboard.find(e => e.rank === 1);
  const second = leaderboard.find(e => e.rank === 2);
  const third = leaderboard.find(e => e.rank === 3);

  return (
    <div className="podium-bg fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #1a0a3e 0%, #0b0b16 60%)" }}>
      <Confetti />

      {/* Title */}
      <div className="podium-title text-center mb-10 relative z-10">
        <div className="text-[11px] text-amber-400 uppercase tracking-[0.4em] font-bold mb-3">Investment Portfolio Simulator</div>
        <h1 className="font-bebas text-7xl text-white tracking-widest leading-none" style={{ textShadow: "0 0 60px rgba(251,191,36,0.5)" }}>
          FINE GIOCO
        </h1>
        <div className="text-[11px] text-slate-500 uppercase tracking-[0.3em] mt-3">Classifica Finale</div>
      </div>

      {/* Podium stage */}
      <div className="relative z-10 flex items-end justify-center gap-4 mb-8" style={{ height: 340 }}>

        {/* 2nd place */}
        <div className="flex flex-col items-center" style={{ width: 160 }}>
          <div className="podium-p2 flex flex-col items-center mb-3">
            <div className="text-4xl mb-2">🥈</div>
            <div className="text-base font-black text-slate-200 text-center leading-tight mb-1">{second?.name ?? "—"}</div>
            <div className="font-bebas text-xl text-slate-300 tracking-wide">{second ? fmt(second.total_value) : "—"}</div>
            <div className={`text-sm font-bold ${(second?.performance ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {second ? pct(second.performance) : ""}
            </div>
          </div>
          <div className="podium-block-2 w-full rounded-t-xl flex items-end justify-center pb-4"
            style={{ height: 160, background: "linear-gradient(180deg,#64748b,#334155)", border: "1px solid #47556960" }}>
            <span className="font-bebas text-5xl text-slate-400" style={{ letterSpacing: 2 }}>2</span>
          </div>
        </div>

        {/* 1st place */}
        <div className="flex flex-col items-center" style={{ width: 180 }}>
          <div className="podium-p1 flex flex-col items-center mb-3">
            <div className="crown-anim text-5xl mb-2">👑</div>
            <div className="text-lg font-black text-white text-center leading-tight mb-1" style={{ textShadow: "0 0 20px rgba(251,191,36,0.6)" }}>
              {first?.name ?? "—"}
            </div>
            <div className="font-bebas text-2xl text-amber-300 tracking-wide">{first ? fmt(first.total_value) : "—"}</div>
            <div className={`text-base font-bold ${(first?.performance ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {first ? pct(first.performance) : ""}
            </div>
          </div>
          <div className="podium-block-1 glow-gold w-full rounded-t-xl flex items-end justify-center pb-5"
            style={{ height: 220, background: "linear-gradient(180deg,#b45309,#78350f)", border: "1px solid #fbbf2450" }}>
            <span className="font-bebas text-7xl text-amber-400" style={{ letterSpacing: 2 }}>1</span>
          </div>
        </div>

        {/* 3rd place */}
        <div className="flex flex-col items-center" style={{ width: 160 }}>
          <div className="podium-p3 flex flex-col items-center mb-3">
            <div className="text-4xl mb-2">🥉</div>
            <div className="text-base font-black text-slate-200 text-center leading-tight mb-1">{third?.name ?? "—"}</div>
            <div className="font-bebas text-xl text-slate-300 tracking-wide">{third ? fmt(third.total_value) : "—"}</div>
            <div className={`text-sm font-bold ${(third?.performance ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {third ? pct(third.performance) : ""}
            </div>
          </div>
          <div className="podium-block-3 w-full rounded-t-xl flex items-end justify-center pb-4"
            style={{ height: 110, background: "linear-gradient(180deg,#9a3412,#7c2d12)", border: "1px solid #c2410c60" }}>
            <span className="font-bebas text-4xl text-orange-400" style={{ letterSpacing: 2 }}>3</span>
          </div>
        </div>
      </div>

      {/* Others */}
      {leaderboard.filter(e => e.rank > 3).length > 0 && (
        <div className="podium-p3 relative z-10 flex items-center gap-6 mt-2">
          {leaderboard.filter(e => e.rank > 3).map(e => (
            <div key={e.player_id} className="text-center opacity-60">
              <div className="text-xs text-slate-500 font-mono mb-0.5">#{e.rank}</div>
              <div className="text-sm font-bold text-slate-400">{e.name}</div>
              <div className="font-bebas text-base text-slate-500 tracking-wide">{fmt(e.total_value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
