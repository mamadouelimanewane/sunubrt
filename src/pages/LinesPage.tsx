import React, { useState, useMemo } from 'react';
import LineChatPanel from '@/components/LineChatPanel';
import { usePopBack } from '@/hooks/usePopBack';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setFocusedLine, clearFocusedLine, setActiveTab,
  toggleFavLine, visitLine, setMapCenter, setMapZoom, setSelectedStop,
  setRouteOrigin, setRouteDestination,
} from '@/store/store';
import { LINES, STOPS, OPERATORS, getNextDepartures, getAffluence } from '@/data/transportData';
import { buildStopTimings, searchLinesByStop } from '@/utils/lineUtils';
import type { Line, BusPosition } from '@/types';

// ── Search mode toggle ─────────────────────────────────────────
type SearchMode = 'line' | 'stop';

// ── Compact line card (list view) ─────────────────────────────
function LineCard({ line, busCount, isFav, isRecent, onSelect, onFav }: {
  line: Line; busCount: number; isFav: boolean; isRecent: boolean;
  onSelect: () => void; onFav: () => void;
}) {
  const op = OPERATORS[line.operator];
  // Départ et destination depuis les arrêts terminus
  const termA = STOPS.find(s => s.id === line.stops[0]);
  const termZ = STOPS.find(s => s.id === line.stops[line.stops.length - 1]);
  const depart = termA?.name ?? line.stops[0] ?? '—';
  const arrivee = termZ?.name ?? line.stops[line.stops.length - 1] ?? '—';

  return (
    <div className="flex items-stretch rounded-2xl overflow-hidden card mb-2 transition-all hover:border-white/15 active:scale-[.98] cursor-pointer group"
      onClick={onSelect}>
      {/* Color bar */}
      <div className="w-1.5 flex-shrink-0 rounded-l-2xl" style={{ background: line.color }} />

      <div className="flex-1 flex items-center gap-3 px-3 py-3">
        <div className="flex-1 min-w-0">
          {/* Ligne 1 : nom + opérateur + badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-white text-sm group-hover:text-blue-300 transition-colors">{line.name}</span>
            <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: op?.color }}>{line.operator}</span>
            {isRecent && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(250,204,21,.15)', color: '#fbbf24' }}>Récent</span>}
          </div>

          {/* Ligne 2 : Départ → Destination */}
          <div className="flex items-center gap-1.5 mb-1 w-full">
            <span className="text-[11px] font-bold truncate flex-1 min-w-0" style={{ color: '#e2e8f0' }}>{depart}</span>
            <span className="flex-shrink-0" style={{ color: line.color, fontSize: 11, fontWeight: 900 }}>→</span>
            <span className="text-[11px] font-bold truncate flex-1 min-w-0" style={{ color: '#e2e8f0' }}>{arrivee}</span>
          </div>

          {/* Ligne 3 : méta */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold" style={{ color: '#475569' }}>{line.freq}</span>
            <span style={{ color: '#1e293b', fontSize: 10 }}>·</span>
            <span className="text-[10px] font-bold" style={{ color: line.color }}>{line.tarif} FCFA</span>
            <span style={{ color: '#1e293b', fontSize: 10 }}>·</span>
            <span className="text-[10px]" style={{ color: '#475569' }}>{line.stops.length} arrêts</span>
          </div>
        </div>

        {/* Droite : bus live + favori */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {busCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(74,222,128,.1)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80', animation: 'live-pulse 2s infinite' }} />
              <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>{busCount} bus</span>
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); onFav(); }}
            className="flex items-center justify-center text-lg transition-all active:scale-90 flex-shrink-0"
            style={{ color: isFav ? '#f87171' : '#64748b', minWidth: 40, minHeight: 40 }}>
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
      <div className="flex items-center px-2" style={{ color: '#475569', fontSize: 18 }}>›</div>
    </div>
  );
}

