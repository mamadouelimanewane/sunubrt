import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePopBack } from '@/hooks/usePopBack';
import QRCodeStop from '@/components/QRCodeStop';
import { AdCard } from '@/components/AdBanner';
import { selectAd, trackImpression } from '@/services/adEngine';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedStop, toggleFavStop, setMapCenter, setMapZoom, addReport, showToast } from '@/store/store';
import { STOPS, OPERATORS, LINES, getNextDepartures } from '@/data/transportData';
import { searchStops } from '@/utils/fuzzy';
import type { OperatorId } from '@/types';

// ── Live countdown hook ────────────────────────────────────────
function useLiveDepartures(stopId: string) {
  const [deps, setDeps] = useState(() => getNextDepartures(stopId));
  useEffect(() => {
    setDeps(getNextDepartures(stopId));
    const id = setInterval(() => setDeps(getNextDepartures(stopId)), 30_000);
    return () => clearInterval(id);
  }, [stopId]);
  return deps;
}

// ── Countdown chip ────────────────────────────────────────────
function WaitChip({ waitMin, time }: { waitMin: number; time: string }) {
  const [secs, setSecs] = useState(waitMin * 60);
  useEffect(() => {
    setSecs(waitMin * 60);
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, [waitMin]);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const color = m <= 2 ? '#34d399' : m <= 8 ? '#fbbf24' : '#64748b';
  return (
    <span className="text-sm font-black flex-shrink-0 tabular-nums" style={{ color }}>
      {m > 0 ? `${m}m` : `${s}s`}
      {m <= 2 && secs > 0 && (
        <span className="text-[11px] ml-0.5" style={{ color: '#34d399', opacity: 0.7 }}>{s.toString().padStart(2,'0')}</span>
      )}
      {m > 99 && <span className="text-[11px] ml-0.5" style={{ color: '#334155' }}>{time}</span>}
    </span>
  );
}

// ── Stop card ─────────────────────────────────────────────────
function StopCard({ stop, isFav, onClick, onFav, showAllDeps = false, onGuide }: {
  stop: typeof STOPS[0];
  isFav: boolean;
  onClick: () => void;
  onFav: (e: React.MouseEvent) => void;
  showAllDeps?: boolean;
  onGuide?: (stop: typeof STOPS[0]) => void;
}) {
  const deps = useLiveDepartures(stop.id);
  const [qrOpen, setQrOpen] = useState(false);
  const mainOp = stop.operators[0];
  const opColor = OPERATORS[mainOp]?.color || '#2563eb';
  const visibleDeps = showAllDeps ? deps : deps.slice(0, 2);

  return (
    <div className="card rounded-2xl p-4 cursor-pointer transition-all active:scale-[.98] group"
      onClick={onClick}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: opColor + '20' }}>
          <span className="text-base">{OPERATORS[mainOp]?.icon || '📍'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors leading-snug">{stop.name}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{stop.zone}</p>
{null}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); setQrOpen(true); }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,.06)', color: '#475569' }}
            title="QR Code arrêt">
            ⬛
          </button>
          <button onClick={onFav}
            className="flex items-center justify-center text-lg transition-all hover:scale-125 active:scale-90"
            style={{ color: isFav ? '#facc15' : '#1e293b', minWidth: 40, minHeight: 40 }}>
            {isFav ? '⭐' : '☆'}
          </button>
        </div>
      </div>
      {qrOpen && <QRCodeStop stopId={stop.id} stopName={stop.name} onClose={() => setQrOpen(false)} />}

      {/* Bouton M'y guider */}
      {onGuide && (
        <button
          onClick={e => { e.stopPropagation(); onGuide(stop); }}
          className="w-full mt-2 mb-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95"
          style={{ minHeight: 40, background: `${opColor}18`, border: `1px solid ${opColor}30`, color: opColor }}>
          🚶 M'y guider
        </button>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {stop.operators.map(op => (
          <span key={op} className="text-[11px] font-black px-2 py-0.5 rounded-full text-white"
            style={{ background: OPERATORS[op]?.color || '#64748b' }}>{op}</span>
        ))}
      </div>

      {visibleDeps.length > 0 && (
        <div className="space-y-1.5 pt-2.5" style={{ borderTop: '1px solid var(--c-border)' }}>
          <div className="text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: '#334155' }}>
            Prochains passages
          </div>
          {visibleDeps.map((d, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-[11px] font-black text-white px-2 py-1 rounded-lg flex-shrink-0"
                style={{ background: d.color, minWidth: 46, textAlign: 'center' }}>{d.lineName}</span>
              <span className="text-xs flex-1 truncate" style={{ color: '#64748b' }}>
                {d.route.split('↔')[1]?.trim() || d.route}
              </span>
              <WaitChip waitMin={d.waitMin} time={d.time} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nearby stop distance ──────────────────────────────────────
function haverDist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Main component ────────────────────────────────────────────
type ViewMode = 'all' | 'near' | 'fav';

export default function StopsPage() {
  const dispatch = useAppDispatch();
  const { selectedOperator, userLocation } = useAppSelector(s => s.mobility);
  const { stopIds: favIds } = useAppSelector(s => s.favorites);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDesc, setReportDesc] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // Retour Android → ferme modal signalement
  usePopBack(useCallback(() => setShowReportModal(false), []), showReportModal);

  const submitStopReport = useCallback(() => {
    const loc: [number, number] = userLocation ?? [14.693, -17.447];
    dispatch(addReport({
      id: `stoprep-${Date.now()}`,
      type: 'other' as any,
      description: reportDesc.trim() || 'Arrêt manquant ou mal positionné',
      location: loc,
      timestamp: Date.now(),
      upvotes: 0,
    }));
    dispatch(showToast({ type: 'success', message: '📍 Signalement envoyé — merci !' }));
    setReportSent(true);
    setTimeout(() => { setShowReportModal(false); setReportDesc(''); setReportSent(false); }, 1800);
  }, [dispatch, reportDesc, userLocation]);

  // Retour arrière → ferme le détail de l'arrêt
  usePopBack(useCallback(() => setExpandedId(null), []), !!expandedId);
  const [pullY, setPullY] = useState(0);
  const pullStart = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const onPullStart = useCallback((e: React.TouchEvent) => {
    if ((listRef.current?.scrollTop ?? 0) === 0) {
      pullStart.current = e.touches[0].clientY;
    }
  }, []);

  const onPullMove = useCallback((e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 0) setPullY(Math.min(dy * 0.45, 64));
  }, []);

  const onPullEnd = useCallback(() => {
    if (pullY > 48) triggerRefresh();
    pullStart.current = null;
    setPullY(0);
  }, [pullY, triggerRefresh]);

  // Filter by operator
  let base = selectedOperator === 'all' ? STOPS : STOPS.filter(s => s.operators.includes(selectedOperator as OperatorId));

  // Apply view mode
  let stops = base;
  if (view === 'fav') {
    stops = base.filter(s => favIds.includes(s.id));
  } else if (view === 'near' && userLocation) {
    stops = base
      .map(s => ({ s, d: haverDist(userLocation[0], userLocation[1], s.lat, s.lng) }))
      .filter(x => x.d < 2000)
      .sort((a, b) => a.d - b.d)
      .slice(0, 20)
      .map(x => x.s);
  }

  // Fuzzy search (uses existing utility)
  if (search.trim()) {
    stops = searchStops(search, stops, userLocation?.[0], userLocation?.[1]);
  }

  const handleClick = useCallback((stop: typeof STOPS[0]) => {
    dispatch(setSelectedStop(stop.id));
    dispatch(setMapCenter([stop.lat, stop.lng]));
    dispatch(setMapZoom(16));
    setExpandedId(id => id === stop.id ? null : stop.id);
  }, [dispatch]);

  const tabs: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'all',  label: 'Tous',    icon: '📍' },
    { id: 'near', label: 'Proches', icon: '🧭' },
    { id: 'fav',  label: 'Favoris', icon: '⭐' },
  ];

  return (
    <div className="flex flex-col h-full relative">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: '#475569' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (fuzzy : 'parc', 'gye', 'lib6'…)"
            className="input pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'rgba(255,255,255,.1)', color: '#64748b' }}>✕</button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--c-border)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className="flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
              style={view === tab.id
                ? { background: '#2563eb', color: 'white', boxShadow: '0 2px 10px rgba(37,99,235,.4)', minHeight: 40 }
                : { color: '#475569', minHeight: 40 }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: '#475569' }}>
            {stops.length} arrêt{stops.length > 1 ? 's' : ''}
            {view === 'near' && !userLocation && <span style={{ color: '#dc2626' }}> · GPS requis</span>}
          </span>
          {view === 'near' && userLocation && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,.1)', color: '#34d399', border: '1px solid rgba(16,185,129,.2)' }}>
              🧭 Dans 2 km
            </span>
          )}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div className="flex-shrink-0 flex justify-center items-center transition-all"
          style={{ height: refreshing ? 40 : pullY, overflow: 'hidden' }}>
          <div className={`text-xl ${refreshing ? 'animate-spin' : ''}`} style={{ opacity: refreshing || pullY > 24 ? 1 : 0.3 }}>
            {refreshing ? '🔄' : '↓'}
          </div>
        </div>
      )}

      {/* Bouton flottant : Reporter un arrêt */}
      <button
        onClick={() => setShowReportModal(true)}
        className="absolute bottom-28 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,.1)', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
        📍 Signaler un arrêt
      </button>

      {/* Modal signalement arrêt */}
      {showReportModal && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div className="w-full rounded-t-3xl p-6 space-y-4 animate-slide-up"
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none' }}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,.15)' }} />
            <h3 className="font-black text-white text-lg">📍 Signaler un arrêt</h3>
            <p className="text-sm" style={{ color: '#64748b' }}>
              {userLocation ? `📡 Position GPS : ${userLocation[0].toFixed(5)}, ${userLocation[1].toFixed(5)}` : '⚠️ GPS non disponible — votre position approx. sera utilisée'}
            </p>
            <textarea
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              placeholder="Décrivez le problème (ex: arrêt manquant, panneau cassé, coordonnées inexactes…)"
              rows={3}
              className="input w-full resize-none"
              style={{ fontSize: 13, padding: '12px 14px' }}
            />
            {reportSent ? (
              <div className="text-center py-3 font-black text-emerald-400">✅ Envoyé — merci pour votre contribution !</div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold btn btn-ghost">Annuler</button>
                <button onClick={submitStopReport}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,.4)' }}>
                  📤 Envoyer le signalement
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-24 space-y-2"
        style={{ scrollbarWidth: 'none' }}
        onTouchStart={onPullStart}
        onTouchMove={onPullMove}
        onTouchEnd={onPullEnd}>
        {stops.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{view === 'fav' ? '⭐' : view === 'near' ? '🧭' : '📍'}</div>
            <p className="font-bold text-sm text-white">
              {view === 'fav' ? 'Aucun favori' : view === 'near' ? 'Aucun arrêt proche (GPS ?)' : 'Aucun arrêt'}
            </p>
            {search && <p className="text-xs mt-1" style={{ color: '#475569' }}>Essayez une autre orthographe</p>}
            {view === 'fav' && !search && (
              <p className="text-xs mt-1" style={{ color: '#475569' }}>Appuyez sur ☆ dans un arrêt pour l'ajouter</p>
            )}
          </div>
        ) : stops.flatMap((stop, idx) => {
          const cards: React.ReactNode[] = [
            <StopCard
              key={stop.id}
              stop={stop}
              isFav={favIds.includes(stop.id)}
              showAllDeps={expandedId === stop.id}
              onClick={() => handleClick(stop)}
              onFav={e => { e.stopPropagation(); dispatch(toggleFavStop(stop.id)); }}
              onGuide={s => window.dispatchEvent(new CustomEvent('open-walk-guide', { detail: s }))}
            />
          ];
          // Insère une AdCard après chaque 10e arrêt, uniquement en vue "Tous"
          if (view === 'all' && (idx + 1) % 10 === 0) {
            const ad = selectAd({ format: 'card', zone: stop.zone });
            if (ad) cards.push(
              <AdCard key={`ad_${idx}`} ad={ad} />
            );
          }
          return cards;
        })}
      </div>
    </div>
  );
}
