import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";

// ── Settori e ticker (riferimento statico) ──────────────────────────────────

const SECTORS: Record<string, { color: string; label: string }> = {
  "Tech":       { color: "#60a5fa", label: "Tech" },
  "AI":         { color: "#a78bfa", label: "AI" },
  "Health Care":{ color: "#34d399", label: "Healthcare" },
  "Biotech":    { color: "#22d3ee", label: "Biotech" },
  "Personalized Medicine": { color: "#06b6d4", label: "Pers. Medicine" },
  "Robot":      { color: "#fb923c", label: "Robotics" },
  "Industria":  { color: "#facc15", label: "Industrial" },
  "Logistica":  { color: "#818cf8", label: "Logistics" },
  "Energia":    { color: "#f87171", label: "Energy" },
  "Food":       { color: "#86efac", label: "Food" },
  "Automotive": { color: "#f472b6", label: "Automotive" },
  "Luxury":     { color: "#e879f9", label: "Luxury" },
};

// Fallback settore
const getSectorColor = (s: string) => SECTORS[s]?.color || "#64748b";
const getSectorLabel = (s: string) => SECTORS[s]?.label || s;

// ── Types ───────────────────────────────────────────────────────────────────

interface EventTemplate {
  event_id: string;
  title: string;
  category: string;
  tone: string;
  origin_region: string;
  initial_intensity: string;
  decay_pattern: string;
  catastrophic: boolean;
  impacts: Record<string, number>;
  persistence: Record<number, number>;
  cascade: Record<number, Record<string, number>>;
  variable_updates: Record<string, number>;
}

interface Stock {
  ticker: string;
  sector: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getImpactSeries(ev: EventTemplate, ticker: string, includeCascade: boolean): number[] {
  const base = ev.impacts[ticker] || 0;
  const series = [base];
  for (let c = 1; c <= 4; c++) {
    const decay = ev.persistence[c] || 0;
    let v = base * decay;
    if (includeCascade && ev.cascade[c] && ev.cascade[c][ticker] != null) {
      v += ev.cascade[c][ticker];
    }
    series.push(v);
  }
  return series;
}

// fmt per label settori
const fmt = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1);

// ── Componente principale ───────────────────────────────────────────────────

interface Props {
  eventTitle: string;
  eventNarrative: string;
  stocks: Stock[];
  triggerCycle?: number;
  currentGameCycle?: number;
  onClose: () => void;
}

