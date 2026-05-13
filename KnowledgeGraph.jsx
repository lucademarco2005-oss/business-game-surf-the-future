import { useState } from "react";

// ─── DATI EVENTO DEMO ────────────────────────────────────────────────────────

const EVENT = {
  title: "OMS: Emergenza Globale AMR",
  subtitle: "Superbug resistente a tutti gli antibiotici in 47 paesi",
  category: "CRISI SANITARIA",
  categoryColor: "#f43f5e",
  tone: "BIFORCANTE",
  cycle: 3,
};

// Meccanismi causali intermedi (Event → Mechanism → Sector)
const MECHANISMS = [
  { id: "rd",     label: "Domanda R&D urgente",   dir: +1, mag: 0.92 },
  { id: "reg",    label: "Fast-track FDA/EMA",     dir: +1, mag: 0.76 },
  { id: "cost",   label: "Costi ospedalieri ↑",   dir: -1, mag: 0.85 },
  { id: "supply", label: "Supply chain risk ↑",   dir: -1, mag: 0.67 },
  { id: "sent",   label: "Sentiment biotech ↑",   dir: +1, mag: 0.90 },
];

// Settori con impatto aggregato e aziende
const SECTORS = [
  {
    id: "biotech", label: "Biotech", color: "#34d399", impact: +8.2, angle: -90,
    companies: [
      { ticker: "BNTX", impact: +12.0, note: "Piattaforma mRNA pronta per candidato vaccino AMR" },
      { ticker: "AMGN", impact:  +7.5, note: "Pipeline antibiotici biologici fase 2" },
      { ticker: "VRTX", impact:  +5.0, note: "Genomics applicata alla resistenza batterica" },
      { ticker: "GMAB", impact:  +6.0, note: "Anticorpi monoclonali anti-superbug" },
      { ticker: "DHR",  impact:  +4.5, note: "Diagnostica rapida identificazione ceppo" },
    ],
  },
  {
    id: "pharma", label: "Pharma & Precision", color: "#22d3ee", impact: +4.5, angle: -30,
    companies: [
      { ticker: "ILMN", impact: +6.0, note: "Sequenziamento genomico del superbug" },
      { ticker: "IQV",  impact: +5.0, note: "Clinical trials fast-track accelerati" },
      { ticker: "A",    impact: +3.5, note: "Strumentazione laboratori AMR" },
      { ticker: "WAT",  impact: +2.5, note: "Analisi purezza composti antibiotici" },
    ],
  },
  {
    id: "robotics", label: "Robotics", color: "#fb923c", impact: +1.8, angle: 30,
    companies: [
      { ticker: "ISRG",  impact: +3.5, note: "Chirurgia robotica riduce contagio staff ospedaliero" },
      { ticker: "ROK",   impact: +2.5, note: "Manifattura farmaceutica automatizzata" },
      { ticker: "ABBNY", impact: +1.5, note: "Automazione laboratori diagnostici" },
      { ticker: "SIEGY", impact: +0.5, note: "Esposizione healthcare parziale" },
    ],
  },
  {
    id: "food", label: "Food & Farming", color: "#a3e635", impact: -2.1, angle: 90,
    companies: [
      { ticker: "NSRGY", impact: -3.0, note: "Controlli produzione + costi sterilizzazione" },
      { ticker: "DANOY", impact: -2.5, note: "Probiotici alimentari sotto scrutinio regolatorio" },
      { ticker: "KO",    impact: -1.5, note: "Costi imballaggi sterili aumentano" },
      { ticker: "DE",    impact: -0.8, note: "Antibiotici veterinari sotto esame normativo" },
    ],
  },
  {
    id: "logistics", label: "Logistics", color: "#818cf8", impact: -3.8, angle: 150,
    companies: [
      { ticker: "UPS",  impact: -5.0, note: "Restrizioni cargo internazionale" },
      { ticker: "FDX",  impact: -4.5, note: "Cold chain farmaceutica sotto stress massimo" },
      { ticker: "XPO",  impact: -3.0, note: "Healthcare logistics paralizzata" },
      { ticker: "UNP",  impact: -2.0, note: "Impatto indiretto via supply chain" },
    ],
  },
  {
    id: "healthcare", label: "Healthcare", color: "#f472b6", impact: -1.5, angle: 210,
    companies: [
      { ticker: "JNJ", impact:  +4.0, note: "Propria ricerca antibiotici + fast-track regolatorio" },
      { ticker: "AZN", impact:  +3.0, note: "Partnership con biotech AMR già avanzata" },
      { ticker: "UNH", impact:  -6.0, note: "Costi assicurativi esplodono del +40%" },
      { ticker: "LLY", impact:  -2.0, note: "Focus metabolismo: nessuna pipeline AMR attiva" },
      { ticker: "NVO", impact:  -1.5, note: "Esposizione healthcare generale non-AMR" },
    ],
  },
];

