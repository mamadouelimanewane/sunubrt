import React, { useRef, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { loginPassenger, loginDriver, loginAdmin, loginFleetManager } from '../../store/store';

const DRIVER_PINS: Record<string, { name: string; lineId: string }> = {
  '1234': { name: 'Moussa Diallo',  lineId: 'L8' },
  '5678': { name: 'Ibrahima Sy',    lineId: 'BRT-L1' },
  '0000': { name: 'Chauffeur Test', lineId: 'L1A' },
};
const ADMIN_PINS: Record<string, { name: string }> = {
  'admin': { name: 'Super Admin' },
  '9999':  { name: 'Administrateur' },
};
const FLEET_DDD_PINS:  Record<string, { name: string; operator: 'DDD' | 'BRT' }> = {
  'ddd1': { name: 'Directeur Exploitation DDD', operator: 'DDD' },
  'ddd2': { name: 'Régulateur DDD',             operator: 'DDD' },
};
const FLEET_BRT_PINS: Record<string, { name: string; operator: 'DDD' | 'BRT' }> = {
  'brt1': { name: 'Coordinateur BRT',    operator: 'BRT' },
  'brt2': { name: 'Superviseur BRT',     operator: 'BRT' },
};

/* ── PIN Modal avec Glassmorphism ─────────────────────────────────────────────── */
function PinModal({ role, onClose, onSuccess }: {
  role: 'driver' | 'admin';
  onClose: () => void;
  onSuccess: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDriver = role === 'driver';
  const accent   = isDriver ? '#2563eb' : '#7c3aed';
  const hint     = isDriver ? '1234 · 5678 · 0000' : 'admin · 9999';

  const trySubmit = (p: string) => {
    const ok = isDriver ? DRIVER_PINS[p] : ADMIN_PINS[p];
    if (ok) { onSuccess(p); return; }
    setShake(true);
    setTimeout(() => { setShake(false); setPin(''); if (inputRef.current) inputRef.current.value = ''; }, 520);
  };

  const handleKey = (k: string) => {
    if (shake) return;
    if (k === 'DEL') { setPin(p => p.slice(0, -1)); return; }
    if (k === 'OK') { trySubmit(pin); return; }
    if (pin.length < 6) setPin(p => p + k);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 transition-opacity overflow-y-auto"
      style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-sm rounded-[32px] overflow-hidden animate-slide-up shadow-2xl mb-safe"
        style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>

        <div className="px-6 py-6 text-center"
          style={{ background: `linear-gradient(160deg, ${accent}40 0%, ${accent}18 100%)`, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div className="text-5xl mb-3 drop-shadow-lg">{isDriver ? '👨‍✈️' : '🛡️'}</div>
          <h2 className="text-lg font-black text-white">{isDriver ? 'Espace Chauffeur' : 'Administration'}</h2>
          <p className="text-sm mt-1 font-medium" style={{ color: accent + 'cc' }}>Code : {hint}</p>
        </div>

        <div className="px-6 pt-5 pb-3"
          style={{ animation: shake ? 'shake .5s cubic-bezier(.36,.07,.19,.97)' : 'none' }}>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Tapez votre code…"
            value={pin}
            onChange={e => { if (!shake) setPin(e.target.value.slice(0, 6)); }}
            onKeyDown={e => { if (e.key === 'Enter') trySubmit(pin); }}
            className="w-full rounded-2xl px-4 text-center font-mono font-black text-2xl tracking-widest outline-none transition-all"
            style={{
              height: 64, // Touch target minimum 48px, ici 64px pour un grand confort
              background: 'rgba(255,255,255,.08)',
              border: `2px solid ${shake ? '#f87171' : accent + '55'}`,
              color: pin.length > 0 ? accent : '#94a3b8',
              caretColor: accent,
              boxShadow: shake ? '0 0 15px rgba(248,113,113,0.3)' : 'none'
            }}
          />
          {shake && <p className="text-center text-sm text-red-400 font-bold pt-2">Code incorrect</p>}
          {!shake && <p className="text-center text-xs pt-2" style={{ color: '#64748b' }}>Tapez ici ou utilisez le pavé numérique</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 p-6 pt-2">
          {['1','2','3','4','5','6','7','8','9','DEL','0','OK'].map(k => (
            <button key={k} onClick={() => handleKey(k)}
              className="h-16 rounded-[20px] font-black text-2xl transition-all active:scale-95 select-none touch-manipulation"
              style={
                k === 'OK'  ? { background: `linear-gradient(135deg, ${accent}dd, ${accent})`, color:'white', boxShadow:`0 8px 24px ${accent}66` }
                : k === 'DEL' ? { background:'rgba(255,255,255,.05)', color:'#94a3b8', border:'1px solid rgba(255,255,255,.08)' }
                : { background:'rgba(255,255,255,.1)', color:'white', border:'1px solid rgba(255,255,255,.1)' }
              }>
              {k === 'DEL' ? '⌫' : k === 'OK' ? '✓' : k}
            </button>
          ))}
        </div>
        
        <button onClick={onClose}
          className="w-full py-5 text-sm font-bold transition-colors active:bg-white/5 touch-manipulation"
          style={{ color:'#94a3b8', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          Annuler
        </button>
      </div>

      <style>{`@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}} .mb-safe { margin-bottom: env(safe-area-inset-bottom, 16px); }`}</style>
    </div>
  );
}

/* ── Role Card ─────────────────────────────────────────────── */
function RoleCard({ icon, title, subtitle, onClick, accent, locked = false }: {
  icon: string; title: string; subtitle: string;
  onClick: () => void; accent: string; locked?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 p-5 rounded-[24px] text-left transition-all duration-300 group active:scale-[.96] touch-manipulation min-h-[80px]"
      style={{
        background: `linear-gradient(135deg, ${accent}22 0%, ${accent}08 100%)`,
        border: `1px solid ${accent}30`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 8px 32px ${accent}18`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${accent}40`; (e.currentTarget as HTMLElement).style.borderColor = `${accent}60`; (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${accent}18`; (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`; (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${accent}22 0%, ${accent}08 100%)`; }}>
      <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-3xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-inner"
        style={{ background: `${accent}33`, border: `1px solid ${accent}40` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg font-black text-white tracking-wide">{title}</div>
        <div className="text-sm mt-0.5 font-medium truncate" style={{ color: accent + 'aa' }}>{subtitle}</div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all" style={{ background: locked ? `${accent}15` : `${accent}25`, color: locked ? `${accent}80` : `${accent}` }}>
        {locked ? '🔒' : '→'}
      </div>
    </button>
  );
}

/* ── Fleet Pin Modal ─────────────────────────────────────────── */
type ModalRole = 'driver' | 'admin' | 'fleet_ddd' | 'fleet_brt';

function FleetPinModal({ operator, onClose, onSuccess }: {
  operator: 'DDD' | 'BRT';
  onClose: () => void;
  onSuccess: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = operator === 'DDD' ? '#2563eb' : '#00b450';
  const hint   = operator === 'DDD' ? 'ddd1 · ddd2' : 'brt1 · brt2';
  const PINS   = operator === 'DDD' ? FLEET_DDD_PINS : FLEET_BRT_PINS;

  const trySubmit = (p: string) => {
    if (PINS[p]) { onSuccess(p); return; }
    setShake(true);
    setTimeout(() => { setShake(false); setPin(''); if (inputRef.current) inputRef.current.value = ''; }, 520);
  };

  const handleKey = (k: string) => {
    if (shake) return;
    if (k === 'DEL') { setPin(p => p.slice(0, -1)); return; }
    if (k === 'OK') { trySubmit(pin); return; }
    if (pin.length < 8) setPin(p => p + k);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 transition-opacity overflow-y-auto"
      style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-[32px] overflow-hidden animate-slide-up shadow-2xl mb-safe"
        style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>
        <div className="px-6 py-6 text-center"
          style={{ background: `linear-gradient(160deg, ${accent}40 0%, ${accent}18 100%)`, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div className="text-5xl mb-3 drop-shadow-lg">{operator === 'DDD' ? '🚌' : '🚍'}</div>
          <h2 className="text-lg font-black text-white">Gestionnaire {operator}</h2>
          <p className="text-sm mt-1 font-medium" style={{ color: accent + 'cc' }}>Code : {hint}</p>
        </div>
        <div className="px-6 pt-5 pb-3"
          style={{ animation: shake ? 'shake .5s cubic-bezier(.36,.07,.19,.97)' : 'none' }}>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Tapez votre code…"
            value={pin}
            onChange={e => { if (!shake) setPin(e.target.value.slice(0, 8)); }}
            onKeyDown={e => { if (e.key === 'Enter') trySubmit(pin); }}
            className="w-full rounded-2xl px-4 text-center font-mono font-black text-2xl tracking-widest outline-none transition-all"
            style={{
              height: 64,
              background: 'rgba(255,255,255,.08)',
              border: `2px solid ${shake ? '#f87171' : accent + '55'}`,
              color: pin.length > 0 ? accent : '#94a3b8',
              letterSpacing: '0.2em',
              caretColor: accent,
              boxShadow: shake ? '0 0 15px rgba(248,113,113,0.3)' : 'none'
            }}
          />
          {shake && <p className="text-center text-sm text-red-400 font-bold pt-2">Code incorrect</p>}
          {!shake && <p className="text-center text-xs pt-2" style={{ color: '#64748b' }}>Tapez ici ou utilisez le pavé numérique</p>}
        </div>
        <div className="grid grid-cols-3 gap-3 p-6 pt-2">
          {['1','2','3','4','5','6','7','8','9','DEL','0','OK'].map(k => (
            <button key={k} onClick={() => handleKey(k)}
              className="h-16 rounded-[20px] font-black text-2xl transition-all active:scale-95 select-none touch-manipulation"
              style={
                k === 'OK'  ? { background: `linear-gradient(135deg, ${accent}dd, ${accent})`, color:'white', boxShadow:`0 8px 24px ${accent}66` }
                : k === 'DEL' ? { background:'rgba(255,255,255,.05)', color:'#94a3b8', border:'1px solid rgba(255,255,255,.08)' }
                : { background:'rgba(255,255,255,.1)', color:'white', border:'1px solid rgba(255,255,255,.1)' }
              }>
              {k === 'DEL' ? '⌫' : k === 'OK' ? '✓' : k}
            </button>
          ))}
        </div>
        <button onClick={onClose}
          className="w-full py-5 text-sm font-bold transition-colors active:bg-white/5 touch-manipulation"
          style={{ color:'#94a3b8', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          Annuler
        </button>
      </div>
      <style>{`@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}} .mb-safe { margin-bottom: env(safe-area-inset-bottom, 16px); }`}</style>
    </div>
  );
}

/* ── Composant Principal RoleSelection ────────────────────────────────── */
export default function RoleSelection() {
  const dispatch = useAppDispatch();
  const [modal, setModal] = useState<ModalRole | null>(null);

  const handlePin = (role: ModalRole, pin: string) => {
    if (role === 'driver') {
      const d = DRIVER_PINS[pin];
      dispatch(loginDriver({ name: d.name, lineId: d.lineId }));
    } else if (role === 'admin') {
      const a = ADMIN_PINS[pin];
      dispatch(loginAdmin({ name: a.name }));
    } else if (role === 'fleet_ddd') {
      const f = FLEET_DDD_PINS[pin];
      dispatch(loginFleetManager({ operator: 'DDD', name: f.name }));
    } else if (role === 'fleet_brt') {
      const f = FLEET_BRT_PINS[pin];
      dispatch(loginFleetManager({ operator: 'BRT', name: f.name }));
    }
    setModal(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 35% 25%, #1e3a8a 0%, #0a0f1e 55%, #150d30 100%)' }}>

      {/* Background glows plus profonds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full opacity-[.12] animate-pulse-slow"
          style={{ width:800, height:800, top:'-20%', left:'-20%', background:'radial-gradient(circle, #2563eb, transparent)', filter:'blur(100px)' }} />
        <div className="absolute rounded-full opacity-[.08]"
          style={{ width:500, height:500, bottom:'-10%', right:'-10%', background:'radial-gradient(circle, #7c3aed, transparent)', filter:'blur(80px)' }} />
        <div className="absolute rounded-full opacity-[.06]"
          style={{ width:300, height:300, top:'40%', right:'10%', background:'radial-gradient(circle, #f59e0b, transparent)', filter:'blur(60px)' }} />
      </div>

      {/* Logo repensé (premium) */}
      <div className="relative mb-10 flex flex-col items-center animate-fade-up">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-[36px] flex items-center justify-center text-6xl"
            style={{ 
              background:'linear-gradient(145deg, rgba(29,78,216,0.9), rgba(37,99,235,0.7))', 
              boxShadow:'0 32px 80px rgba(37,99,235,.6), inset 0 2px 4px rgba(255,255,255,0.3), 0 0 0 1px rgba(255,255,255,.15)',
              backdropFilter: 'blur(10px)'
            }}>
            🚌
          </div>
          <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base text-white"
            style={{ background:'linear-gradient(135deg, #059669, #10b981)', boxShadow:'0 8px 24px rgba(5,150,105,.6), inset 0 2px 4px rgba(255,255,255,0.3)' }}>✓</div>
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(to right, #ffffff, #93c5fd)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>SunuBus</h1>
        <p className="text-base mt-2 font-semibold tracking-wide" style={{ color:'rgba(147,197,253,.8)' }}>DakarBus v5 · Sénégal 🇸🇳</p>
      </div>

      {/* Role cards avec marges améliorées pour mobile */}
      <div className="w-full max-w-[400px] space-y-3.5 animate-fade-up z-10" style={{ animationDelay:'.1s' }}>
        <RoleCard
          icon="👤" title="Passager" accent="#2563eb"
          subtitle="Itinéraires · Billets · Carte live"
          onClick={() => dispatch(loginPassenger())} />
        <RoleCard
          icon="👨‍✈️" title="Chauffeur" accent="#0ea5e9" locked
          subtitle="GPS · Scanner billets · Incidents"
          onClick={() => setModal('driver')} />
        <RoleCard
          icon="🛡️" title="Administrateur" accent="#7c3aed" locked
          subtitle="Supervision réseau complète"
          onClick={() => setModal('admin')} />

        {/* Séparateur Gestionnaires de flotte */}
        <div className="flex items-center gap-4 py-3 opacity-60">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.3))' }} />
          <span className="text-[11px] font-black tracking-[0.2em] text-white">FLOTTE</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,255,255,.3))' }} />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <button onClick={() => setModal('fleet_ddd')}
            className="flex flex-col items-center p-4 rounded-[20px] transition-all duration-300 group active:scale-[.95] touch-manipulation min-h-[100px]"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0.05) 100%)', border: '1px solid rgba(37,99,235,0.3)', backdropFilter: 'blur(12px)' }}>
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🚌</span>
            <span className="font-bold text-sm text-white">DDD</span>
          </button>
          <button onClick={() => setModal('fleet_brt')}
            className="flex flex-col items-center p-4 rounded-[20px] transition-all duration-300 group active:scale-[.95] touch-manipulation min-h-[100px]"
            style={{ background: 'linear-gradient(135deg, rgba(0,180,80,0.2) 0%, rgba(0,180,80,0.05) 100%)', border: '1px solid rgba(0,180,80,0.3)', backdropFilter: 'blur(12px)' }}>
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🚍</span>
            <span className="font-bold text-sm text-white">BRT</span>
          </button>
        </div>
      </div>

      <p className="mt-10 text-xs font-medium opacity-50 animate-fade-up text-center w-full pb-4" style={{ color:'#94a3b8', animationDelay:'.2s' }}>
        v5.2 · Simulation Locale · © 2026 DakarBus
      </p>

      {/* Modals */}
      {(modal === 'driver' || modal === 'admin') && (
        <PinModal
          role={modal as 'driver' | 'admin'}
          onClose={() => setModal(null)}
          onSuccess={p => handlePin(modal!, p)} />
      )}
      {modal === 'fleet_ddd' && (
        <FleetPinModal operator="DDD" onClose={() => setModal(null)} onSuccess={p => handlePin('fleet_ddd', p)} />
      )}
      {modal === 'fleet_brt' && (
        <FleetPinModal operator="BRT" onClose={() => setModal(null)} onSuccess={p => handlePin('fleet_brt', p)} />
      )}
    </div>
  );
}