// ── Stop row inside line detail ────────────────────────────────
function StopRow({ idx, stop, cumMin, isTerminus, distFromPrev, isNearUser, busOnStop, onTap }: {
  idx: number; stop: any; cumMin: number; isTerminus: boolean;
  distFromPrev: number; isNearUser: boolean; busOnStop: boolean; onTap: () => void;
}) {
  return (
    <button onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all active:scale-[.98] group"
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Index + connector */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 28 }}>
        {!isTerminus && idx > 1 && (
          <div className="w-0.5 h-2 -mt-1 mb-1" style={{ background: 'rgba(255,255,255,.1)' }} />
        )}
        <div className={`flex items-center justify-center font-black text-xs rounded-full flex-shrink-0 ${isTerminus ? 'w-7 h-7 border-2' : 'w-5 h-5'}`}
          style={isTerminus
            ? { background: 'var(--c-bg)', borderColor: 'rgba(255,255,255,.3)', color: 'white' }
            : { background: 'rgba(255,255,255,.08)', color: '#64748b' }}>
          {isTerminus ? (idx === 1 ? 'A' : 'Z') : idx}
        </div>
        {!isTerminus && (
          <div className="w-0.5 h-2 mt-1" style={{ background: 'rgba(255,255,255,.1)' }} />
        )}
      </div>

      {/* Stop info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isTerminus ? 'font-black text-white' : 'font-medium'} truncate group-hover:text-blue-300 transition-colors`}
            style={!isTerminus ? { color: '#cbd5e1' } : {}}>
            {stop.name}
          </span>
          {isNearUser && <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: 'rgba(37,99,235,.2)', color: '#60a5fa' }}>📍 Proche</span>}
          {busOnStop && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'live-pulse 2s infinite' }} />}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: '#334155' }}>
          {stop.zone}{distFromPrev > 0 ? ` · ${distFromPrev < 1000 ? `${distFromPrev} m` : `${(distFromPrev / 1000).toFixed(1)} km`}` : ''}
        </div>
      </div>

      {/* Time */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-black" style={{ color: cumMin === 0 ? '#4ade80' : 'white' }}>
          {cumMin === 0 ? 'Départ' : `+${cumMin} min`}
        </div>
      </div>
    </button>
  );
}