// Connessioni Meccanismo → Settore
const MECH_LINKS = [
  { m: "rd",     s: "biotech",     str: 0.95 },
  { m: "rd",     s: "pharma",      str: 0.75 },
  { m: "rd",     s: "healthcare",  str: 0.40 },
  { m: "reg",    s: "biotech",     str: 0.85 },
  { m: "reg",    s: "pharma",      str: 0.80 },
  { m: "cost",   s: "healthcare",  str: 0.90 },
  { m: "cost",   s: "logistics",   str: 0.55 },
  { m: "supply", s: "logistics",   str: 0.88 },
  { m: "supply", s: "food",        str: 0.45 },
  { m: "sent",   s: "biotech",     str: 0.92 },
  { m: "sent",   s: "pharma",      str: 0.65 },
  { m: "sent",   s: "robotics",    str: 0.38 },
];

// Correlazioni inter-settoriali (con direzione e spiegazione)
const CROSS_LINKS = [
  { from: "logistics",  to: "healthcare", dir: -1, mag: 0.70, lag: 1, label: "Supply chain farmaci interrotta → effetto lag +1 ciclo",    active: true  },
  { from: "biotech",    to: "healthcare", dir: +1, mag: 0.65, lag: 0, label: "Pipeline nuovi antibiotici alimenta le aziende healthcare",   active: true  },
  { from: "pharma",     to: "biotech",    dir: +1, mag: 0.60, lag: 0, label: "Accelerazione trial: pharma e biotech collaborano",           active: true  },
  { from: "robotics",   to: "pharma",     dir: +1, mag: 0.40, lag: 1, label: "Manifattura farmaceutica automatizzata → lag +1",             active: true  },
  { from: "logistics",  to: "food",       dir: -1, mag: 0.45, lag: 0, label: "Cold chain sotto pressione: margini food compressi",          active: true  },
  { from: "biotech",    to: "food",       dir:  0, mag: 0.28, lag: 2, label: "Precision fermentation (relazione latente, non attivata)",    active: false },
  { from: "robotics",   to: "logistics",  dir:  0, mag: 0.50, lag: 2, label: "Automazione magazzini (relazione latente, non attivata)",     active: false },
];

// Decay per ciclo (T, T+1, T+2, T+3)
const CYCLE_DECAY = [1.0, 0.65, 0.35, 0.12];

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

const W = 900, H = 640;
const CX = W / 2;
const MECH_Y = 190;
const SEC_CX = CX, SEC_CY = 450, SEC_R = 162;

const mechPos = MECHANISMS.map((m, i) => ({
  ...m,
  x: 100 + i * (W - 200) / (MECHANISMS.length - 1),
  y: MECH_Y,
}));

const sectorPos = SECTORS.map((s) => {
  const rad = (s.angle * Math.PI) / 180;
  return { ...s, x: SEC_CX + SEC_R * Math.cos(rad), y: SEC_CY + SEC_R * Math.sin(rad) };
});

