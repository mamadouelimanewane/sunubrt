import React, { useState } from 'react';
import { getYangoZone, openYango } from '@/data/transportData';

interface Props {
  stopId: string;
  compact?: boolean;
}

export default function YangoConnect({ stopId, compact = false }: Props) {
  const zone = getYangoZone(stopId);
  const [tapped, setTapped] = useState(false);

  if (!zone) return null;

  function handleTap() {
    setTapped(true);
    openYango(zone!);
    setTimeout(() => setTapped(false), 3000);
  }

  if (compact) {
    return (
      <button
        onClick={handleTap}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: tapped ? '#ff3d00' : '#fff3f0',
          border: '0.5px solid #ff3d00',
          borderRadius: 20,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          color: tapped ? '#fff' : '#ff3d00',
          transition: 'all .2s',
        }}
      >
        🚖 Yango {tapped ? '— ouverture…' : `~${zone.estimatedWaitMin} min`}
      </button>
    );
  }

  return (
    <div style={{
      background: '#fff3f0',
      border: '0.5px solid rgba(255,61,0,.25)',
      borderRadius: 14,
      padding: '12px 14px',
      marginTop: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>🚖</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#cc2e00' }}>Yango disponible ici</div>
          <div style={{ fontSize: 11, color: '#7a3a2a' }}>Pôle d'échange BRT — last mile</div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: '#ff3d00',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 20,
        }}>
          ~{zone.estimatedWaitMin} min
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#7a3a2a', marginBottom: 10, lineHeight: 1.5 }}>
        {zone.yangoPickupLabel}
      </div>

      <button
        onClick={handleTap}
        disabled={tapped}
        style={{
          width: '100%',
          padding: '10px',
          background: tapped ? '#cc2e00' : '#ff3d00',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          cursor: tapped ? 'default' : 'pointer',
          transition: 'background .2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {tapped ? '⏳ Ouverture Yango…' : '🚖 Réserver un Yango depuis cette gare'}
      </button>

      <div style={{ fontSize: 11, color: '#9a6a5a', marginTop: 6, textAlign: 'center' }}>
        Ouvre l'app Yango avec votre position BRT pré-remplie
      </div>
    </div>
  );
}