export default function EventVisualizer({ eventTitle, eventNarrative, stocks, triggerCycle = 0, currentGameCycle = 0, onClose }: Props) {
  const initialCycle = Math.max(0, Math.min(4, currentGameCycle - triggerCycle));

  const [evData, setEvData] = useState<EventTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [animTick, setAnimTick] = useState(0);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [cycle, setCycle] = useState(initialCycle);
  const [playing, setPlaying] = useState(false);
  const [showCascade, setShowCascade] = useState(true);
  const dragRef = useRef<{ x: number; y: number; startTx: number; startTy: number; moved: boolean } | null>(null);

  // Mappa ticker → settore dalle stocks del gioco
  const tickerSectorMap = useMemo(() => {
    const m: Record<string, string> = {};
    stocks.forEach(s => { m[s.ticker] = s.sector; });
    return m;
  }, [stocks]);

  // Fetch template data
  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get(`/api/events/impact-template`, { params: { title: eventTitle } })
      .then(res => { setEvData(res.data); setLoading(false); })
      .catch(() => { setError("Template non trovato per questo evento"); setLoading(false); });
  }, [eventTitle]);

  // rAF per animazione
  useEffect(() => {
    let raf: number;
    const loop = () => { setAnimTick(t => t + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Autoplay
  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCycle(c => {
        const next = c + (4 / 6) * dt;
        if (next >= 4) { setPlaying(false); return 4; }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // ESC chiude
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Layout
  const layout = useMemo(() => {
    if (!evData) return null;
    const allTickers = new Set(Object.keys(evData.impacts));
    if (evData.cascade) Object.values(evData.cascade).forEach(o => Object.keys(o).forEach(t => allTickers.add(t)));

    const bySector: Record<string, string[]> = {};
    [...allTickers].forEach(t => {
      const s = tickerSectorMap[t] || "Tech";
      (bySector[s] = bySector[s] || []).push(t);
    });

    const presentSectors = Object.keys(bySector).sort();
    const sectorAngles: Record<string, number> = {};
    presentSectors.forEach((s, i) => {
      sectorAngles[s] = (i / presentSectors.length) * Math.PI * 2 - Math.PI / 2;
    });

    const tickerAngles: Record<string, { angle: number; sector: string }> = {};
    [...allTickers].forEach(t => {
      const s = tickerSectorMap[t] || "Tech";
      const arr = bySector[s] || [t];
      const idx = arr.indexOf(t);
      const span = (Math.PI * 2 / presentSectors.length) * 0.85;
      const off = arr.length === 1 ? 0 : (idx / (arr.length - 1) - 0.5) * span;
      tickerAngles[t] = { angle: (sectorAngles[s] || 0) + off, sector: s };
    });

    return { tickerAngles, bySector, presentSectors, sectorAngles, allTickers: [...allTickers] };
  }, [evData, tickerSectorMap]);

  const seriesByTicker = useMemo(() => {
    if (!evData || !layout) return {};
    const m: Record<string, number[]> = {};
    layout.allTickers.forEach(t => { m[t] = getImpactSeries(evData, t, showCascade); });
    return m;
  }, [evData, layout, showCascade]);

  const valueAt = useCallback((ticker: string, c: number) => {
    const series = seriesByTicker[ticker];
    if (!series) return 0;
    const i0 = Math.floor(c), i1 = Math.min(4, i0 + 1);
    const f = c - i0;
    return (series[i0] || 0) * (1 - f) + (series[i1] || 0) * f;
  }, [seriesByTicker]);

  const cascadeCycles = useMemo(() => {
    if (!evData?.cascade) return new Set<number>();
    return new Set(Object.keys(evData.cascade).map(Number));
  }, [evData]);

  // Solo vista settori, no zoom semantico

  // Pan/zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setView(v => {
      const newScale = Math.max(0.55, Math.min(3.5, v.scale * (1 + delta)));
      const rect = wrapRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const k = newScale / v.scale;
      return { scale: newScale, tx: mx - (mx - v.tx) * k, ty: my - (my - v.ty) * k };
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, startTx: view.tx, startTy: view.ty, moved: false };
  }, [view]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
      if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
      setView(v => ({ ...v, tx: dragRef.current!.startTx + dx, ty: dragRef.current!.startTy + dy }));
    }
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Canvas render ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!evData || !layout) return;
    const cnv = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cnv || !wrap) return;
    const ctx = cnv.getContext("2d")!;
    const W = wrap.clientWidth || 800, H = wrap.clientHeight || 520;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cnv.width = W * dpr; cnv.height = H * dpr;
    cnv.style.width = W + "px"; cnv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);

    const cx = W / 2, cy = H / 2;
    const maxR = Math.min(W, H) / 2 - 40, minR = 90;
    ctx.clearRect(-view.tx / view.scale, -view.ty / view.scale, W / view.scale, H / view.scale);

    // Spicchi
    layout.presentSectors.forEach(s => {
      const a = layout.sectorAngles[s];
      const span = (Math.PI * 2 / layout.presentSectors.length);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR + 50, a - span / 2, a + span / 2);
      ctx.closePath();
      ctx.fillStyle = getSectorColor(s) + "08"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - span / 2) * (maxR + 50), cy + Math.sin(a - span / 2) * (maxR + 50));
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1 / view.scale; ctx.stroke();
    });

    // Anelli T0..T+4
    [0, 1, 2, 3, 4].forEach(c => {
      const r = minR + (c / 4) * (maxR - minR);
      const dist = Math.abs(cycle - c);
      const proximity = Math.max(0, 1 - dist);
      const isCasc = cascadeCycles.has(c) && showCascade;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = isCasc ? `rgba(167,139,250,${0.15 + proximity * 0.25})` : `rgba(251,191,36,${0.05 + proximity * 0.3})`;
      ctx.lineWidth = (1 + proximity * 1.5) / view.scale;
      ctx.setLineDash(isCasc ? [4 / view.scale, 4 / view.scale] : []); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = dist < 0.5 ? "#fbbf24" : "rgba(241,245,249,0.3)";
      ctx.font = `${dist < 0.5 ? "bold " : ""}${10 / view.scale}px monospace`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`c.${triggerCycle + c}`, cx + r + 4 / view.scale, cy);
    });

    // Playhead
    const playheadR = minR + (cycle / 4) * (maxR - minR);
    ctx.beginPath(); ctx.arc(cx, cy, playheadR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(251,191,36,0.5)"; ctx.lineWidth = 1.5 / view.scale;
    ctx.setLineDash([2 / view.scale, 4 / view.scale]); ctx.stroke(); ctx.setLineDash([]);

    // Pulse
    const pulse = (animTick % 90) / 90;
    ctx.beginPath(); ctx.arc(cx, cy, 55 + pulse * 30, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251,191,36,${(1 - pulse) * 0.18})`; ctx.lineWidth = 1.5 / view.scale; ctx.stroke();

    // Cascade shake
    let shakeX = 0, shakeY = 0;
    cascadeCycles.forEach(c => {
      if (!showCascade) return;
      const d = cycle - c;
      if (d > -0.05 && d < 0.4) {
        const decay = 1 - d / 0.4;
        shakeX += Math.sin(animTick * 0.6 + c) * decay * decay * 6;
        shakeY += Math.cos(animTick * 0.55 + c) * decay * decay * 6;
      }
    });

    const allValues = layout.allTickers.flatMap(t => (seriesByTicker[t] || []).map(Math.abs));
    const maxAbs = Math.max(...allValues, 1);

    // ── LABEL SETTORI FISSE sul bordo esterno (non si muovono)
    const labelR = maxR + 45;
    layout.presentSectors.forEach(s => {
      const a = layout.sectorAngles[s];
      const lx = cx + Math.cos(a) * labelR;
      const ly = cy + Math.sin(a) * labelR;
      // Tutte le label bianche per uniformità
      ctx.fillStyle = "#e2e8f0";
      ctx.font = `bold ${12 / view.scale}px sans-serif`;
      // Allineamento adattivo: a sinistra se angolo punta a sinistra, a destra se punta a destra
      const cosA = Math.cos(a);
      ctx.textAlign = Math.abs(cosA) < 0.3 ? "center" : (cosA > 0 ? "left" : "right");
      ctx.textBaseline = "middle";
      ctx.fillText(getSectorLabel(s).toUpperCase(), lx, ly);
    });

    // ── BOLLE SETTORE (si muovono con l'impatto)
    {
      layout.presentSectors.forEach(s => {
        const tickers = layout.bySector[s];
        const a = layout.sectorAngles[s];
        let sum = 0, sumAbs = 0;
        tickers.forEach(t => { const v = valueAt(t, cycle); sum += v; sumAbs += Math.abs(v); });
        const avgInt = Math.min(1, (sumAbs / tickers.length) / maxAbs);
        const r = minR + avgInt * (maxR - minR - 40);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const sc = getSectorColor(s);
        const bc = Math.abs(sum) < 0.1 ? "100,116,139" : (sum >= 0 ? "74,222,128" : "248,113,113");
        if (avgInt > 0.02) {
          const grad = ctx.createLinearGradient(cx + shakeX, cy + shakeY, x, y);
          grad.addColorStop(0, `rgba(251,191,36,0)`); grad.addColorStop(1, `rgba(${bc},${0.3 + avgInt * 0.4})`);
          ctx.strokeStyle = grad; ctx.lineWidth = (2 + avgInt * 4) / view.scale;
          ctx.beginPath(); ctx.moveTo(cx + shakeX, cy + shakeY); ctx.lineTo(x, y); ctx.stroke();
        }
        const bR = 22 + avgInt * 30 + tickers.length * 1.2;
        ctx.beginPath(); ctx.arc(x, y, bR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${bc},${0.4 + avgInt * 0.4})`; ctx.fill();
        ctx.strokeStyle = sc; ctx.lineWidth = 2 / view.scale; ctx.stroke();
        // Valore dentro la bolla
        ctx.fillStyle = sum >= 0 ? "#4ade80" : "#f87171";
        ctx.font = `bold ${13 / view.scale}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`${sum >= 0 ? "+" : ""}${sum.toFixed(1)}`, x, y);
      });
    }

    // Centro
    const ecx = cx + shakeX, ecy = cy + shakeY;
    const ctrGrad = ctx.createRadialGradient(ecx, ecy, 0, ecx, ecy, 75);
    ctrGrad.addColorStop(0, "#fbbf24cc"); ctrGrad.addColorStop(1, "#fbbf2400");
    ctx.fillStyle = ctrGrad;
    ctx.beginPath(); ctx.arc(ecx, ecy, 75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath(); ctx.arc(ecx, ecy, 42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2 / view.scale; ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.font = `bold ${11 / view.scale}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`EVT`, ecx, ecy - 7);
    ctx.fillStyle = "rgba(241,245,249,0.75)"; ctx.font = `${10 / view.scale}px monospace`;
    ctx.fillText(cycle < 0.05 ? "shock" : `c.${(triggerCycle + cycle).toFixed(1)}`, ecx, ecy + 8);

    ctx.restore();
  }, [evData, layout, animTick, cycle, view, showCascade, seriesByTicker, cascadeCycles, valueAt]);

  const playFromStart = () => { setCycle(0); setPlaying(true); };
  const hasCascade = cascadeCycles.size > 0;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Caricamento visualizzatore...</div>
      </div>
    );
  }

  if (error || !evData) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="text-slate-400 text-sm">{error || "Dati non disponibili"}</div>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer hover:bg-slate-700 transition">Chiudi</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-200 transition flex items-center gap-1.5 font-mono uppercase tracking-wider cursor-pointer">
          <span>←</span> Chiudi
        </button>
        <div className="text-slate-700">/</div>
        <div className="text-xs text-slate-300 truncate">{evData.title}</div>
        {evData.catastrophic && (
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 ml-auto">
            Catastrofico
          </span>
        )}
      </div>

      {/* Hero */}
      <div className="px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-slate-500">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{evData.category}</span>
          <span>{evData.origin_region}</span>
          <span>· {evData.decay_pattern}</span>
          <span>· intensità: {evData.initial_intensity}</span>
        </div>
        <h2 className="text-lg text-slate-100 leading-snug mb-1">{evData.title}</h2>
        <p className="text-[13px] text-slate-400 leading-relaxed max-w-3xl">{eventNarrative}</p>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 py-2 flex items-center gap-3 border-b border-white/5 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono">Onda d'urto</span>
            {hasCascade && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-slate-500 ml-auto">
                <input type="checkbox" checked={showCascade} onChange={e => setShowCascade(e.target.checked)} className="accent-amber-400" />
                Cascade
              </label>
            )}
          </div>

          <div ref={wrapRef}
               className="flex-1 relative bg-[radial-gradient(ellipse_at_center,#111111_0%,#0a0a0a_100%)] min-h-0 cursor-grab active:cursor-grabbing"
               onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
               onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
            <canvas ref={canvasRef} className="absolute inset-0" />
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 border border-white/10 backdrop-blur">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Ciclo gioco</div>
              <div className="text-lg font-mono text-amber-300">{(triggerCycle + cycle).toFixed(1).replace(/\.0$/, "")}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-white/5 px-6 py-3 bg-black/40 shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={playing ? () => setPlaying(false) : playFromStart}
                className="px-3 py-1.5 rounded bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 text-[11px] font-mono uppercase tracking-wider transition cursor-pointer">
                {playing ? "▎▎ pausa" : "▶ simula"}
              </button>
              <button onClick={() => { setPlaying(false); setCycle(0); }}
                className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-200 border border-white/10 hover:bg-white/5 text-[11px] font-mono uppercase tracking-wider transition cursor-pointer">
                ↺ reset
              </button>
            </div>
            <div className="relative pb-6">
              <input type="range" min={0} max={4} step={0.01} value={cycle}
                onChange={e => { setPlaying(false); setCycle(parseFloat(e.target.value)); }}
                className="w-full h-1 appearance-none bg-transparent cursor-pointer z-10 relative"
                style={{ WebkitAppearance: "none" }} />
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full pointer-events-none"
                style={{ width: `${(cycle / 4) * 100}%` }} />
              <div className="absolute top-0 left-0 right-0 flex justify-between mt-3 pointer-events-none">
                {[0, 1, 2, 3, 4].map(c => (
                  <button key={c} onClick={() => { setPlaying(false); setCycle(c); }}
                    className="flex flex-col items-center gap-1 cursor-pointer pointer-events-auto">
                    <div className={`w-px h-2 ${cycle >= c - 0.02 ? "bg-amber-500/60" : "bg-white/15"}`} />
                    <div className={`text-[9px] font-mono ${cycle >= c - 0.02 ? "text-amber-400/80" : "text-slate-600"}`}>
                      c.{triggerCycle + c}
                    </div>
                    {cascadeCycles.has(c) && showCascade && (
                      <div className="text-[8px] font-mono text-violet-400/70 -mt-0.5">cascade</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
