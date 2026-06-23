import React, { useState, useEffect } from 'react';
import type { Stop } from '@/types';
import { getNextDepartures, OPERATORS, getYangoZone, openYango } from '@/data/transportData';
import { useAppDispatch } from '@/store/hooks';
import { setRouteOrigin, setRouteDestination, setActiveTab } from '@/store/store';

// Couleurs fixes dark — le popup est toujours sombre sur la carte claire
const BG      = '#0f172a';
const SURFACE = '#1e293b';
const BORDER  = 'rgba(255,255,255,.10)';
const TEXT    = '#f1f5f9';
const MUTED   = '#94a3b8';

function LiveCountdown({ waitMin }: { waitMin: number }) {
  const [secs, setSecs] = useState(waitMin * 60);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  if (secs <= 0) return <span style={{ color: '#4ade80', fontWeight: 900 }}>Maint.</span>;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const color = secs <= 180 ? '#4ade80' : secs <= 600 ? '#fbbf24' : MUTED;
  return <span style={{ color, fontWeight: 900 }}>{m > 0 ? `${m}m${String(s).padStart(2,'0')}` : `${s}s`}</span>;
}

export default function StopPopup({ stop }: { stop: Stop }) {
  const dispatch = useAppDispatch();
  const [pressed, setPressed] = useState<'origin' | 'dest' | null>(null);
  const [yangoTapped, setYangoTapped] = useState(false);
  const deps = getNextDepartures(stop.id).slice(0, 3);
  const mainOp = stop.operators[0];
  const accent = OPERATORS[mainOp]?.color || '#2563eb';
  const yangoZone = getYangoZone(stop.id);

  function handleYango() {
    if (!yangoZone) return;
    setYangoTapped(true);
    openYango(yangoZone);
    setTimeout(() => setYangoTapped(false), 3000);
  }

  const handleOrigin = () => {
    setPressed('origin');
    dispatch(setRouteOrigin(stop));
    dispatch(setActiveTab('plan'));
  };
  const handleDest = () => {
    setPressed('dest');
    dispatch(setRouteDestination(stop));
    dispatch(setActiveTab('plan'));
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: BG, borderRadius: 16, overflow: 'hidden', minWidth: 230, maxWidth: 270 }}>

      {/* Barre couleur opérateur */}
      <div style={{ height: 4, background: accent }} />

      {/* En-tête arrêt */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + '25',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            📍
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, lineHeight: 1.3 }}>{stop.name}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{stop.zone}</div>
          </div>
        </div>

        {/* Badges opérateurs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {stop.operators.map(op => (
            <span key={op} style={{
              background: OPERATORS[op]?.color || '#475569', color: 'white',
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
            }}>{op}</span>
          ))}
{/* TER connection removed — BRT only */}
        </div>
      </div>

      {/* ── Boutons Départ / Arrivée ────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={handleOrigin} style={{
          flex: 1, padding: '9px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: pressed === 'origin' ? '#059669' : 'rgba(5,150,105,.22)',
          color: pressed === 'origin' ? '#fff' : '#34d399',
          fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all .15s', boxShadow: pressed === 'origin' ? '0 0 0 2px #059669' : 'none',
        }}>
          <span style={{ fontSize: 14 }}>🟢</span> Départ
        </button>
        <button onClick={handleDest} style={{
          flex: 1, padding: '9px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: pressed === 'dest' ? '#dc2626' : 'rgba(220,38,38,.22)',
          color: pressed === 'dest' ? '#fff' : '#f87171',
          fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all .15s', boxShadow: pressed === 'dest' ? '0 0 0 2px #dc2626' : 'none',
        }}>
          <span style={{ fontSize: 14 }}>🔴</span> Arrivée
        </button>
      </div>

      {/* ── Yango last mile (pôles uniquement) ─────────────── */}
      {yangoZone && (
        <div style={{ padding: '10px 14px 0', borderBottom: `1px solid ${BORDER}` }}>
          <button
            onClick={handleYango}
            style={{
              width: '100%', padding: '9px 10px', borderRadius: 10,
              background: yangoTapped ? '#cc2e00' : 'rgba(255,61,0,.18)',
              border: '1px solid rgba(255,61,0,.35)',
              color: yangoTapped ? '#fff' : '#ff3d00',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .2s', marginBottom: 10,
            }}
          >
            🚖 {yangoTapped ? 'Ouverture Yango…' : `Yango depuis ici — ~${yangoZone.estimatedWaitMin} min`}
          </button>
        </div>
      )}

      {/* ── Prochains passages ──────────────────────────────── */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
          Prochains passages
        </div>
        {deps.length === 0 ? (
          <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '6px 0' }}>Aucun départ</div>
        ) : (
          deps.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < deps.length - 1 ? 7 : 0 }}>
              <div style={{
                background: d.color, color: 'white', fontSize: 9, fontWeight: 800,
                padding: '3px 7px', borderRadius: 6, flexShrink: 0, minWidth: 48, textAlign: 'center',
              }}>{d.lineName}</div>
              <span style={{ fontSize: 11, color: MUTED, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {d.route.split('↔')[1]?.trim() || d.route}
              </span>
              <LiveCountdown waitMin={d.waitMin} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
