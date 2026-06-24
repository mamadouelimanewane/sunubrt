import React, { useState, useEffect, useRef } from 'react';
import { usePopBack } from '@/hooks/usePopBack';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

import {
  setRouteOrigin, setRouteDestination, clearRoute, recordTrip,
  setActiveTab, showToast, buyTicket, startJourney, setFocusedLine, setRouteDisplay,
} from '@/store/store';
import type { RouteDisplay } from '@/store/store';
import { STOPS, LINES, getNextDepartures } from '@/data/transportData';
import { DAKAR_PLACES } from '@/data/dakarPlaces';
import { getNearestStop, walkingMinutes } from '@/utils/nearest';
import { findRoutes, type RouteOption } from '@/utils/routeFinder';
import { shareRoute } from '@/utils/share';
import type { Stop, ActiveJourney } from '@/types';
import SearchBar from './SearchBar';

// ── Live countdown ─────────────────────────────────────────────
function Countdown({ seconds }: { seconds: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setS(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  if (s <= 0) return <span className="text-emerald-400 font-black">Maintenant</span>;
  const m = Math.floor(s / 60), ss = s % 60;
  return <span>{m > 0 ? `${m} min ${String(ss).padStart(2,'0')} s` : `${ss} s`}</span>;
}

// ── Fare breakdown badge ──────────────────────────────────────
function FareBreakdown({ option }: { option: RouteOption }) {
  const busSteps = option.steps.filter(s => s.type === 'bus' && s.lineId);
  if (busSteps.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
      {busSteps.map((s, i) => {
        const line = LINES.find(l => l.id === s.lineId);
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-[10px]" style={{ color: '#334155' }}>+</span>}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: s.color + '20', color: s.color }}>
              {line?.name} {line?.tarif}F
            </span>
          </React.Fragment>
        );
      })}
      <span className="text-[10px]" style={{ color: '#334155' }}>= {option.fare} FCFA total</span>
    </div>
  );
}

// ── Option card ───────────────────────────────────────────────
function OptionCard({ option, selected, onSelect }: { option: RouteOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[.98]"
      style={{
        background: selected
          ? `linear-gradient(145deg, ${option.primaryLineColor}18 0%, var(--c-surface) 100%)`
          : 'var(--c-surface)',
        border: selected
          ? `1.5px solid ${option.primaryLineColor}55`
          : '1.5px solid var(--c-border)',
        boxShadow: selected ? `0 6px 24px ${option.primaryLineColor}20` : 'none',
      }}>
      <div className="h-0.5" style={{ background: selected ? option.primaryLineColor : 'transparent' }} />
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: option.labelColor + '22', color: option.labelColor, border: `1px solid ${option.labelColor}33` }}>
            {option.label}
          </span>
          <span className="text-xs font-black px-2 py-1 rounded-md text-white"
            style={{ background: option.primaryLineColor }}>
            {option.primaryLineName}
          </span>
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-lg font-black text-white leading-none">{option.totalMin}</div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: '#475569' }}>min</div>
            </div>
            <div className="w-px h-6" style={{ background: 'rgba(255,255,255,.08)' }} />
            <div>
              <div className="text-lg font-black leading-none" style={{ color: option.primaryLineColor }}>{option.fare}</div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: '#475569' }}>FCFA</div>
            </div>
            {option.transfers > 0 && (
              <>
                <div className="w-px h-6" style={{ background: 'rgba(255,255,255,.08)' }} />
                <div>
                  <div className="text-lg font-black text-white leading-none">{option.transfers}</div>
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: '#475569' }}>corresp.</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {option.steps.map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[10px]" style={{ color: '#334155' }}>→</span>}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${step.type === 'transfer' ? 'italic' : ''}`}
                style={step.type !== 'transfer'
                  ? { background: step.color + '22', color: step.color }
                  : { color: '#475569' }}>
                {step.type === 'walk' ? `🚶 ${step.durationMin}m`
                 : step.type === 'transfer' ? '↻'
                 : step.lineId ? LINES.find(l => l.id === step.lineId)?.name || step.label.split('·')[0].trim()
                 : step.label.split('·')[0].trim()}
              </span>
            </React.Fragment>
          ))}
        </div>

        <FareBreakdown option={option} />

        {option.walkMin > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px]" style={{ color: '#475569' }}>
            <span>🚶</span>
            <span>{option.walkMeters} m à pied jusqu'à l'arrêt · {option.walkMin} min</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Timeline claire de l'itinéraire ──────────────────────────
