/**
 * AnalyticsPage.tsx — Tableau analytique SunuBus Admin
 * Matrice OD · Heures de pointe · Rapport journalier · Revenus pass
 */

import React, { useState, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { LINES, STOPS, OPERATORS } from '@/data/transportData';
import { PASS_CATALOG } from '@/store/store';
import { getTotalAdRevenue, getTotalImpressions } from '@/services/adEngine';

// ── Données simulées mais réalistes ──────────────────────────────
const OD_PAIRS = [
  { from: 'Plateau',        to: 'Parcelles',     count: 4_820, line: 'DDD L8',   pct: 100 },
  { from: 'Pikine',         to: 'Dakar Centre',  count: 4_210, line: 'DDD L1A',  pct: 87  },
  { from: 'Guédiawaye',     to: 'Médina',        count: 3_560, line: 'DDD L3',   pct: 74  },
  { from: 'HLM',            to: 'Plateau',       count: 3_140, line: 'DDD L5',   pct: 65  },
  { from: 'Liberté 6',      to: 'Marché Sandaga',count: 2_980, line: 'DDD L8',   pct: 62  },
  { from: 'Thiaroye',       to: 'Gare Routière', count: 2_740, line: 'BRT-L1',   pct: 57  },
  { from: 'Yoff',           to: 'Dakar Centre',  count: 2_510, line: 'DDD L52',  pct: 52  },
  { from: 'Ouakam',         to: 'Plateau',       count: 2_280, line: 'DDD L64',  pct: 47  },
  { from: 'Parcelles',      to: 'Médina',        count: 1_960, line: 'BRT-L1',   pct: 41  },
  { from: 'Keur Massar',    to: 'Gare Routière', count: 1_840, line: 'DDD L22',  pct: 38  },
];

// Heures de pointe simulées (nb de voyages par heure)
const HOURLY_DATA = [
  { h:5,  v:180  }, { h:6,  v:1240 }, { h:7,  v:3820 }, { h:8,  v:4950 },
  { h:9,  v:3100 }, { h:10, v:1800 }, { h:11, v:1200 }, { h:12, v:2100 },
  { h:13, v:2400 }, { h:14, v:1700 }, { h:15, v:1500 }, { h:16, v:2200 },
  { h:17, v:4600 }, { h:18, v:5800 }, { h:19, v:4100 }, { h:20, v:2300 },
  { h:21, v:1400 }, { h:22, v:800  }, { h:23, v:320  },
];
const MAX_V = Math.max(...HOURLY_DATA.map(d => d.v));

// Revenus par ligne (simulation)
const LINE_REVENUE = LINES.slice(0, 8).map((l, i) => ({
  name: l.name,
  op: l.operator,
  rev: [128_400, 95_200, 87_600, 74_300, 68_900, 62_100, 54_700, 48_200][i] || 30_000,
  trips: [4820, 3610, 3320, 2820, 2610, 2350, 2070, 1820][i] || 1200,
}));

function fmtFcfa(n: number) {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(2) + ' M';
  if (n >= 1_000)     return (n/1_000).toFixed(0) + 'k';
  return String(n);
}
function fmt(n: number) {
  return n.toLocaleString('fr-FR');
}

// ── KPI Card ─────────────────────────────────────────────────────
function KPI({ icon, label, value, sub, color }: { icon:string; label:string; value:string; sub?:string; color:string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background:'var(--c-surface)', border:'1px solid var(--c-border2)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:'#64748b' }}>{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color:'#475569' }}>{sub}</div>}
    </div>
  );
}

// ── Rapport Journalier ────────────────────────────────────────────
function DailyReport({ operator, onClose }: { operator: string; onClose: () => void }) {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const dateStr = yesterday.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const cfg = OPERATORS[operator] || OPERATORS['DDD'];

  const stats = {
    voyages:    operator === 'DDD' ? 18_420 : 12_340,
    revenus:    operator === 'DDD' ? 3_684_000 : 1_851_000,
    incidents:  operator === 'DDD' ? 7 : 4,
    ponctualite: operator === 'DDD' ? 87 : 91,
    busActifs:  operator === 'DDD' ? 142 : 94,
    busTotaux:  operator === 'DDD' ? 165 : 112,
    kmParcourus: operator === 'DDD' ? 24_680 : 16_420,
    passVendus: operator === 'DDD' ? 38 : 22,
    revenusPub: Math.round(getTotalAdRevenue() * (operator === 'DDD' ? 0.6 : 0.4)),
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`
      <html><head><title>Rapport ${operator} — ${dateStr}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:40px;color:#0f172a;max-width:700px;margin:auto;}
        h1{color:#1e40af;font-size:22px;} h2{color:#475569;font-size:14px;font-weight:400;margin-top:-8px;}
        .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:24px 0;}
        .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;}
        .val{font-size:24px;font-weight:900;color:#1e40af;}
        .lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        th{background:#f8fafc;padding:10px 12px;text-align:left;font-size:12px;color:#475569;}
        td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;}
        .green{color:#059669;font-weight:700;} .red{color:#dc2626;font-weight:700;}
        .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;}
      </style></head><body>
      <h1>📋 Rapport Journalier — ${cfg.name}</h1>
      <h2>${dateStr}</h2>
      <div class="grid">
        <div class="card"><div class="val">${fmt(stats.voyages)}</div><div class="lbl">Voyages effectués</div></div>
        <div class="card"><div class="val">${fmtFcfa(stats.revenus)} F</div><div class="lbl">Revenus billetterie</div></div>
        <div class="card"><div class="val">${stats.ponctualite}%</div><div class="lbl">Taux de ponctualité</div></div>
        <div class="card"><div class="val">${stats.busActifs}/${stats.busTotaux}</div><div class="lbl">Bus actifs</div></div>
        <div class="card"><div class="val">${fmt(stats.kmParcourus)} km</div><div class="lbl">Km parcourus</div></div>
        <div class="card"><div class="val">${stats.incidents}</div><div class="lbl">Incidents signalés</div></div>
      </div>
      <h2 style="font-weight:700;color:#0f172a;font-size:16px;">Détail par ligne (Top 5)</h2>
      <table>
        <tr><th>Ligne</th><th>Voyages</th><th>Revenus</th><th>Ponctualité</th></tr>
        ${LINE_REVENUE.slice(0, 5).map(l => `
          <tr><td>${l.name}</td><td>${fmt(l.trips)}</td><td class="green">${fmtFcfa(l.rev)} FCFA</td><td>${Math.round(80 + Math.random()*15)}%</td></tr>
        `).join('')}
      </table>
      <h2 style="font-weight:700;color:#0f172a;font-size:16px;margin-top:24px;">Revenus supplémentaires</h2>
      <table>
        <tr><th>Source</th><th>Montant</th></tr>
        <tr><td>Pass mensuels vendus (${stats.passVendus} pass)</td><td class="green">${fmtFcfa(stats.passVendus * 9900)} FCFA</td></tr>
        <tr><td>Régie publicitaire SunuBus</td><td class="green">${fmtFcfa(stats.revenusPub)} FCFA</td></tr>
      </table>
      <div class="footer">
        Généré automatiquement par SunuBus Analytics · ${new Date().toLocaleString('fr-FR')} · Confidentiel
      </div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,.75)', backdropFilter:'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background:'var(--c-surface)', border:'1px solid var(--c-border2)', maxHeight:'90vh', overflowY:'auto' }}>

        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom:'1px solid var(--c-border)', background:'rgba(37,99,235,.06)' }}>
          <div>
            <h2 className="font-black text-white">📋 Rapport Journalier</h2>
            <p className="text-xs mt-0.5" style={{ color:'#475569' }}>{cfg.name} · {yesterday.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-xl btn btn-ghost flex items-center justify-center">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 col-span-2" style={{ background:'linear-gradient(135deg,rgba(37,99,235,.12),rgba(37,99,235,.04))', border:'1px solid rgba(37,99,235,.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider" style={{ color:'#60a5fa' }}>REVENUS TOTAL HIER</div>
                  <div className="text-3xl font-black text-white mt-1">{fmtFcfa(stats.revenus + stats.passVendus * 9900 + stats.revenusPub)} FCFA</div>
                </div>
                <span className="text-5xl">💰</span>
              </div>
            </div>
            {[
              { label:'Voyages',     value: fmt(stats.voyages),      icon:'🚌', color:'#60a5fa' },
              { label:'Ponctualité', value: stats.ponctualite + '%', icon:'⏱', color: stats.ponctualite >= 85 ? '#4ade80' : '#fbbf24' },
              { label:'Bus actifs',  value: `${stats.busActifs}/${stats.busTotaux}`, icon:'🔑', color:'#a78bfa' },
              { label:'Incidents',   value: String(stats.incidents), icon:'⚠️', color: stats.incidents > 5 ? '#f87171' : '#fbbf24' },
              { label:'Km parcourus', value: fmt(stats.kmParcourus), icon:'📍', color:'#34d399' },
              { label:'Pass vendus', value: String(stats.passVendus), icon:'🎟', color:'#fb923c' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background:'rgba(255,255,255,.04)', border:'1px solid var(--c-border)' }}>
                <div className="text-lg">{s.icon}</div>
                <div className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color:'#475569' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Revenus breakdown */}
          <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,.03)', border:'1px solid var(--c-border)' }}>
            <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color:'#64748b' }}>DÉTAIL DES REVENUS</div>
            {[
              { label:'Billetterie individuelle', amount: stats.revenus,             icon:'🎫', color:'#60a5fa' },
              { label:`Pass mensuels (×${stats.passVendus})`,       amount: stats.passVendus * 9900,    icon:'🎟', color:'#a78bfa' },
              { label:'Régie publicitaire',       amount: stats.revenusPub,          icon:'📢', color:'#fbbf24' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <div className="flex items-center gap-2">
                  <span>{r.icon}</span>
                  <span className="text-xs" style={{ color:'#94a3b8' }}>{r.label}</span>
                </div>
                <span className="text-sm font-black" style={{ color: r.color }}>{fmtFcfa(r.amount)} FCFA</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-sm font-black text-white">TOTAL</span>
              <span className="text-lg font-black" style={{ color:'#4ade80' }}>
                {fmtFcfa(stats.revenus + stats.passVendus * 9900 + stats.revenusPub)} FCFA
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handlePrint}
              className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background:'rgba(37,99,235,.15)', color:'#60a5fa', border:'1px solid rgba(37,99,235,.25)' }}>
              🖨️ Imprimer / PDF
            </button>
            <button
              className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background:'rgba(52,211,153,.12)', color:'#34d399', border:'1px solid rgba(52,211,153,.2)' }}
              onClick={() => {
                const msg = `📋 Rapport ${cfg.name} — ${yesterday.toLocaleDateString('fr-FR')}\n🚌 Voyages: ${fmt(stats.voyages)}\n💰 Revenus: ${fmtFcfa(stats.revenus+stats.passVendus*9900+stats.revenusPub)} FCFA\n⏱ Ponctualité: ${stats.ponctualite}%\n⚠️ Incidents: ${stats.incidents}`;
                navigator.clipboard?.writeText(msg).then(() => alert('Copié ! Partagez par WhatsApp ou email.'));
              }}>
              📤 Partager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AnalyticsPage ────────────────────────────────────────────
export default function AnalyticsPage({ operator = 'DDD' }: { operator?: string }) {
  const [reportOpen, setReportOpen] = useState(false);
  const passSales = useAppSelector(s => s.passes.passSales);
  const [section, setSection] = useState<'od'|'heures'|'revenus'|'pass'|'heatmap'>('od');
  const cfg = OPERATORS[operator] || OPERATORS['DDD'];
  const totalPassRev = Object.entries(passSales).reduce((sum, [type, count]) => {
    return sum + (PASS_CATALOG[type as keyof typeof PASS_CATALOG]?.price || 0) * count;
  }, 0);

  const totalRevenue = (operator === 'DDD' ? 3_684_000 : 1_851_000) + totalPassRev + Math.round(getTotalAdRevenue() * 0.5);

  const [liveRevenue, setLiveRevenue] = useState(totalRevenue);
  const [tickerFlash, setTickerFlash] = useState(false);

  React.useEffect(() => {
    setLiveRevenue(totalRevenue);
  }, [totalRevenue]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const increment = [200, 300, 450, 500, 1000][Math.floor(Math.random() * 5)];
      setLiveRevenue(r => r + increment);
      setTickerFlash(true);
      const timeout = setTimeout(() => setTickerFlash(false), 900);
      return () => clearTimeout(timeout);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {reportOpen && <DailyReport operator={operator} onClose={() => setReportOpen(false)} />}

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Analytics</h2>
            <p className="text-[11px]" style={{ color:'#475569' }}>{cfg.name} · données temps réel simulées</p>
          </div>
          <button onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
            style={{ background:'rgba(37,99,235,.15)', color:'#60a5fa', border:'1px solid rgba(37,99,235,.25)', minHeight:40 }}>
            📋 Rapport J−1
          </button>
        </div>

        {/* Global KPIs */}
        <div className="px-4 mb-4 grid grid-cols-2 gap-2">
          <KPI icon="🚌" label="Voyages aujourd'hui" value={fmt(operator==='DDD'?18420:12340)} sub="+4% vs hier" color="#60a5fa" />
          <div className="relative">
            <KPI icon="💰" label="Revenus totaux (Live)" value={fmt(liveRevenue)+' F'} sub="billetterie+pass+pub" color="#4ade80" />
            {tickerFlash && (
              <span className="absolute right-4 top-2 text-[9px] font-black text-emerald-400 animate-fade-up">
                + transaction
              </span>
            )}
          </div>
          <KPI icon="⏱" label="Ponctualité" value={operator==='DDD'?'87%':'91%'} sub="objectif: 90%" color={operator==='DDD'?'#fbbf24':'#4ade80'} />
          <KPI icon="📢" label="Revenus pub" value={fmtFcfa(getTotalAdRevenue())+' F'} sub={fmt(getTotalImpressions())+' impressions'} color="#fbbf24" />
        </div>

        {/* Section nav */}
        <div className="px-4 mb-4 flex gap-1.5 overflow-x-auto">
          {([
            { id:'od',      label:'Matrice OD' },
            { id:'heures',  label:'Heures de pointe' },
            { id:'revenus', label:'Revenus par ligne' },
            { id:'pass',    label:'Pass & Abonnements' },
            { id:'heatmap',  label:'Affluence Arrêts' },
          ] as const).map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all"
              style={section===s.id
                ? { background: cfg.color, color:'#fff' }
                : { background:'rgba(255,255,255,.05)', color:'#475569', border:'1px solid var(--c-border)' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Matrice OD ── */}
        {section === 'od' && (
          <div className="px-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color:'#64748b' }}>
              TOP 10 TRAJETS ORIGINE→DESTINATION (aujourd'hui)
            </p>
            {OD_PAIRS.map((pair, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background:'var(--c-surface)', border:'1px solid var(--c-border2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-black w-5 flex-shrink-0" style={{ color:'#475569' }}>#{i+1}</span>
                    <span className="text-xs font-black text-white truncate">{pair.from}</span>
                    <span style={{ color:'#334155' }}>→</span>
                    <span className="text-xs font-bold text-white truncate">{pair.to}</span>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 ml-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:'rgba(96,165,250,.12)', color:'#60a5fa' }}>{pair.line}</span>
                    <span className="text-xs font-black text-white">{fmt(pair.count)}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,.06)' }}>
                  <div className="h-full rounded-full" style={{ width:`${pair.pct}%`, background: cfg.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Heures de pointe ── */}
        {section === 'heures' && (
          <div className="px-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color:'#64748b' }}>
              DISTRIBUTION HORAIRE DES VOYAGES (aujourd'hui)
            </p>
            {/* Bar chart */}
            <div className="rounded-2xl p-4" style={{ background:'var(--c-surface)', border:'1px solid var(--c-border2)' }}>
              <div className="flex items-end gap-1 h-36 mb-2">
                {HOURLY_DATA.map(({ h, v }) => {
                  const pct = v / MAX_V;
                  const isPeak = v > 3000;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-sm transition-all"
                        style={{
                          height: `${Math.round(pct * 130)}px`,
                          background: isPeak
                            ? `linear-gradient(to top, ${cfg.color}, ${cfg.color}99)`
                            : 'rgba(255,255,255,.1)',
                          minHeight: 2,
                        }} />
                    </div>
                  );
                })}
              </div>
              {/* X axis labels */}
              <div className="flex gap-1">
                {HOURLY_DATA.map(({ h }) => (
                  <div key={h} className="flex-1 text-center text-[8px]" style={{ color:'#334155' }}>
                    {h}h
                  </div>
                ))}
              </div>
            </div>

            {/* Peak summary */}
            <div className="mt-3 space-y-2">
              {[
                { label:'Pointe matin', hours:'7h–9h', v: 4950, color:'#f59e0b', icon:'🌅' },
                { label:'Pointe soir',  hours:'17h–19h', v: 5800, color:'#ef4444', icon:'🌇' },
                { label:'Creux',        hours:'10h–16h', v: 1700, color:'#60a5fa', icon:'🌤' },
              ].map(p => (
                <div key={p.label} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background:`${p.color}12`, border:`1px solid ${p.color}25` }}>
                  <div className="flex items-center gap-2">
                    <span>{p.icon}</span>
                    <div>
                      <div className="text-xs font-black text-white">{p.label}</div>
                      <div className="text-[10px]" style={{ color:'#64748b' }}>{p.hours}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black" style={{ color: p.color }}>{fmt(p.v)}</div>
                    <div className="text-[10px]" style={{ color:'#475569' }}>voyages/h max</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl p-3" style={{ background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.2)' }}>
              <p className="text-xs font-black" style={{ color:'#fbbf24' }}>💡 Recommandation IA</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color:'#94a3b8' }}>
                Augmenter la fréquence des lignes DDD L8 et BRT-L1 entre 17h et 19h (+2 bus/ligne). Économie estimée : réduction de 23% de l'attente aux heures de pointe.
              </p>
            </div>
          </div>
        )}

        {/* ── Revenus par ligne ── */}
        {section === 'revenus' && (
          <div className="px-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color:'#64748b' }}>
              REVENUS PAR LIGNE (7 derniers jours)
            </p>
            {LINE_REVENUE.map((l, i) => {
              const opCfg = OPERATORS[l.op] || OPERATORS['DDD'];
              const maxRev = LINE_REVENUE[0].rev;
              return (
                <div key={i} className="rounded-xl p-3" style={{ background:'var(--c-surface)', border:'1px solid var(--c-border2)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: opCfg.color }}>{l.op}</span>
                      <span className="text-xs font-black text-white">{l.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black" style={{ color:'#4ade80' }}>{fmtFcfa(l.rev)} F</span>
                      <span className="text-[10px] ml-2" style={{ color:'#475569' }}>{fmt(l.trips)} traj.</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,.06)' }}>
                    <div className="h-full rounded-full" style={{ width:`${Math.round((l.rev/maxRev)*100)}%`, background: opCfg.color }} />
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl p-3 flex items-center justify-between mt-2"
              style={{ background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)' }}>
              <span className="text-sm font-black text-white">Total Top 8 lignes</span>
              <span className="text-base font-black" style={{ color:'#4ade80' }}>
                {fmtFcfa(LINE_REVENUE.reduce((s,l)=>s+l.rev,0))} FCFA
              </span>
            </div>
          </div>
        )}

        {/* ── Pass & Abonnements ── */}
        {section === 'pass' && (
          <div className="px-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color:'#64748b' }}>
              VENTES DE PASS MENSUELS (ce mois)
            </p>

            {/* Simulation de ventes si pas encore d'achats réels */}
            {Object.entries(PASS_CATALOG).map(([key, cfg2]) => {
              const sold = (passSales[key as keyof typeof passSales] || 0) + [38,22,14,8,5][Object.keys(PASS_CATALOG).indexOf(key)];
              const rev  = sold * cfg2.price;
              const maxSold = 50;
              return (
                <div key={key} className="rounded-xl p-4" style={{ background:'var(--c-surface)', border:`1px solid ${cfg2.color}25` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cfg2.emoji}</span>
                      <div>
                        <div className="text-xs font-black text-white">{cfg2.label}</div>
                        <div className="text-[10px]" style={{ color:'#475569' }}>{cfg2.price.toLocaleString('fr-FR')} FCFA/mois</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black" style={{ color: cfg2.color }}>{sold}</div>
                      <div className="text-[10px]" style={{ color:'#475569' }}>vendus</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background:'rgba(255,255,255,.06)' }}>
                    <div className="h-full rounded-full" style={{ width:`${Math.min(100, Math.round((sold/maxSold)*100))}%`, background: cfg2.color }} />
                  </div>
                  <div className="text-[10px] text-right font-black" style={{ color:'#4ade80' }}>
                    {fmtFcfa(rev)} FCFA générés
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{ background:'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.25)' }}>
              <span className="text-sm font-black text-white">Revenus pass ce mois</span>
              <span className="text-xl font-black" style={{ color:'#a78bfa' }}>
                {fmtFcfa([38,22,14,8,5].reduce((s,count,i) =>
                  s + count * Object.values(PASS_CATALOG)[i].price, 0) + totalPassRev)} FCFA
              </span>
            </div>
          </div>
        )}

        {/* ── Fréquentation des arrêts (Heatmap) ── */}
        {section === 'heatmap' && (
          <div className="px-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color:'#64748b' }}>
              POINTS CHAUDS & AFFLUENCE AUX ARRÊTS (Temps réel)
            </p>
            
            {[
              { stop: "Gare Petersen", load: 96, status: "Critique", color: "#ef4444", trend: "↗ +12% vs hier", advice: "Régulation requise : +3 bus L1 pour désengorger" },
              { stop: "Croisement Colobane", load: 84, status: "Critique", color: "#ef4444", trend: "→ Stable", advice: "Fréquence actuelle satisfaisante" },
              { stop: "Rond-point Liberté 6", load: 72, status: "Élevée", color: "#f59e0b", trend: "↘ -5% vs hier", advice: "Contrôleurs en place" },
              { stop: "Patte d'Oie Interchange", load: 65, status: "Modérée", color: "#f59e0b", trend: "↗ +8% vs hier", advice: "Aucune action requise" },
              { stop: "Gare de Dakar (BRT)", load: 58, status: "Modérée", color: "#f59e0b", trend: "→ Stable", advice: "Flux passager régulier" },
              { stop: "Terminus Pikine", load: 45, status: "Faible", color: "#10b981", trend: "↘ -10% vs hier", advice: "Baisse d'affluence constatée" },
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl p-4" style={{ background:'var(--c-surface)', border: `1px solid ${item.load > 80 ? 'rgba(239,68,68,0.25)' : 'var(--c-border2)'}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-black text-white">{item.stop}</h4>
                    <span className="text-[9px] font-bold" style={{ color: '#64748b' }}>{item.trend}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full" style={{ background: item.color + '20', color: item.color }}>
                      {item.status} ({item.load}%)
                    </span>
                  </div>
                </div>
                
                {/* Visual heat gauge */}
                <div className="h-2 rounded-full overflow-hidden mb-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${item.load}%`, background: `linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)` }} />
                </div>
                
                {/* AI Advice note */}
                <p className="text-[10px] leading-relaxed italic" style={{ color: '#94a3b8' }}>
                  📢 <span className="font-bold">Note de régulation:</span> {item.advice}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
