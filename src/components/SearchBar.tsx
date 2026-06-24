import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { STOPS } from '@/data/transportData';
import { searchLocal, searchLocationIQ, getContextualSuggestions, type SearchResult } from '@/utils/placeSearch';
import { CATEGORY_META } from '@/data/dakarPlaces';
import type { Stop } from '@/types';

interface Props {
  placeholder?: string;
  onSelect: (stop: Stop) => void;
  value?: Stop | null;
  className?: string;
}

// Quand un lieu est sélectionné, on retourne l'arrêt le plus proche comme Stop
function makeVirtualStop(r: SearchResult): Stop | null {
  if (r.type === 'stop' && r.stop) return r.stop;
  if (r.nearestStop) return r.nearestStop;
  if (r.type === 'ai' && r.aiLat != null && r.aiLng != null) {
    // Retourner l'arrêt le plus proche
    return r.nearestStop || null;
  }
  return null;
}

// Nom affiché dans l'input après sélection
function displayName(r: SearchResult): string {
  if (r.type === 'stop' && r.stop) return r.stop.name;
  if (r.type === 'place' && r.place) return r.place.name;
  if (r.type === 'ai') return r.aiName || '';
  return '';
}

// ── Suggestion row ────────────────────────────────────────────
function ResultRow({ r, onSelect, isLast }: { r: SearchResult; onSelect: () => void; isLast: boolean }) {
  const mainName = r.type === 'stop' ? r.stop!.name
    : r.type === 'place' ? r.place!.name
    : r.aiName || '';
  const subName  = r.type === 'stop' ? `${r.stop!.zone} · ${r.stop!.lines.length} lignes`
    : r.type === 'place' ? `${r.place!.commune || r.place!.category}`
    : r.aiType || 'Lieu';
  const nearestLabel = (r.type === 'place' || r.type === 'ai') && r.nearestStop
    ? `Arrêt : ${r.nearestStop.name}${r.walkMin ? ` · ~${r.walkMin} min à pied` : ''}`
    : null;
  const emoji = r.categoryEmoji || '📍';
  const color = r.categoryColor || '#64748b';

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
      style={{ borderBottom: !isLast ? '1px solid var(--c-border)' : 'none' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Icon */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base mt-0.5"
        style={{ background: color + '20' }}>
        {emoji}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{mainName}</p>
        <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--c-muted)' }}>{subName}</p>
        {nearestLabel && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#475569' }}>🚏 {nearestLabel}</p>
        )}
      </div>

      {/* Category badge */}
      <span className="flex-shrink-0 text-[11px] font-black px-1.5 py-0.5 rounded-md self-start mt-0.5"
        style={{ background: color + '20', color }}>
        {r.categoryLabel}
      </span>
    </button>
  );
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-2.5 pb-1">
      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#334155' }}>{label}</span>
    </div>
  );
}