function RouteTimeline({ option, origin, dest, onBuy, onStart }: {
  option: RouteOption; origin: Stop; dest: Stop;
  onBuy: (method: string) => void; onStart: () => void;
}) {
  const [buying, setBuying] = useState(false);
  usePopBack(() => setBuying(false), buying);
  const nextDep = getNextDepartures(origin.id)[0];

  // Construire une liste de nœuds lisibles depuis les steps
  type Node =
    | { kind: 'stop';     name: string; color: string; role: 'start' | 'end' | 'transfer' }
    | { kind: 'segment';  lineName: string; color: string; durationMin: number; stops?: string }
    | { kind: 'walk';     durationMin: number; meters?: number };

  const nodes: Node[] = [];
  nodes.push({ kind: 'stop', name: origin.name, color: '#059669', role: 'start' });

  for (const step of option.steps) {
    if (step.type === 'walk') {
      nodes.push({ kind: 'walk', durationMin: step.durationMin, meters: option.walkMeters });
    } else if (step.type === 'bus') {
      const line = LINES.find(l => l.id === step.lineId);
      const from = step.fromStopId ? STOPS.find(s => s.id === step.fromStopId) : null;
      const to   = step.toStopId   ? STOPS.find(s => s.id === step.toStopId)   : null;
      nodes.push({
        kind: 'segment',
        lineName: line?.name || step.label,
        color: step.color,
        durationMin: step.durationMin,
        stops: from && to ? `${from.name} → ${to.name}` : undefined,
      });
      if (to && step !== option.steps[option.steps.length - 1]) {
        nodes.push({ kind: 'stop', name: to.name, color: '#d97706', role: 'transfer' });
      }
    } else if (step.type === 'transfer') {
      // skip — déjà géré par le stop précédent
    }
  }
  nodes.push({ kind: 'stop', name: dest.name, color: '#dc2626', role: 'end' });

  return (
    <div className="rounded-2xl overflow-hidden mt-2 animate-fade-up"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>

      {/* Prochain départ */}
      {nextDep && (
        <div className="flex items-center gap-3 px-4 py-2.5"
          style={{ background: 'rgba(37,99,235,.1)', borderBottom: '1px solid var(--c-border)' }}>
          <span className="text-base">🕐</span>
          <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>Prochain départ</span>
          <span className="ml-auto text-sm font-black" style={{ color: '#60a5fa' }}>
            <Countdown seconds={nextDep.waitMin * 60} />
          </span>
        </div>
      )}

      {/* Timeline verticale */}
      <div className="px-4 py-3">
        {nodes.map((node, i) => (
          <div key={i} className="flex gap-3">
            {/* Colonne icône + ligne verticale */}
            <div className="flex flex-col items-center" style={{ minWidth: 28 }}>
              {node.kind === 'stop' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 z-10"
                  style={{ background: node.color, border: '2px solid var(--c-surface)', boxShadow: `0 0 0 2px ${node.color}40` }}>
                  {node.role === 'start' ? 'A' : node.role === 'end' ? 'B' : '↻'}
                </div>
              )}
              {node.kind === 'segment' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 z-10 text-sm"
                  style={{ background: node.color, border: '2px solid var(--c-surface)' }}>
                  🚌
                </div>
              )}
              {node.kind === 'walk' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 z-10 text-sm"
                  style={{ background: 'rgba(5,150,105,.2)', border: '2px solid var(--c-surface)' }}>
                  🚶
                </div>
              )}
              {/* Ligne verticale entre nœuds */}
              {i < nodes.length - 1 && (
                <div className="flex-1 w-0.5 my-0.5"
                  style={{
                    background: nodes[i+1]?.kind === 'segment' ? (nodes[i+1] as any).color + '60'
                      : node.kind === 'segment' ? (node as any).color + '60'
                      : 'rgba(255,255,255,.1)',
                    minHeight: 16,
                  }} />
              )}
            </div>

            {/* Contenu du nœud */}
            <div className="flex-1 pb-2 pt-0.5 min-w-0">
              {node.kind === 'stop' && (
                <div>
                  <span className="text-sm font-black" style={{ color: node.color }}>{node.name}</span>
                  {node.role === 'transfer' && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(217,119,6,.2)', color: '#fbbf24' }}>
                      Correspondance
                    </span>
                  )}
                </div>
              )}
              {node.kind === 'segment' && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black px-2.5 py-0.5 rounded-full text-white"
                      style={{ background: node.color }}>
                      {node.lineName}
                    </span>
                    <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>
                      {node.durationMin} min
                    </span>
                  </div>
                  {node.stops && (
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: '#475569' }}>{node.stops}</p>
                  )}
                </div>
              )}
              {node.kind === 'walk' && (
                <span className="text-xs font-bold" style={{ color: '#34d399' }}>
                  À pied {node.meters ? `${node.meters} m · ` : ''}{node.durationMin} min
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!buying ? (
        <div className="flex gap-2 px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--c-border)' }}>
          <button onClick={onStart}
            className="flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 6px 20px rgba(5,150,105,.3)', fontSize: 14 }}>
            🚀 Partir maintenant
          </button>
          <button onClick={() => setBuying(true)}
            className="flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 6px 20px rgba(37,99,235,.3)', fontSize: 14 }}>
            🎫 Payer {option.fare} F
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--c-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 pt-2" style={{ color: '#475569' }}>
            Payer {option.fare} FCFA via
          </p>
          <div className="space-y-2">
            {[
              { l:'Wave',         e:'🌊', g:'linear-gradient(135deg,#00c5e3,#0082a3)' },
              { l:'Orange Money', e:'🟠', g:'linear-gradient(135deg,#f97316,#c2410c)' },
              { l:'Free Money',   e:'🏦', g:'linear-gradient(135deg,#7c3aed,#4c1d95)' },
            ].map(m => (
              <button key={m.l} onClick={() => { onBuy(m.l); setBuying(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-white font-bold transition-all active:scale-[.98]"
                style={{ background: m.g }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{m.e}</span>
                  <span className="font-black">{m.l}</span>
                </div>
                <span className="font-black">{option.fare} F</span>
              </button>
            ))}
            <button onClick={() => setBuying(false)} className="w-full py-2 rounded-xl text-xs btn btn-ghost">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildRouteDisplay(opt: RouteOption, userLoc: [number, number] | null): RouteDisplay {
  const busSteps = opt.steps.filter(s => s.type === 'bus' && s.lineId && s.fromStopId && s.toStopId);
  const segments = busSteps.map(s => {
    const line = LINES.find(l => l.id === s.lineId);
    return { lineId: s.lineId!, lineName: line?.name || s.lineId!, color: s.color, fromStopId: s.fromStopId!, toStopId: s.toStopId! };
  });
  const transferStopIds = opt.steps
    .filter(s => s.type === 'transfer' && s.fromStopId)
    .map(s => s.fromStopId!);
  return {
    segments,
    originStopId: opt.walkingStop.id,
    destStopId: (() => { const bs = opt.steps.filter(s => s.type === 'bus'); return bs[bs.length - 1]?.toStopId || ''; })(),
    transferStopIds,
    walkFrom: opt.walkMin > 0 && userLoc ? userLoc : null,
    fare: opt.fare,
  };
}

// ── Main RoutePanel ───────────────────────────────────────────
export default function RoutePanel() {
  const dispatch = useAppDispatch();
  const { route, userLocation } = useAppSelector(s => s.mobility);
  const { history } = useAppSelector(s => s.journey);
  const [options, setOptions]   = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState<RouteOption | null>(null);
  const [noRoute, setNoRoute]   = useState(false);
  const [nearestInfo, setNearestInfo] = useState<{ stop: Stop; meters: number } | null>(null);
  const hasAutoSetOrigin = useRef(false);

  // Détecte l'arrêt le plus proche et le définit comme origine par défaut (une seule fois)
  useEffect(() => {
    if (!userLocation) return;
    const res = getNearestStop(userLocation[0], userLocation[1]);
    if (!res) return;
    setNearestInfo({ stop: res.stop, meters: res.distanceMeters });
    // Auto-set origin uniquement au 1er fix GPS et si l'utilisateur n'a pas encore rempli le champ
    if (!hasAutoSetOrigin.current && !route.origin) {
      hasAutoSetOrigin.current = true;
      dispatch(setRouteOrigin(res.stop));
    }
  }, [userLocation]);

  const calculate = () => {
    if (!route.origin || !route.destination) return;
    setOptions([]); setSelected(null); setNoRoute(false);
    const results = findRoutes(route.origin, route.destination, userLocation?.[0], userLocation?.[1]);
    if (results.length === 0) { setNoRoute(true); dispatch(setRouteDisplay(null)); return; }
    setOptions(results);
    setSelected(results[0]);
    if (results[0]) {
      dispatch(recordTrip({ fare: results[0].fare, operator: results[0].operator }));
      dispatch(setRouteDisplay(buildRouteDisplay(results[0], userLocation)));
      // NE PAS setFocusedLine ici — la FocusedLineOverlay pollue le tracé avec ses numéros
    }
  };

  const handleStartJourney = () => {
    if (!selected || !route.origin || !route.destination) return;
    const journey: ActiveJourney = {
      id: Math.random().toString(36).substring(2, 11),
      originStop: route.origin,
      destinationStop: route.destination,
      walkingStop: selected.walkingStop,
      walkingMeters: selected.walkMeters,
      lineId: selected.primaryLineId,
      lineName: selected.primaryLineName,
      lineColor: selected.primaryLineColor,
      operator: selected.operator,
      fare: selected.fare,
      transfers: selected.transfers,
      startedAt: Date.now(),
      estimatedDuration: selected.totalMin,
      status: selected.walkMin > 0 ? 'walking' : 'waiting',
      ticketId: null,
      steps: selected.steps,
    };
    dispatch(startJourney(journey));
    dispatch(showToast({ type: 'success', message: `Trajet démarré → ${route.destination.name} !` }));
  };

  const handleBuy = (method: string) => {
    if (!selected) return;
    dispatch(buyTicket({ operator: selected.operator, price: selected.fare }));
    dispatch(showToast({ type: 'success', message: `Billet acheté via ${method} !` }));
  };

  const handleSelectOption = (opt: RouteOption) => {
    setSelected(opt);
    dispatch(recordTrip({ fare: opt.fare, operator: opt.operator }));
    dispatch(setRouteDisplay(buildRouteDisplay(opt, userLocation)));
  };

  const handleShare = () => {
    if (!route.origin || !route.destination) return;
    shareRoute(route.origin.id, route.destination.id, dispatch, showToast);
  };

  const handleRefaire = (rec: { originId?: string; destId?: string }) => {
    const origin = STOPS.find(s => s.id === rec.originId);
    const dest   = STOPS.find(s => s.id === rec.destId);
    if (!origin || !dest) return;
    dispatch(setRouteOrigin(origin));
    dispatch(setRouteDestination(dest));
    setOptions([]); setSelected(null); setNoRoute(false);
  };

  const departures = route.origin ? getNextDepartures(route.origin.id) : [];

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-base font-black text-white">
        🚌 Trouver mon bus
      </h2>
      {!route.origin && !route.destination && (
        <p className="text-xs" style={{ color: '#64748b' }}>
          Entrez votre point de départ et votre destination
        </p>
      )}

      {nearestInfo && route.origin?.id === nearestInfo.stop.id && !options.length && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl animate-fade-up"
          style={{ background: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.2)' }}>
          <span>📍</span>
          <span className="text-xs flex-1" style={{ color: '#34d399' }}>
            Départ depuis votre position actuelle
          </span>
          <span className="text-[10px] font-bold" style={{ color: '#34d399' }}>
            {nearestInfo.meters < 1000 ? `${nearestInfo.meters} m` : `${(nearestInfo.meters / 1000).toFixed(1)} km`}
          </span>
        </div>
      )}

      {/* Origin */}
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 12px rgba(5,150,105,.4)' }}>
            {route.origin ? '✓' : 'A'}
          </div>
        </div>
        <SearchBar placeholder="📍 D'où partez-vous ?" value={route.origin}
          onSelect={s => { dispatch(setRouteOrigin(s)); setOptions([]); setSelected(null); setNoRoute(false); }}
          className="flex-1" />
      </div>

      {/* Swap */}
      {route.origin && route.destination && (
        <div className="flex justify-center -my-1">
          <button onClick={() => { dispatch(setRouteOrigin(route.destination)); dispatch(setRouteDestination(route.origin)); setOptions([]); setSelected(null); }}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 hover:scale-110"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--c-border)', color: '#94a3b8' }}>⇅</button>
        </div>
      )}

      {/* Destination */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#991b1b,#dc2626)', boxShadow: '0 4px 12px rgba(220,38,38,.4)' }}>
          {route.destination ? '✓' : 'B'}
        </div>
        <SearchBar placeholder="🏁 Où allez-vous ?" value={route.destination}
          onSelect={s => { dispatch(setRouteDestination(s)); setOptions([]); setSelected(null); setNoRoute(false); }}
          className="flex-1" />
      </div>

      {/* Calculate + Share buttons */}
      <div className="flex gap-2">
        <button onClick={calculate} disabled={!route.origin || !route.destination}
          className="flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={route.origin && route.destination
            ? { background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 8px 24px rgba(5,150,105,.4)', fontSize: 15 }
            : { background: 'var(--c-surface2)' }}>
          🔍 Rechercher mon bus
        </button>
        {options.length > 0 && (
          <button onClick={handleShare}
            className="rounded-xl flex items-center gap-1.5 px-3 text-xs font-bold transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--c-border)', color: '#94a3b8', minHeight: 44 }}
            title="Partager cet itinéraire">🔗 <span>Partager</span></button>
        )}
        {(route.origin || route.destination) && (
          <button onClick={() => { dispatch(clearRoute()); dispatch(setRouteDisplay(null)); setOptions([]); setSelected(null); setNoRoute(false); setNearestInfo(null); }}
            className="w-11 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--c-border)', color: '#64748b' }}>✕</button>
        )}
      </div>

      {/* ══ VOYAGER — séparateur visible seulement en état vierge (aucun champ rempli) ══ */}
      {options.length === 0 && !noRoute && !route.origin && !route.destination && (
        <>
          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.08)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.08)' }} />
          </div>

          {/* ── Mode "Je connais pas l'adresse" — raccourcis lieux populaires ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#334155' }}>
              📍 Je cherche un lieu connu
            </p>
            <div className="grid grid-cols-4 gap-1.5 xs:grid-cols-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {[
                { id:'tr-gare-dakar', e:'🚉', l:'Gare Dakar' },
                { id:'tr-aibd',       e:'✈️',  l:'Aéroport'   },
                { id:'h-principal',   e:'🏥', l:'Hôpital'    },
                { id:'e-ucad',        e:'🎓', l:'UCAD'       },
                { id:'m-sandaga',     e:'🛒', l:'Sandaga'    },
                { id:'m-hlm',         e:'🧵', l:'Marché HLM' },
                { id:'q-plateau',     e:'🏙️', l:'Plateau'    },
                { id:'sp-lss',        e:'🏟️', l:'Stade LSS'  },
              ].map(poi => {
                const place = DAKAR_PLACES.find(p => p.id === poi.id);
                const nearStop = place ? STOPS.find(s => s.id === place.nearestStopId) : null;
                return (
                  <button key={poi.id}
                    onClick={() => {
                      if (nearStop) {
                        dispatch(setRouteDestination(nearStop));
                        setOptions([]); setSelected(null); setNoRoute(false);
                      }
                    }}
                    disabled={!nearStop}
                    className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition-all active:scale-90 disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                    <span className="text-xl leading-none">{poi.e}</span>
                    <span className="leading-tight text-center" style={{ fontSize: 9 }}>{poi.l}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {noRoute && (
        <div className="rounded-2xl p-4 text-center animate-fade-up"
          style={{ background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.2)' }}>
          <div className="text-2xl mb-1.5">🗺️</div>
          <p className="font-bold text-sm" style={{ color: '#fbbf24' }}>Aucun itinéraire trouvé</p>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>Ces arrêts ne sont pas connectés directement. Essayez un arrêt intermédiaire.</p>
        </div>
      )}

      {/* ── Résumé itinéraire sélectionné : cadre blanc ── */}
      {selected && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-4 animate-fade-up"
          style={{ background: 'var(--c-surface)', border: '1.5px solid var(--c-border2)', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
          {/* Ligne principale */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {selected.steps.filter(s => s.type === 'bus').map((s, i) => (
                <span key={i} className="text-xs font-black px-2.5 py-1 rounded-lg text-white"
                  style={{ background: s.color }}>
                  {s.lineId}
                </span>
              ))}
              <span className="text-xs font-bold" style={{ color: 'var(--c-muted)' }}>
                {route.origin?.name} → {route.destination?.name}
              </span>
            </div>
          </div>
          {/* Durée */}
          <div className="text-center flex-shrink-0">
            <div className="text-lg font-black" style={{ color: 'var(--c-text)' }}>{selected.totalMin}<span className="text-xs font-bold ml-0.5" style={{ color: 'var(--c-muted)' }}>min</span></div>
          </div>
          {/* Tarif */}
          <div className="text-center flex-shrink-0 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)' }}>
            <div className="text-xs font-black" style={{ color: '#d97706' }}>🎫 TARIF</div>
            <div className="text-sm font-black" style={{ color: '#fbbf24' }}>{selected.fare} F</div>
          </div>
          {/* Marche */}
          {selected.walkMin > 0 && (
            <div className="text-center flex-shrink-0 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(5,150,105,.1)', border: '1px solid rgba(5,150,105,.3)' }}>
              <div className="text-xs font-black" style={{ color: '#059669' }}>🚶 MARCHE</div>
              <div className="text-sm font-black" style={{ color: '#34d399' }}>{selected.walkMin} min</div>
            </div>
          )}
        </div>
      )}

      {/* OPTIONS */}
      {options.length > 0 && (
        <div className="space-y-2 animate-fade-up">
          {options.length > 1 && (
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#334155' }}>
              {options.length} itinéraire{options.length > 1 ? 's' : ''} disponible{options.length > 1 ? 's' : ''}
            </p>
          )}
          {options.map(opt => (
            <OptionCard key={opt.id} option={opt}
              selected={selected?.id === opt.id}
              onSelect={() => handleSelectOption(opt)} />
          ))}
          {selected && route.origin && route.destination && (
            <RouteTimeline option={selected} origin={route.origin} dest={route.destination}
              onBuy={handleBuy} onStart={handleStartJourney} />
          )}
        </div>
      )}

      {/* Recent trips — seulement si l'utilisateur a déjà rempli un champ (évite le doublon avec PlanPage) */}
      {!options.length && !noRoute && history.length > 0 && (route.origin || route.destination) && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: '#334155' }}>
            🕐 Trajets récents
          </h3>
          <div className="space-y-1.5">
            {history.slice(0, 3).map((rec, i) => (
              <button key={rec.id} onClick={() => handleRefaire({ originId: rec.originId, destId: rec.destId })}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[.98]"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'rgba(37,99,235,.12)' }}>🔄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{rec.originName} → {rec.destName}</p>
                  <p className="text-[10px]" style={{ color: '#475569' }}>
                    {rec.duration} min · {rec.fare} FCFA · {new Date(rec.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                  </p>
                </div>
                <span className="text-xs font-black" style={{ color: '#2563eb' }}>Refaire →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nearby departures */}
      {route.origin && !options.length && !noRoute && departures.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: '#334155' }}>
            Prochains départs · {route.origin.name}
          </h3>
          {departures.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
              style={{ borderBottom: i < 4 ? '1px solid var(--c-border)' : '' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="text-[11px] font-black text-white px-2 py-1 rounded-lg flex-shrink-0"
                style={{ background: d.color, minWidth: 48, textAlign: 'center' }}>{d.lineName}</span>
              <span className="text-xs flex-1 truncate" style={{ color: '#64748b' }}>
                {d.route.split('↔')[1]?.trim() || d.route}
              </span>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-black leading-none"
                  style={{ color: d.waitMin <= 3 ? '#34d399' : d.waitMin <= 10 ? '#fbbf24' : '#475569' }}>
                  <Countdown seconds={d.waitMin * 60} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