const mechMap  = Object.fromEntries(mechPos.map((m) => [m.id, m]));
const secMap   = Object.fromEntries(sectorPos.map((s) => [s.id, s]));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function impactColor(v) {
  if (v >=  6) return "#22c55e";
  if (v >=  3) return "#4ade80";
  if (v >=  0.5) return "#86efac";
  if (v > -0.5) return "#94a3b8";
  if (v > -3) return "#fca5a5";
  if (v > -6) return "#f87171";
  return "#ef4444";
}

function arcBetween(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = mx - SEC_CX, dy = my - SEC_CY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const off = 52;
  return `M ${x1} ${y1} Q ${mx + (dx / len) * off} ${my + (dy / len) * off} ${x2} ${y2}`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const [selected, setSelected]     = useState(null);
  const [hoveredX, setHoveredX]     = useState(null);
  const [cycle, setCycle]           = useState(0);

  const decay = CYCLE_DECAY[cycle] ?? 0.12;
  const sec   = selected ? secMap[selected] : null;

  function scaledImpact(v) { return v * decay; }

  return (
    <div style={{ background: "#07090f", minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>

      {/* ── TOP BAR ── */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: EVENT.categoryColor, background: `${EVENT.categoryColor}18`, padding: "3px 10px", borderRadius: "4px", border: `1px solid ${EVENT.categoryColor}40` }}>
          {EVENT.category}
        </span>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>{EVENT.title}</span>
        <span style={{ fontSize: "11px", color: "#475569" }}>{EVENT.subtitle}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "#334155", marginRight: "4px" }}>CICLO {EVENT.cycle}</span>
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "4px", background: "rgba(251,146,60,0.12)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)" }}>{EVENT.tone}</span>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── SVG GRAPH ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
            <defs>
              <filter id="gl" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="gl2" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0 L10 5 L0 10z" fill="rgba(74,222,128,0.8)"/>
              </marker>
              <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0 L10 5 L0 10z" fill="rgba(248,113,113,0.8)"/>
              </marker>
              <marker id="ay" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0 L10 5 L0 10z" fill="rgba(100,116,139,0.5)"/>
              </marker>
              <radialGradient id="rg" cx="50%" cy="68%" r="52%">
                <stop offset="0%" stopColor="#0c1322"/>
                <stop offset="100%" stopColor="#07090f"/>
              </radialGradient>
            </defs>

            {/* background */}
            <rect width={W} height={H} fill="url(#rg)"/>

            {/* ── EVENT → MECH lines ── */}
            {mechPos.map((m) => (
              <line key={m.id}
                x1={CX} y1={72} x2={m.x} y2={m.y - 20}
                stroke={m.dir > 0 ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)"}
                strokeWidth={1.2} strokeDasharray="4 5"/>
            ))}

            {/* ── MECH → SECTOR lines ── */}
            {MECH_LINKS.map((lk, i) => {
              const mn = mechMap[lk.m], sn = secMap[lk.s];
              if (!mn || !sn) return null;
              const isPos = mn.dir > 0;
              return (
                <line key={i}
                  x1={mn.x} y1={mn.y + 19} x2={sn.x} y2={sn.y - 24}
                  stroke={isPos ? `rgba(74,222,128,${0.12 + lk.str * 0.42})` : `rgba(248,113,113,${0.12 + lk.str * 0.42})`}
                  strokeWidth={0.7 + lk.str * 2.0}
                  strokeDasharray={lk.str > 0.7 ? "none" : "3 5"}
                  opacity={decay}
                />
              );
            })}

            {/* ── CROSS-SECTOR arcs ── */}
            {CROSS_LINKS.map((lk, i) => {
              const s1 = secMap[lk.from], s2 = secMap[lk.to];
              if (!s1 || !s2) return null;
              const isHov = hoveredX === i;
              const active = lk.active;
              const col = !active ? "rgba(51,65,85,0.35)"
                : lk.dir > 0 ? `rgba(74,222,128,${0.45 + lk.mag * 0.35})`
                : `rgba(248,113,113,${0.45 + lk.mag * 0.35})`;
              const sw = active ? 1.0 + lk.mag * 2.5 : 0.9;
              const marker = !active ? "url(#ay)" : lk.dir > 0 ? "url(#ag)" : "url(#ar)";
              return (
                <g key={i}>
                  {/* hit area */}
                  <path d={arcBetween(s1.x, s1.y, s2.x, s2.y)}
                    stroke="transparent" strokeWidth={14} fill="none" style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredX(i)} onMouseLeave={() => setHoveredX(null)}/>
                  <path d={arcBetween(s1.x, s1.y, s2.x, s2.y)}
                    stroke={col} strokeWidth={isHov ? sw + 1.5 : sw} fill="none"
                    strokeDasharray={active ? "none" : "3 7"} markerEnd={marker}
                    opacity={active ? Math.max(0.3, decay) : 0.4}
                    style={{ pointerEvents: "none" }}/>
                </g>
              );
            })}

            {/* ── CROSS HOVER TOOLTIP ── */}
            {hoveredX !== null && (() => {
              const lk = CROSS_LINKS[hoveredX];
              const s1 = secMap[lk.from], s2 = secMap[lk.to];
              const mx = (s1.x + s2.x) / 2, my = (s1.y + s2.y) / 2;
              const dx = mx - SEC_CX, dy = my - SEC_CY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const tx = mx + (dx / len) * 52, ty = my + (dy / len) * 52;
              const tw = 196;
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={tx - tw / 2} y={ty - 18} width={tw} height={30} rx={7}
                    fill="rgba(10,15,28,0.96)" stroke="rgba(71,85,105,0.5)" strokeWidth={1}/>
                  {lk.lag > 0 && (
                    <rect x={tx - tw/2 + 6} y={ty - 12} width={42} height={16} rx={3}
                      fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.4)" strokeWidth={1}/>
                  )}
                  {lk.lag > 0 && (
                    <text x={tx - tw/2 + 27} y={ty - 0.5} textAnchor="middle" fill="#a5b4fc" fontSize={9} fontWeight={700}>lag +{lk.lag}</text>
                  )}
                  <text x={lk.lag > 0 ? tx + 4 : tx} y={ty + 3} textAnchor="middle" fill="#cbd5e1" fontSize={10}>{lk.label.slice(0, 38)}{lk.label.length > 38 ? "…" : ""}</text>
                </g>
              );
            })()}

            {/* ── EVENT CARD ── */}
            <g>
              <rect x={CX - 200} y={14} width={400} height={56} rx={10}
                fill="rgba(12,19,34,0.97)" stroke={`${EVENT.categoryColor}55`} strokeWidth={1.5} filter="url(#gl2)"/>
              <rect x={CX - 200} y={14} width={7} height={56} rx={3} fill={EVENT.categoryColor}/>
              <text x={CX - 183} y={37} fill="#f1f5f9" fontSize={13.5} fontWeight={800}>{EVENT.title}</text>
              <text x={CX - 183} y={55} fill="#475569" fontSize={10.5}>{EVENT.subtitle}</text>
            </g>

            {/* ── MECHANISM NODES ── */}
            {mechPos.map((m) => {
              const isPos = m.dir > 0;
              const col   = isPos ? "#4ade80" : "#f87171";
              const bg    = isPos ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)";
              const bd    = isPos ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)";
              return (
                <g key={m.id}>
                  <rect x={m.x - 55} y={m.y - 20} width={110} height={40} rx={8}
                    fill={bg} stroke={bd} strokeWidth={1}/>
                  {/* magnitude bar bg */}
                  <rect x={m.x - 47} y={m.y + 11} width={94} height={3} rx={1.5} fill="rgba(51,65,85,0.5)"/>
                  {/* magnitude bar fill */}
                  <rect x={m.x - 47} y={m.y + 11} width={94 * m.mag} height={3} rx={1.5} fill={col} opacity={0.55}/>
                  <text x={m.x} y={m.y - 3} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontWeight={600}>{m.label}</text>
                  <text x={m.x + 50} y={m.y - 3} textAnchor="end" fill={col} fontSize={11} fontWeight={800}>{isPos ? "▲" : "▼"}</text>
                </g>
              );
            })}

            {/* ── SECTOR NODES ── */}
            {sectorPos.map((s) => {
              const isSel  = selected === s.id;
              const scaled = scaledImpact(s.impact);
              const col    = impactColor(scaled);
              const impStr = (scaled > 0 ? "+" : "") + scaled.toFixed(1) + "%";
              const r = 37;
              return (
                <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSelected(isSel ? null : s.id)}>
                  {isSel && (
                    <circle cx={s.x} cy={s.y} r={r + 9}
                      fill="none" stroke={s.color} strokeWidth={2} opacity={0.35} filter="url(#gl)"/>
                  )}
                  <circle cx={s.x} cy={s.y} r={r}
                    fill={`${s.color}14`}
                    stroke={isSel ? s.color : `${s.color}55`}
                    strokeWidth={isSel ? 2 : 1.5}/>
                  <text x={s.x} y={s.y - 8} textAnchor="middle"
                    fill={isSel ? s.color : `${s.color}cc`} fontSize={10} fontWeight={700}>{s.label}</text>
                  <text x={s.x} y={s.y + 10} textAnchor="middle" fill={col} fontSize={15} fontWeight={800}>{impStr}</text>
                  {!isSel && (
                    <text x={s.x} y={s.y + 23} textAnchor="middle" fill="#1e293b" fontSize={8.5}>▼ dettagli</text>
                  )}
                </g>
              );
            })}

            {/* ── CYCLE SELECTOR (bottom-left) ── */}
            <g transform="translate(18, 20)">
              <text y={13} fill="#334155" fontSize={8.5} fontWeight={700} letterSpacing="1.5">CICLO IMPATTO</text>
              {["T", "T+1", "T+2", "T+3"].map((label, i) => (
                <g key={i} transform={`translate(${i * 42}, 18)`}
                  style={{ cursor: "pointer" }} onClick={() => setCycle(i)}>
                  <rect width={36} height={22} rx={4}
                    fill={cycle === i ? "rgba(99,102,241,0.25)" : "rgba(20,30,48,0.6)"}
                    stroke={cycle === i ? "#6366f1" : "rgba(51,65,85,0.4)"} strokeWidth={1}/>
                  <text x={18} y={15} textAnchor="middle"
                    fill={cycle === i ? "#a5b4fc" : "#334155"} fontSize={10} fontWeight={700}>{label}</text>
                </g>
              ))}
              {cycle > 0 && (
                <text y={55} fill="#475569" fontSize={9}>decay ×{CYCLE_DECAY[cycle].toFixed(2)}</text>
              )}
            </g>

            {/* ── LEGEND (bottom-right) ── */}
            <g transform={`translate(${W - 185}, ${H - 108})`}>
              <rect width={175} height={100} rx={7}
                fill="rgba(10,15,28,0.88)" stroke="rgba(51,65,85,0.4)" strokeWidth={1}/>
              <text x={10} y={17} fill="#334155" fontSize={8.5} fontWeight={700} letterSpacing="1.5">LEGENDA</text>
              {[
                { y: 33, col: "rgba(74,222,128,0.75)", w: 22, label: "Propagazione positiva",   dash: false },
                { y: 50, col: "rgba(248,113,113,0.75)", w: 22, label: "Propagazione negativa",   dash: false },
                { y: 67, col: "rgba(51,65,85,0.5)",     w: 22, label: "Relazione latente",       dash: true  },
                { y: 84, col: "#6366f1",                 w: 22, label: "Lag: effetto ciclo succ.", dash: false },
              ].map(({ y, col, w, label, dash }) => (
                <g key={label}>
                  <line x1={10} y1={y} x2={10 + w} y2={y} stroke={col} strokeWidth={2.2} strokeDasharray={dash ? "3 4" : "none"}/>
                  <text x={38} y={y + 4} fill="#64748b" fontSize={9.5}>{label}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* ── DETAIL PANEL ── */}
        {sec && (
          <div style={{
            width: "270px", minWidth: "270px",
            background: "rgba(10,14,24,0.98)",
            borderLeft: "1px solid rgba(51,65,85,0.4)",
            padding: "18px 14px", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: "18px",
          }}>
            {/* Sector header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: sec.color, boxShadow: `0 0 8px ${sec.color}` }}/>
              <span style={{ fontWeight: 800, fontSize: "14px", color: "#f1f5f9" }}>{sec.label}</span>
              <span style={{ marginLeft: "auto", fontSize: "17px", fontWeight: 800, color: impactColor(scaledImpact(sec.impact)) }}>
                {scaledImpact(sec.impact) > 0 ? "+" : ""}{scaledImpact(sec.impact).toFixed(1)}%
              </span>
            </div>

            {/* Companies */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#334155", letterSpacing: "2px", marginBottom: "8px" }}>TITOLI</div>
              {sec.companies.map((c) => {
                const si = scaledImpact(c.impact);
                const cc = impactColor(si);
                return (
                  <div key={c.ticker} style={{
                    padding: "8px 10px", marginBottom: "5px",
                    background: "rgba(20,30,50,0.5)", borderRadius: "7px",
                    borderLeft: `3px solid ${cc}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontWeight: 700, fontSize: "12px", color: "#cbd5e1" }}>{c.ticker}</span>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: cc }}>
                        {si > 0 ? "+" : ""}{si.toFixed(1)}%
                      </span>
                    </div>
                    <span style={{ fontSize: "10.5px", color: "#475569", lineHeight: 1.45 }}>{c.note}</span>
                  </div>
                );
              })}
            </div>

            {/* Cross-sector links involving this sector */}
            {(() => {
              const links = CROSS_LINKS.filter(l => l.from === selected || l.to === selected);
              if (!links.length) return null;
              return (
                <div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#334155", letterSpacing: "2px", marginBottom: "8px" }}>CORRELAZIONI SETTORIALI</div>
                  {links.map((lk, i) => {
                    const isFrom  = lk.from === selected;
                    const otherId = isFrom ? lk.to : lk.from;
                    const other   = secMap[otherId];
                    const col2    = !lk.active ? "#475569" : lk.dir > 0 ? "#4ade80" : "#f87171";
                    return (
                      <div key={i} style={{
                        padding: "8px 10px", marginBottom: "5px",
                        background: "rgba(20,30,50,0.4)", borderRadius: "7px",
                        border: `1px solid ${!lk.active ? "rgba(51,65,85,0.3)" : lk.dir > 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                          <span style={{ fontSize: "11px", color: other?.color, fontWeight: 700 }}>
                            {isFrom ? "→" : "←"} {other?.label}
                          </span>
                          {lk.lag > 0 && (
                            <span style={{ fontSize: "9px", color: "#818cf8", background: "rgba(99,102,241,0.15)", padding: "1px 5px", borderRadius: "3px" }}>lag +{lk.lag}</span>
                          )}
                          <span style={{ marginLeft: "auto", fontSize: "10px", color: col2, fontWeight: 700 }}>
                            {!lk.active ? "latente" : (lk.dir > 0 ? "▲" : "▼") + " " + Math.round(lk.mag * 100) + "%"}
                          </span>
                        </div>
                        <span style={{ fontSize: "10px", color: "#475569", lineHeight: 1.45 }}>{lk.label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{ fontSize: "9px", color: "#1e293b", marginTop: "auto", paddingTop: "10px", borderTop: "1px solid rgba(51,65,85,0.2)" }}>
              Ciclo {cycle === 0 ? "T (impatto diretto)" : `T+${cycle} (decay ×${CYCLE_DECAY[cycle].toFixed(2)})`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
