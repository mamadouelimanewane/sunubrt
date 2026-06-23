import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavStop, toggleFavLine, logout, setRouteOrigin, setRouteDestination, setActiveTab, toggleDarkMode, setTheme, setAutoTheme, setNotifEnabled, toggleA11yMode, setLang, BADGES_DEF } from '@/store/store';
import type { AppTheme } from '@/store/store';
import { STOPS, LINES, OPERATORS } from '@/data/transportData';
import type { Lang } from '@/types';
import { ConfettiBurst, WeeklyObjectives, Leaderboard } from '@/components/Gamification';

const LEVEL_CONFIG = {
  bronze:   { label: 'Bronze',   color: '#cd7f32', emoji: '🥉', next: 80,  bar: '#cd7f32' },
  silver:   { label: 'Argent',   color: '#94a3b8', emoji: '🥈', next: 200, bar: '#94a3b8' },
  gold:     { label: 'Or',       color: '#fbbf24', emoji: '🥇', next: 500, bar: '#fbbf24' },
  platinum: { label: 'Platine',  color: '#a78bfa', emoji: '💎', next: 999, bar: '#a78bfa' },
};

// ── Toggle switch ──────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all"
      style={{ background: value ? '#2563eb' : 'rgba(255,255,255,.12)' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: value ? 'calc(100% - 22px)' : 2 }} />
    </button>
  );
}

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { tripCount, totalFCFA, co2SavedKg, favOperator, stopIds, lineIds } = useAppSelector(s => s.favorites);
  const { myTickets } = useAppSelector(s => s.tickets);
  const { name } = useAppSelector(s => s.auth);
  const { history } = useAppSelector(s => s.journey);
  const { darkMode, theme, autoTheme, notifEnabled, a11yMode, lang } = useAppSelector(s => s.ui);
  const [tab, setTab] = useState<'stats' | 'badges' | 'history' | 'favs' | 'settings'>('stats');
  const [confettiActive, setConfettiActive] = useState(false);
  const { points, badges, level } = useAppSelector(s => s.gamif);
  const lvlCfg = LEVEL_CONFIG[level];
  const nextThreshold = lvlCfg.next;
  const lvlPct = Math.min(100, (points / nextThreshold) * 100);

  const handleNotifToggle = async (v: boolean) => {
    if (v) {
      if (!('Notification' in window)) { alert('Notifications non supportées'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { alert('Permission refusée'); return; }
      new Notification('SunuBus', { body: '🔔 Alertes activées ! Vous serez notifié des perturbations.', icon: '/icon-192.png' });
    }
    dispatch(setNotifEnabled(v));
  };

  const favStops  = STOPS.filter(s => stopIds.includes(s.id));
  const favLines  = LINES.filter(l => lineIds.includes(l.id));
  const valid     = myTickets.filter(t => t.status === 'valid').length;
  const ecoLevel  = co2SavedKg >= 10 ? 'Or 🥇' : co2SavedKg >= 5 ? 'Argent 🥈' : co2SavedKg > 0 ? 'Bronze 🥉' : '';
  const ecoPct    = Math.min(100, (co2SavedKg / 10) * 100);

  const handleRefaire = (rec: { originId?: string; destId?: string }) => {
    const origin = STOPS.find(s => s.id === rec.originId);
    const dest   = STOPS.find(s => s.id === rec.destId);
    if (!origin || !dest) return;
    dispatch(setRouteOrigin(origin));
    dispatch(setRouteDestination(dest));
    dispatch(setActiveTab('plan'));
  };

  return (
    <div className="overflow-y-auto pb-20">
      {/* Hero */}
      <div className="relative px-4 pt-8 pb-6 text-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg,rgba(29,78,216,.3) 0%,rgba(10,15,30,1) 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {['🚌','🚐','🚍','🚆'].map((e, i) => (
            <div key={i} className="absolute text-5xl select-none"
              style={{ opacity: .04, top: `${8+i*24}%`, left: `${i*27}%`, transform: `rotate(${i*14-16}deg)` }}>{e}</div>
          ))}
        </div>
        <div className="relative">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg,rgba(37,99,235,.3),rgba(124,58,237,.3))', border: '1.5px solid rgba(255,255,255,.1)' }}>
            👤
          </div>
          <h2 className="text-2xl font-black text-white">{name || 'Voyageur'}</h2>
          <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(147,197,253,.6)' }}>
            {favOperator ? `Fidèle ${OPERATORS[favOperator]?.fullName || favOperator}` : 'Voyageur SunuBus'}
          </p>
          {/* Level badge */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xl">{lvlCfg.emoji}</span>
            <span className="text-sm font-black" style={{ color: lvlCfg.color }}>Niveau {lvlCfg.label}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: lvlCfg.color + '20', color: lvlCfg.color }}>
              {points} pts
            </span>
          </div>
          <div className="mt-2 mx-auto max-w-[160px]">
            <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,.08)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${lvlPct}%`, background: lvlCfg.bar }} />
            </div>
            <div className="text-[11px] text-center mt-1" style={{ color: '#334155' }}>
              {points} / {nextThreshold} pts
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex px-4 gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {([['stats','📊 Stats'], ['badges','🏅 Badges'], ['history','🕐 Historique'], ['favs','⭐ Favoris'], ['settings','⚙️ Réglages']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
            style={tab === id
              ? { background: 'rgba(37,99,235,.25)', color: '#60a5fa', border: '1px solid rgba(37,99,235,.4)' }
              : { background: 'rgba(255,255,255,.04)', color: '#475569', border: '1px solid var(--c-border)' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-5">

        {/* ── STATS TAB ─────────────────────────────── */}
        {tab === 'stats' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { e:'🚌', l:'Voyages',    v: tripCount,                           u:'',      c:'#60a5fa' },
                { e:'🎫', l:'Billets',    v: valid,                               u:'valides',c:'#a78bfa' },
                { e:'💰', l:'Dépenses',   v: totalFCFA.toLocaleString('fr-FR'),    u:'FCFA',  c:'#fbbf24' },
                { e:'🌿', l:'CO₂ évité', v: co2SavedKg.toFixed(1),               u:'kg',    c:'#34d399' },
              ].map((s, i) => (
                <div key={i} className="card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.e}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#334155' }}>{s.l}</span>
                  </div>
                  <div className="font-black text-white" style={{ fontSize: 22 }}>
                    {s.v}<span className="text-xs font-semibold ml-1" style={{ color: '#475569' }}>{s.u}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Eco card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg,rgba(5,79,44,.8),rgba(6,78,59,.8))', border: '1px solid rgba(5,150,105,.2)' }}>
              <div className="p-4 flex items-start gap-4">
                <div className="text-4xl">🌍</div>
                <div className="flex-1">
                  <h4 className="font-black text-white">Impact Écologique</h4>
                  <p className="text-sm mt-0.5 font-medium" style={{ color: '#6ee7b7' }}>
                    {co2SavedKg > 0 ? `${co2SavedKg.toFixed(2)} kg CO₂ économisés` : 'Faites votre premier voyage !'}
                  </p>
                  {tripCount > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(110,231,183,.5)' }}>
                      ≈ {(tripCount * 3.2).toFixed(1)} km en voiture évités
                    </p>
                  )}
                </div>
              </div>
              {co2SavedKg > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'rgba(110,231,183,.5)' }}>
                    <span>Progression vers l'Or</span><span>{ecoPct.toFixed(0)}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,.08)' }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ background: 'linear-gradient(90deg,#059669,#34d399)', width: `${ecoPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── BADGES TAB ────────────────────────────── */}
        {tab === 'badges' && (
          <div className="space-y-4">
            {/* Confetti overlay */}
            <ConfettiBurst active={confettiActive} onDone={() => setConfettiActive(false)} />

            {/* Résumé compact */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 16,
              background: 'linear-gradient(135deg,rgba(37,99,235,.1),rgba(124,58,237,.1))',
              border: '1px solid rgba(37,99,235,.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'white' }}>{badges.length} / {BADGES_DEF.length} badges</div>
                  <div style={{ fontSize: 10, color: '#475569' }}>Touchez un badge obtenu pour célébrer !</div>
                </div>
              </div>
              <div style={{
                fontSize: 16, fontWeight: 900, color: '#a78bfa',
                padding: '4px 10px', borderRadius: 10,
                background: 'rgba(124,58,237,.15)',
              }}>
                {Math.round((badges.length / BADGES_DEF.length) * 100)}%
              </div>
            </div>

            {/* Grille des badges */}
            <div className="grid grid-cols-3 gap-2">
              {BADGES_DEF.map(def => {
                const earned = badges.find(b => b.id === def.id);
                return (
                  <div key={def.id}
                    onClick={() => { if (earned) setConfettiActive(true); }}
                    className="rounded-2xl p-3 text-center transition-all"
                    style={{
                      background: earned ? 'rgba(37,99,235,.12)' : 'rgba(255,255,255,.03)',
                      border: `1px solid ${earned ? 'rgba(37,99,235,.3)' : 'rgba(255,255,255,.06)'}`,
                      opacity: earned ? 1 : 0.45,
                      cursor: earned ? 'pointer' : 'default',
                    }}>
                    <div style={{
                      fontSize: 28, marginBottom: 4,
                      transition: 'transform 0.3s',
                      filter: earned ? 'drop-shadow(0 0 8px rgba(96,165,250,0.5))' : 'grayscale(1)',
                    }}>{def.emoji}</div>
                    <div className="text-[10px] font-black text-white leading-tight">{def.label}</div>
                    <div className="text-[11px] mt-1 font-bold" style={{ color: earned ? '#60a5fa' : '#334155' }}>
                      {earned ? `+${def.pts} pts` : `${def.pts} pts`}
                    </div>
                    {earned && (
                      <div style={{
                        fontSize: 9, marginTop: 3, fontWeight: 700,
                        color: '#22c55e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      }}>
                        <span style={{
                          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                          background: '#22c55e',
                          boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                        }} />
                        Obtenu
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Objectifs hebdomadaires */}
            <WeeklyObjectives
              tripCount={tripCount}
              reportCount={0}
              co2Kg={co2SavedKg}
            />

            {/* Classement anonyme */}
            <Leaderboard myPoints={points} myName={name || 'Voyageur'} />

            {/* Partager */}
            <button onClick={async () => {
              const text = `🚌 Mon profil SunuBus :\n${points} points · Niveau ${lvlCfg.label}\n${tripCount} voyages · ${co2SavedKg.toFixed(1)} kg CO₂ économisés\n${badges.length} badges obtenus 🏅`;
              if (navigator.share) { try { await navigator.share({ title: 'Mon profil SunuBus', text }); } catch {} }
              else { navigator.clipboard?.writeText(text); alert('Stats copiées !'); }
            }}
              className="w-full py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,rgba(37,99,235,.3),rgba(124,58,237,.3))', border: '1px solid rgba(37,99,235,.3)' }}>
              📤 Partager mes stats
            </button>
          </div>
        )}

        {/* ── HISTORY TAB ───────────────────────────── */}
        {tab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🗺️</div>
                <p className="font-bold text-sm text-white">Aucun trajet effectué</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>Vos trajets apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(rec => {
                  const canRefaire = !!(rec.originId && rec.destId);
                  const dateStr = new Date(rec.date).toLocaleDateString('fr-FR', {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <div key={rec.id} className="card rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: 'rgba(37,99,235,.12)' }}>🚌</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{rec.originName} → {rec.destName}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{dateStr}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: 'rgba(37,99,235,.15)', color: '#60a5fa' }}>
                              ⏱ {rec.duration} min
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: 'rgba(251,191,36,.1)', color: '#fbbf24' }}>
                              💰 {rec.fare} FCFA
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: 'rgba(52,211,153,.1)', color: '#34d399' }}>
                              🌿 {rec.co2} kg CO₂
                            </span>
                          </div>
                        </div>
                        {canRefaire && (
                          <button onClick={() => handleRefaire(rec)}
                            className="flex-shrink-0 text-xs font-black px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
                            style={{ background: 'rgba(37,99,235,.2)', color: '#60a5fa', border: '1px solid rgba(37,99,235,.3)' }}>
                            Refaire
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FAVS TAB ──────────────────────────────── */}
        {tab === 'favs' && (
          <>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--c-muted)' }}>
                ⭐ Arrêts favoris ({favStops.length})
              </h3>
              {favStops.length === 0 ? (
                <div className="card rounded-xl p-4 text-center text-xs" style={{ color: '#334155' }}>
                  Appuyez sur ⭐ dans Arrêts pour ajouter vos favoris
                </div>
              ) : favStops.map(s => (
                <div key={s.id} className="card rounded-xl p-3 mb-1.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{s.name}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{s.zone} · {s.operators.join(', ')}</div>
                  </div>
                  <button onClick={() => dispatch(toggleFavStop(s.id))} className="text-lg hover:scale-125 transition-transform">⭐</button>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--c-muted)' }}>
                ❤️ Lignes favorites ({favLines.length})
              </h3>
              {favLines.length === 0 ? (
                <div className="card rounded-xl p-4 text-center text-xs" style={{ color: '#334155' }}>
                  Appuyez sur 🤍 dans Lignes pour sauvegarder vos lignes
                </div>
              ) : favLines.map(l => (
                <div key={l.id} className="card rounded-xl p-3 mb-1.5 flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full" style={{ background: l.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm">{l.name}</div>
                    <div className="text-xs truncate" style={{ color: '#475569' }}>{l.route}</div>
                  </div>
                  <button onClick={() => dispatch(toggleFavLine(l.id))} className="text-lg hover:scale-125 transition-transform">❤️</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SETTINGS TAB ─────────────────────────── */}
        {tab === 'settings' && (
          <div className="space-y-3">

            {/* Appearance */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Apparence</p>
              </div>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
                <div className="text-sm font-bold mb-2" style={{ color: 'var(--c-text)' }}>Thème</div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'dark',        icon: '🌑', label: 'Sombre'  },
                    { value: 'dim',         icon: '🌓', label: 'Tamisé'  },
                    { value: 'light',       icon: '☀️', label: 'Clair'   },
                    { value: 'natural',     icon: '🌿', label: 'Jour'    },
                    { value: 'dakar-night', icon: '🌃', label: 'Dakar Night' },
                    { value: 'sahel',       icon: '🏜️', label: 'Sahel'   },
                  ] as { value: AppTheme; icon: string; label: string }[]).map(opt => {
                    const active = (theme ?? (darkMode ? 'dark' : 'light')) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { dispatch(setTheme(opt.value)); }}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: active ? 'var(--blue)' : 'var(--c-surface2)',
                          color: active ? '#fff' : 'var(--c-muted)',
                          border: active ? '1.5px solid var(--blue-l)' : '1.5px solid var(--c-border)',
                          transform: active ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span className="text-[10px] truncate max-w-full px-1">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Thème automatique</div>
                  <div className="text-[10px]" style={{ color: 'var(--c-muted)' }}>Clair 6h-19h · Sombre sinon</div>
                </div>
                <Toggle value={autoTheme} onChange={v => dispatch(setAutoTheme(v))} />
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Notifications</p>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Alertes réseau</div>
                  <div className="text-[10px]" style={{ color: 'var(--c-muted)' }}>Incidents & perturbations</div>
                </div>
                <Toggle value={notifEnabled} onChange={handleNotifToggle} />
              </div>
            </div>

            {/* Accessibilité */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <span className="text-lg">👁️</span>
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Accessibilité</p>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Haut contraste & TTS</div>
                  <div className="text-[10px]" style={{ color: 'var(--c-muted)' }}>Optimisation malvoyants & lecture vocale</div>
                </div>
                <Toggle value={a11yMode} onChange={() => dispatch(toggleA11yMode())} />
              </div>
            </div>

            {/* Language */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Langue / Làkk</p>
              </div>
              {([['fr','🇫🇷 Français'], ['wo','🇸🇳 Wolof'], ['en','🇬🇧 English']] as [Lang, string][]).map(([id, label]) => (
                <button key={id} onClick={() => dispatch(setLang(id))}
                  className="w-full px-4 py-3 flex items-center justify-between transition-all"
                  style={{ borderTop: '1px solid var(--c-border)', background: lang === id ? 'rgba(37,99,235,.08)' : 'transparent' }}>
                  <span className="text-sm font-semibold" style={{ color: lang === id ? '#60a5fa' : 'var(--c-text)' }}>{label}</span>
                  <div className="w-4 h-4 rounded-full border-2 transition-all"
                    style={{ borderColor: '#2563eb', background: lang === id ? '#2563eb' : 'transparent' }} />
                </button>
              ))}
            </div>

            {/* Driver simulation */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Simulation chauffeur</p>
              </div>
              <div className="px-4 py-3" style={{ borderTop: '1px solid var(--c-border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--c-muted)' }}>
                  Basculer en mode chauffeur pour tester le scanner QR et la déclaration d'incidents.
                </p>
                <button onClick={() => { dispatch(logout()); }}
                  className="w-full py-2.5 rounded-xl text-sm font-black transition-all active:scale-95"
                  style={{ background: 'rgba(14,165,233,.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,.2)' }}>
                  👨‍✈️ Accéder au mode Chauffeur (PIN : 1234)
                </button>
              </div>
            </div>

            {/* SOS Urgence */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Numéros d'urgence</p>
              </div>
              <div className="px-4 py-2 space-y-2" style={{ borderTop: '1px solid var(--c-border)' }}>
                {[
                  { label: 'DDD — Service client',  num: '+221 33 864 00 00', color: '#2563eb', emoji: '🚌' },
                  { label: 'BRT — Service client',   num: '+221 33 821 14 14', color: '#00b450', emoji: '🚍' },
                  { label: 'SAMU',                  num: '15',               color: '#dc2626', emoji: '🚑' },
                  { label: 'Police nationale',       num: '17',               color: '#1d4ed8', emoji: '🚔' },
                  { label: 'Sapeurs-pompiers',       num: '18',               color: '#dc2626', emoji: '🚒' },
                ].map(c => (
                  <a key={c.num} href={`tel:${c.num}`}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-95"
                    style={{ background: c.color + '10', border: `1px solid ${c.color}20` }}>
                    <span className="text-xl">{c.emoji}</span>
                    <div className="flex-1">
                      <div className="text-xs font-black text-white">{c.label}</div>
                      <div className="text-[11px] font-bold mt-0.5" style={{ color: c.color }}>{c.num}</div>
                    </div>
                    <span className="text-base" style={{ color: c.color }}>📞</span>
                  </a>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="rounded-2xl px-4 py-4 text-center" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="text-2xl mb-1">🚌</div>
              <div className="text-xs font-black text-white">SunuBus v6.0</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--c-muted)' }}>DakarBus · Simulation locale · © 2026</div>
            </div>
          </div>
        )}

        <button onClick={() => dispatch(logout())} className="btn btn-danger w-full py-3.5 rounded-2xl">
          Déconnexion ↩
        </button>
      </div>
    </div>
  );
}