// ── Main SearchBar ─────────────────────────────────────────────
export default function SearchBar({ placeholder = 'Rechercher un arrêt ou un lieu…', onSelect, value, className = '' }: Props) {
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [localResults, setLocal]  = useState<SearchResult[]>([]);
  const [aiResults, setAI]        = useState<SearchResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string>('');

  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { userLocation } = useAppSelector(s => s.mobility);
  const { stopIds: favStopIds } = useAppSelector(s => s.favorites);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Run search when query changes
  useEffect(() => {
    if (!query.trim()) { setLocal([]); setAI([]); return; }

    // Recherche locale immédiate
    const loc = searchLocal(query, userLocation?.[0], userLocation?.[1], 5);
    setLocal(loc);

    // LocationIQ avec debounce 400ms
    if (aiTimer.current) clearTimeout(aiTimer.current);
    setAiLoading(true);
    aiTimer.current = setTimeout(async () => {
      const ai = await searchLocationIQ(query);
      // Filtrer les doublons avec les résultats locaux
      const localNames = new Set(loc.map(r => (r.stop?.name || r.place?.name || '').toLowerCase()));
      const filtered   = ai.filter(r => !localNames.has((r.aiName || '').toLowerCase()));
      setAI(filtered);
      setAiLoading(false);
    }, 400);

    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [query, userLocation]);

  const contextual = !query && !value
    ? getContextualSuggestions(favStopIds, userLocation?.[0], userLocation?.[1])
    : [];

  const handleSelect = useCallback((r: SearchResult) => {
    const stop = makeVirtualStop(r);
    if (!stop) return;
    const name = displayName(r);
    setSelectedName(name);
    setQuery('');
    setOpen(false);
    setLocal([]); setAI([]);
    inputRef.current?.blur();
    onSelect(stop);
  }, [onSelect]);

  const handleClear = () => {
    onSelect(null as any);
    setQuery(''); setSelectedName('');
    setLocal([]); setAI([]);
    inputRef.current?.focus();
  };

  // Valeur affichée : nom du lieu sélectionné, ou valeur du stop, ou query en cours
  const displayValue = value
    ? (selectedName || value.name)
    : query;

  const hasResults = localResults.length > 0 || aiResults.length > 0 || contextual.length > 0;
  const showDropdown = open && (hasResults || aiLoading);

  // Stops dans les résultats locaux
  const stopResults  = localResults.filter(r => r.type === 'stop');
  const placeResults = localResults.filter(r => r.type !== 'stop');

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setSelectedName(''); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input pr-10"
          style={{ paddingLeft: '0.875rem' }}
          autoComplete="off"
          spellCheck={false}
        />
        {(value || query) ? (
          <button onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,.1)', color: '#94a3b8' }}>✕</button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: '#475569' }}>🔍</span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-[9999] animate-fade-up"
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border2)',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: 'min(70vh, 420px)',
            overflowY: 'auto',
          }}>

          {/* Suggestions contextuelles (sans requête) */}
          {contextual.length > 0 && !query && (
            <>
              {favStopIds.length > 0 && <SectionHeader label="⭐ Favoris & À proximité" />}
              {contextual.map((r, i) => (
                <ResultRow key={i} r={r} onSelect={() => handleSelect(r)} isLast={i === contextual.length - 1 && placeResults.length === 0 && aiResults.length === 0} />
              ))}
            </>
          )}

          {/* Arrêts */}
          {stopResults.length > 0 && (
            <>
              <SectionHeader label="🚏 Arrêts de bus" />
              {stopResults.map((r, i) => (
                <ResultRow key={i} r={r} onSelect={() => handleSelect(r)} isLast={i === stopResults.length - 1 && placeResults.length === 0 && aiResults.length === 0} />
              ))}
            </>
          )}

          {/* Lieux locaux */}
          {placeResults.length > 0 && (
            <>
              <SectionHeader label="📍 Lieux & Quartiers" />
              {placeResults.map((r, i) => (
                <ResultRow key={i} r={r} onSelect={() => handleSelect(r)} isLast={i === placeResults.length - 1 && aiResults.length === 0} />
              ))}
            </>
          )}

          {/* Résultats IA LocationIQ */}
          {(aiResults.length > 0 || aiLoading) && (
            <>
              <SectionHeader label={aiLoading ? '🤖 Recherche IA…' : '🤖 Suggestions IA'} />
              {aiLoading && (
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background:'#7c3aed', animation:`bounce 1s ${i*0.15}s infinite` }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color:'#475569' }}>Interrogation de l'IA…</span>
                </div>
              )}
              {aiResults.map((r, i) => (
                <ResultRow key={i} r={r} onSelect={() => handleSelect(r)} isLast={i === aiResults.length - 1} />
              ))}
            </>
          )}

          {/* Aucun résultat */}
          {query && !aiLoading && localResults.length === 0 && aiResults.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm font-bold text-white">Aucun résultat pour « {query} »</p>
              <p className="text-xs mt-1" style={{ color:'#475569' }}>Essayez un nom de quartier, marché, hôpital…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