// ── Line detail panel ─────────────────────────────────────────
function LineDetail({ lineId, onBack, onShowMap }: { lineId: string; onBack: () => void; onShowMap?: () => void }) {
  const dispatch = useAppDispatch();
  const { busPositions, userLocation } = useAppSelector(s => s.mobility);
  const { lineIds: favIds } = useAppSelector(s => s.favorites);

  const [chatOpen, setChatOpen] = useState(false);
  const line = LINES.find(l => l.id === lineId);
  if (!line) return null;

  const op = OPERATORS[line.operator];
  const timings = useMemo(() => buildStopTimings(line), [lineId]);
  const liveBuses = busPositions.filter((b: BusPosition) => b.lineId === lineId);
  const isFav = favIds.includes(lineId);
  const afflu = getAffluence(lineId);

  const focusStop = (stop: any) => {
    dispatch(setSelectedStop(stop.id));
    dispatch(setMapCenter([stop.lat, stop.lng]));
    dispatch(setMapZoom(16));
    // NE PAS changer l'onglet — on reste sur Lignes
  };

  const planFromLine = () => {
    const first = timings[0]?.stop;
    const last  = timings[timings.length - 1]?.stop;
    if (first && last) {
      dispatch(setRouteOrigin(first));
      dispatch(setRouteDestination(last));
      dispatch(setActiveTab('plan'));   // ← intentionnel : on quitte Lignes pour Planifier
    }
  };

  const isNearUser = (stop: any) => {
    if (!userLocation) return false;
    const d = Math.sqrt((stop.lat - userLocation[0]) ** 2 + (stop.lng - userLocation[1]) ** 2);
    return d < 0.004; // ~400m
  };

  const busOnStop = (stopId: string) => liveBuses.some((b: BusPosition) => {
    const closestStop = timings.reduce((a, t) =>
      Math.abs(b.lat - t.stop.lat) + Math.abs(b.lng - t.stop.lng) <
      Math.abs(b.lat - a.stop.lat) + Math.abs(b.lng - a.stop.lng) ? t : a
    );
    return closestStop.stop.id === stopId;
  });

  const totalMin = timings[timings.length - 1]?.cumMin ?? 0;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 text-xs font-bold w-full text-left transition-colors"
          style={{ color: '#64748b', borderBottom: '1px solid var(--c-border)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
          ← Toutes les lignes
        </button>

        <div className="px-4 pt-4 pb-3" style={{ background: `linear-gradient(160deg, ${line.color}25 0%, transparent 100%)`, borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: line.color }} />
                <h2 className="text-xl font-black text-white">{line.name}</h2>
                {op && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: op.color }}>{line.operator}</span>}
              </div>
              <p className="text-sm" style={{ color: '#64748b' }}>{line.route}</p>
            </div>
            <button onClick={() => dispatch(toggleFavLine(lineId))}
              className="text-2xl mt-1 transition-all hover:scale-125 active:scale-90 flex-shrink-0"
              style={{ color: isFav ? '#f87171' : '#1e293b' }}>
              {isFav ? '❤️' : '🤍'}
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: totalMin, u: 'min', l: 'Durée' },
              { v: line.tarif, u: 'F', l: 'Tarif' },
              { v: timings.length, u: '', l: 'Arrêts' },
              { v: line.freq, u: '', l: 'Fréq.' },
            ].map((s, i) => (
              <div key={i} className="text-center py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.05)' }}>
                <div className="text-sm font-black text-white leading-none">{s.v}<span className="text-[11px] ml-0.5" style={{ color: '#475569' }}>{s.u}</span></div>
                <div className="text-[11px] mt-0.5 font-medium" style={{ color: '#334155' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live buses + affluence */}
        {(liveBuses.length > 0 || afflu) && (
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)', background: 'rgba(255,255,255,.02)' }}>
            {liveBuses.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80', animation: 'live-pulse 2s infinite' }} />
                <span className="text-xs font-bold" style={{ color: '#4ade80' }}>{liveBuses.length} bus en circulation</span>
                <span className="text-xs" style={{ color: '#334155' }}>· moy. {Math.round(liveBuses.reduce((a, b) => a + b.speed, 0) / liveBuses.length)} km/h</span>
              </div>
            ) : (
              <span className="text-xs" style={{ color: '#334155' }}>Aucun bus actif</span>
            )}
            {afflu && (
              <span className="badge" style={{ background: afflu.color + '20', color: afflu.color, border: `1px solid ${afflu.color}30`, fontSize: 10 }}>
                {afflu.emoji} {afflu.level}
              </span>
            )}
          </div>
        )}

        {/* Live bus chips */}
        {liveBuses.length > 0 && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
            {liveBuses.map((b: BusPosition, i: number) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
                style={{ background: line.color + '18', border: `1px solid ${line.color}30` }}>
                <span className="text-sm">🚌</span>
                <div>
                  <div className="text-[10px] font-black text-white">{b.speed} km/h</div>
                  <div className="text-[11px]" style={{ color: '#64748b' }}>{b.occupancy}% plein</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stop list */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 pb-2 pt-1">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#334155' }}>
            Arrêts de la ligne ({timings.length})
          </p>
        </div>
        {timings.map(({ stop, index, cumMin, isTerminus, distFromPrev }) => (
          <StopRow
            key={stop.id}
            idx={index} stop={stop} cumMin={cumMin}
            isTerminus={isTerminus} distFromPrev={distFromPrev}
            isNearUser={isNearUser(stop)}
            busOnStop={busOnStop(stop.id)}
            onTap={() => focusStop(stop)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 space-y-2" style={{ borderTop: '1px solid var(--c-border)' }}>
        {/* CTA principal : planifier depuis terminus */}
        <button onClick={planFromLine}
          className="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
          style={{ background: `linear-gradient(135deg,${line.color},${line.color}cc)`, boxShadow: `0 6px 20px ${line.color}40`, fontSize: 14 }}>
          🚌 Prendre cette ligne — Planifier
        </button>
        <div className="flex gap-2">
          <button onClick={() => { dispatch(setFocusedLine(lineId)); onShowMap?.(); }}
            className="flex-1 btn btn-ghost">
            🗺️ Voir sur la carte
          </button>
          <button onClick={() => setChatOpen(true)}
            className="btn btn-ghost flex items-center gap-1 px-3"
            style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.2)', color: '#60a5fa' }}>
            💬 Aide
          </button>
        </div>
        {/* Alerte retard SMS */}
        <button
          onClick={() => {
            const msg = `Alerte retard ligne ${line.name} (${line.route}). Informez-moi si retard > 10 min. Merci. — SunuBus`;
            window.open(`sms:?body=${encodeURIComponent(msg)}`, '_self');
          }}
          className="w-full py-3 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.2)', color: '#fbbf24' }}>
          📩 Recevoir une alerte retard par SMS
        </button>
      </div>
      {chatOpen && <LineChatPanel lineId={lineId} lineName={line.name} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

// ── Main LinesPage ─────────────────────────────────────────────
export default function LinesPage({ onShowMap }: { onShowMap?: () => void } = {}) {
  const dispatch = useAppDispatch();
  const { selectedOperator, busPositions } = useAppSelector(s => s.mobility);
  const { lineIds: favIds, recentLines } = useAppSelector(s => s.favorites);

  const [search, setSearch]         = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('line');
  const [favsOnly, setFavsOnly]     = useState(false);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // Retour depuis le détail de ligne → retour à la liste
  usePopBack(() => { setSelectedLine(null); dispatch(clearFocusedLine()); }, !!selectedLine);

  // Direct line search
  const directLines = useMemo(() => {
    let lines = selectedOperator === 'all' ? LINES : LINES.filter(l => l.operator === selectedOperator);
    if (search) {
      const q = search.toLowerCase();
      lines = lines.filter(l => l.name.toLowerCase().includes(q) || l.route.toLowerCase().includes(q));
    }
    if (favsOnly) lines = lines.filter(l => favIds.includes(l.id));
    return lines;
  }, [search, selectedOperator, favsOnly, favIds]);

  // Inverse stop search
  const stopSearchResults = useMemo(() =>
    searchMode === 'stop' ? searchLinesByStop(search) : [],
    [search, searchMode]
  );

  const busCount = (lineId: string) =>
    busPositions.filter((b: BusPosition) => b.lineId === lineId).length;

  const handleSelectLine = (lineId: string) => {
    dispatch(visitLine(lineId));
    setSelectedLine(lineId); // ouvre LineDetail d'abord, l'utilisateur peut ensuite taper "📍 Carte"
  };

  // ── Line detail view ───────────────────────────────────────
  if (selectedLine) {
    return (
      <LineDetail
        lineId={selectedLine}
        onBack={() => { setSelectedLine(null); dispatch(clearFocusedLine()); }}
        onShowMap={onShowMap}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────
  const groups = Array.from(new Set(directLines.map(l => l.operator)));
  const recentLineDatas = recentLines.map(id => LINES.find(l => l.id === id)).filter(Boolean) as Line[];

  return (
    <div className="flex flex-col h-full">

      {/* Search bar + mode toggle */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: '#475569' }}>
            {searchMode === 'line' ? '🔍' : '📍'}
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={searchMode === 'line' ? 'Nom de ligne (ex: DDD 12, C2…)' : 'Nom d\'arrêt ou quartier (ex: Liberté, Yoff…)'}
            className="input pl-9" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'rgba(255,255,255,.1)', color: '#64748b' }}>✕</button>
          )}
        </div>

        {/* Mode + filters row */}
        <div className="flex items-center gap-2">
          {/* Search mode toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-xl flex-shrink-0" style={{ background: 'var(--c-surface)' }}>
            <button onClick={() => setSearchMode('line')}
              className="px-3 py-2 rounded-lg text-xs font-black transition-all"
              style={searchMode === 'line'
                ? { background: '#2563eb', color: 'white', minHeight: 40 }
                : { color: '#475569', minHeight: 40 }}>
              🚌 Ligne
            </button>
            <button onClick={() => setSearchMode('stop')}
              className="px-3 py-2 rounded-lg text-xs font-black transition-all"
              style={searchMode === 'stop'
                ? { background: '#059669', color: 'white', minHeight: 40 }
                : { color: '#475569', minHeight: 40 }}>
              📍 Arrêt
            </button>
          </div>

          <div className="flex-1" />

          <button onClick={() => setFavsOnly(!favsOnly)}
            className="text-xs font-bold px-3 py-2 rounded-xl transition-all"
            style={favsOnly
              ? { background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)', minHeight: 40 }
              : { color: '#475569', minHeight: 40 }}>
            {favsOnly ? '❤️' : '🤍'} Favoris
          </button>
        </div>

        {/* Count */}
        <p className="text-[10px] font-semibold" style={{ color: '#334155' }}>
          {searchMode === 'stop' && search
            ? `${stopSearchResults.length} ligne${stopSearchResults.length > 1 ? 's' : ''} via cet arrêt`
            : `${directLines.length} ligne${directLines.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">

        {/* Stop-based search results */}
        {searchMode === 'stop' && search && (
          <>
            {stopSearchResults.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#1e293b' }}>
                <div className="text-4xl mb-2">🚏</div>
                <p className="font-bold text-sm">Aucune ligne pour cet arrêt</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Group by matched stop */}
                {Array.from(new Set(stopSearchResults.map(r => r.matchedStop.id))).map(stopId => {
                  const results = stopSearchResults.filter(r => r.matchedStop.id === stopId);
                  const stop = results[0].matchedStop;
                  return (
                    <div key={stopId} className="mb-4">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-sm">📍</span>
                        <span className="text-xs font-black text-white">{stop.name}</span>
                        <span className="text-[10px]" style={{ color: '#334155' }}>{stop.zone}</span>
                      </div>
                      {results.map(({ line }) => (
                        <LineCard key={line.id} line={line}
                          busCount={busCount(line.id)} isFav={favIds.includes(line.id)}
                          isRecent={recentLines.includes(line.id)}
                          onSelect={() => handleSelectLine(line.id)}
                          onFav={() => dispatch(toggleFavLine(line.id))} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Direct search / normal list */}
        {searchMode === 'line' && (
          <>
            {/* Recent lines */}
            {!search && !favsOnly && recentLineDatas.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#334155' }}>
                  Récemment consultées
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {recentLineDatas.map(line => (
                    <button key={line.id} onClick={() => handleSelectLine(line.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all active:scale-95"
                      style={{ background: line.color + '20', border: `1px solid ${line.color}35` }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: line.color }} />
                      <span className="text-xs font-black text-white">{line.name}</span>
                      {busCount(line.id) > 0 && <span className="text-[11px] font-bold" style={{ color: '#4ade80' }}>{busCount(line.id)} 🚌</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite lines */}
            {!search && !favsOnly && favIds.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#334155' }}>Favoris</p>
                {LINES.filter(l => favIds.includes(l.id)).map(line => (
                  <LineCard key={line.id} line={line}
                    busCount={busCount(line.id)} isFav={true} isRecent={recentLines.includes(line.id)}
                    onSelect={() => handleSelectLine(line.id)}
                    onFav={() => dispatch(toggleFavLine(line.id))} />
                ))}
              </div>
            )}

            {/* All / filtered lines — grille colonnes par opérateur */}
            {directLines.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#1e293b' }}>
                <div className="text-4xl mb-2">🚌</div>
                <p className="font-bold text-sm">Aucune ligne</p>
              </div>
            ) : (
              /* Colonnes : BRT | DDD */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16, alignItems: 'start' }}>
                {/* Colonne BRT */}
                {(() => {
                  const opLines = directLines.filter(l => l.operator === 'BRT');
                  if (!opLines.length) return null;
                  const op = OPERATORS['BRT'];
                  return (
                    <div key="BRT">
                      <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: `2px solid ${op?.color}40` }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: op?.color }} />
                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: op?.color }}>{op?.fullName || 'BRT'}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: op?.color + '20', color: op?.color }}>{opLines.length}</span>
                      </div>
                      {opLines.map(line => (
                        <LineCard key={line.id} line={line} busCount={busCount(line.id)}
                          isFav={favIds.includes(line.id)} isRecent={recentLines.includes(line.id)}
                          onSelect={() => handleSelectLine(line.id)}
                          onFav={() => dispatch(toggleFavLine(line.id))} />
                      ))}
                    </div>
                  );
                })()}

                {/* Colonne DDD */}
                {(() => {
                  const opLines = directLines.filter(l => l.operator === 'DDD');
                  if (!opLines.length) return null;
                  const op = OPERATORS['DDD'];
                  return (
                    <div key="DDD">
                      <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: `2px solid ${op?.color}40` }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: op?.color }} />
                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: op?.color }}>{op?.fullName || 'DDD'}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: op?.color + '20', color: op?.color }}>{opLines.length}</span>
                      </div>
                      {opLines.map(line => (
                        <LineCard key={line.id} line={line} busCount={busCount(line.id)}
                          isFav={favIds.includes(line.id)} isRecent={recentLines.includes(line.id)}
                          onSelect={() => handleSelectLine(line.id)}
                          onFav={() => dispatch(toggleFavLine(line.id))} />
                      ))}
                    </div>
                  );
                })()}
                {null /* TER and AFTU columns removed */}
                {(() => { return null;
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
