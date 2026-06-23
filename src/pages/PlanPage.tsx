import React, { useState, useEffect, useCallback } from 'react';
import { usePopBack } from '@/hooks/usePopBack';
import { AdSlot } from '@/components/AdBanner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveTab, clearRoute, setRouteOrigin, setRouteDestination } from '@/store/store';
import RoutePanel from '@/components/RoutePanel';
import RouteMap from '@/components/RouteMap';
import WeatherWidget from '@/components/WeatherWidget';
import RecurringTripWidget from '@/components/RecurringTripWidget';
import CarpoolPanel from '@/components/CarpoolPanel';
import { STOPS, LINES, OPERATORS, getNextDepartures } from '@/data/transportData';
import type { AppDispatch } from '@/store/store';



// ── Greeting by time of day ───────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'Bonne nuit 🌙';
  if (h < 12) return 'Bonjour ☀️';
  if (h < 18) return 'Bon après-midi 🌤️';
  return 'Bonsoir 🌆';
}

// ── Live countdown ─────────────────────────────────────────────
function Countdown({ seconds }: { seconds: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setS(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  if (s <= 0) return <span style={{ color: '#4ade80', fontWeight: 900 }}>Maint.</span>;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return <span>{m > 0 ? `${m}m${String(ss).padStart(2,'0')}` : `${ss}s`}</span>;
}

// ── Favorite stop departures widget ──────────────────────────
function FavStopWidget({ stopId, onSelect }: { stopId: string; onSelect: () => void }) {
  const stop = STOPS.find(s => s.id === stopId);
  if (!stop) return null;
  const deps = getNextDepartures(stopId).slice(0, 3);
  return (
    <button onClick={onSelect}
      className="w-full text-left p-3.5 rounded-2xl transition-all active:scale-[.98]"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(37,99,235,.35)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📍</span>
          <span className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{stop.name}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(37,99,235,.15)', color: '#60a5fa' }}>{stop.zone}</span>
      </div>
      <div className="flex gap-2">
        {deps.length === 0
          ? <span className="text-xs" style={{ color: 'var(--c-muted)' }}>Aucun départ</span>
          : deps.map((d, i) => (
            <div key={i} className="flex-1 text-center py-1.5 rounded-xl"
              style={{ background: d.color + '18', border: `1px solid ${d.color}30` }}>
              <div className="text-[10px] font-black" style={{ color: d.color }}>{d.lineName}</div>
              <div className="text-[11px] font-black text-white mt-0.5">
                <Countdown seconds={d.waitMin * 60} />
              </div>
            </div>
          ))
        }
      </div>
    </button>
  );
}

// ── Transport status widget ────────────────────────────────────
function TransportStatus() {
  const h = new Date().getHours();
  const level = h >= 7 && h <= 9 ? { label: 'Heure de pointe', color: '#dc2626', emoji: '🔴', tip: 'Affluence élevée, prévoyez +15 min' }
    : h >= 17 && h <= 19 ? { label: 'Heure de pointe', color: '#dc2626', emoji: '🔴', tip: 'Trafic dense ce soir' }
    : h >= 22 || h < 5   ? { label: 'Service réduit', color: '#d97706', emoji: '🟡', tip: 'Fréquences réduites la nuit' }
    : { label: 'Service normal', color: '#059669', emoji: '🟢', tip: 'Réseau opérationnel' };

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: level.color + '12', border: `1px solid ${level.color}25` }}>
      <span className="text-lg">{level.emoji}</span>
      <div>
        <div className="text-xs font-black" style={{ color: level.color }}>{level.label}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--c-muted)' }}>{level.tip}</div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const dispatch = useAppDispatch();
  const { route, busPositions } = useAppSelector(s => s.mobility);
  const { stopIds: favStopIds, co2SavedKg } = useAppSelector(s => s.favorites);
  const { reports } = useAppSelector(s => s.tickets);
  const { history } = useAppSelector(s => s.journey);
  const { points, level } = useAppSelector(s => s.gamif);

  const hasRoute = !!(route.origin && route.destination);
  const recentAlerts = reports.filter(r => Date.now() - r.timestamp < 1000 * 60 * 30).length;
  const lastTrip = history[0];

  // Shortcut domicile ↔ travail (persisté en localStorage)
  const [homeWork, setHomeWork] = useState<{ homeId: string; workId: string } | null>(() => {
    try { const s = localStorage.getItem('sunubus_home_work'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const saveHomeWork = useCallback((homeId: string, workId: string) => {
    const val = { homeId, workId };
    setHomeWork(val);
    localStorage.setItem('sunubus_home_work', JSON.stringify(val));
  }, []);
  const [hwSetup, setHwSetup] = useState(false);
  const [carpoolOpen, setCarpoolOpen] = useState(false);
  const [tariffOpen, setTariffOpen] = useState(false);

  // Retour depuis le calculateur de tarif (fermeture accordion)
  usePopBack(() => setTariffOpen(false), tariffOpen);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-6">
        <RoutePanel />

        {/* Dynamic home content — shown only when no route */}
        {!hasRoute && (
          <div className="px-4 space-y-4 mt-2">

            {/* Smart Quick Access Row */}
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {/* Points Card */}
              <button onClick={() => dispatch(setActiveTab('profile'))}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-95"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', minWidth: '125px' }}>
                <span className="text-xl">🏅</span>
                <div>
                  <div className="text-xs font-black text-white">{points} Pts</div>
                  <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">Niveau {level}</div>
                </div>
              </button>

              {/* Live Bus Card */}
              <button onClick={() => dispatch(setActiveTab('lines'))}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-95"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', minWidth: '125px' }}>
                <span className="text-xl">⚡</span>
                <div>
                  <div className="text-xs font-black text-white">{busPositions.length || 38} En Live</div>
                  <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide">Bus opérationnels</div>
                </div>
              </button>

              {/* Alerts Card */}
              <button onClick={() => dispatch(setActiveTab('alerts'))}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-95"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', minWidth: '125px' }}>
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="text-xs font-black text-white">{reports.length} Alerte{reports.length > 1 ? 's' : ''}</div>
                  <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wide">Infos réseau</div>
                </div>
              </button>

              {/* CO2 Saved Card */}
              <button onClick={() => dispatch(setActiveTab('profile'))}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-95"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', minWidth: '125px' }}>
                <span className="text-xl">🌿</span>
                <div>
                  <div className="text-xs font-black text-white">{co2SavedKg.toFixed(1)} kg</div>
                  <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">CO₂ Économisé</div>
                </div>
              </button>
            </div>

            {/* Météo Dakar */}
            <WeatherWidget />

            {/* Transport status */}
            <TransportStatus />

            {/* Quick re-do last trip */}
            {lastTrip?.originId && lastTrip?.destId && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--c-muted)' }}>
                  Trajet récent
                </p>
                <button
                  onClick={() => {
                    const o = STOPS.find(s => s.id === lastTrip.originId);
                    const d = STOPS.find(s => s.id === lastTrip.destId);
                    if (o) dispatch(setRouteOrigin(o));
                    if (d) dispatch(setRouteDestination(d));
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[.98]"
                  style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(37,99,235,.35)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'rgba(37,99,235,.15)' }}>🔄</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black" style={{ color: 'var(--c-text)' }}>Refaire</div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--c-muted)' }}>
                      {lastTrip.originName} → {lastTrip.destName}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                    style={{ background: 'rgba(37,99,235,.15)', color: '#60a5fa' }}>{lastTrip.fare} F</span>
                </button>
              </div>
            )}

            {/* Shortcut domicile ↔ travail */}
            {homeWork && !hwSetup && (() => {
              const home = STOPS.find(s => s.id === homeWork.homeId);
              const work = STOPS.find(s => s.id === homeWork.workId);
              if (!home || !work) return null;
              return (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--c-muted)' }}>Raccourcis</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { dispatch(setRouteOrigin(home)); dispatch(setRouteDestination(work)); }}
                      className="flex items-center gap-2 p-3 rounded-2xl text-left transition-all active:scale-95"
                      style={{ background: 'rgba(5,150,105,.1)', border: '1px solid rgba(5,150,105,.25)' }}>
                      <span className="text-xl">🏠</span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black" style={{ color: '#34d399' }}>Domicile → Travail</div>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: '#475569' }}>{home.name}</div>
                      </div>
                    </button>
                    <button onClick={() => { dispatch(setRouteOrigin(work)); dispatch(setRouteDestination(home)); }}
                      className="flex items-center gap-2 p-3 rounded-2xl text-left transition-all active:scale-95"
                      style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.25)' }}>
                      <span className="text-xl">🏢</span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black" style={{ color: '#a78bfa' }}>Travail → Domicile</div>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: '#475569' }}>{work.name}</div>
                      </div>
                    </button>
                  </div>
                  <button onClick={() => setHwSetup(true)}
                    className="w-full mt-2 text-center text-xs font-bold py-3 rounded-xl transition-all"
                    style={{ color: '#334155', background: 'rgba(255,255,255,.03)' }}>
                    ✏️ Modifier domicile / travail
                  </button>
                </div>
              );
            })()}
            {(!homeWork || hwSetup) && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--c-muted)' }}>
                  {hwSetup ? '✏️ Modifier domicile / travail' : '🏠 Définir domicile & travail'}
                </p>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
                  {['home', 'work'].map((role, ri) => {
                    const currentId = role === 'home' ? homeWork?.homeId : homeWork?.workId;
                    return (
                      <div key={role} className={ri === 0 ? '' : 'border-t'} style={{ borderColor: 'var(--c-border)' }}>
                        <p className="px-3 pt-2.5 pb-1 text-[10px] font-black uppercase"
                          style={{ color: role === 'home' ? '#34d399' : '#a78bfa' }}>
                          {role === 'home' ? '🏠 Domicile' : '🏢 Travail'}
                        </p>
                        <div className="px-3 pb-2.5 max-h-28 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                          {STOPS.slice(0, 30).map(s => (
                            <button key={s.id}
                              onClick={() => {
                                const other = role === 'home' ? homeWork?.workId : homeWork?.homeId;
                                if (role === 'home') saveHomeWork(s.id, other || '');
                                else saveHomeWork(homeWork?.homeId || '', s.id);
                                if (homeWork?.homeId && homeWork?.workId) setHwSetup(false);
                              }}
                              className="w-full text-left px-3 py-3 rounded-xl text-sm transition-all"
                              style={{
                                fontWeight: currentId === s.id ? 900 : 500,
                                color: currentId === s.id ? (role === 'home' ? '#34d399' : '#a78bfa') : '#64748b',
                                background: currentId === s.id ? (role === 'home' ? 'rgba(52,211,153,.1)' : 'rgba(167,139,250,.1)') : 'transparent',
                              }}>
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hwSetup && (
                  <button onClick={() => setHwSetup(false)}
                    className="w-full mt-2 text-center text-[11px] font-black py-2 rounded-xl transition-all active:scale-95"
                    style={{ background: 'rgba(37,99,235,.12)', color: '#60a5fa' }}>
                    ✓ Fermer
                  </button>
                )}
              </div>
            )}

            {/* Favorite stops with live departures */}
            {favStopIds.length > 0 && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--c-muted)' }}>
                  Mes arrêts favoris · Prochains départs
                </p>
                <div className="space-y-2">
                  {favStopIds.slice(0, 3).map(id => (
                    <FavStopWidget key={id} stopId={id} onSelect={() => {
                      const s = STOPS.find(x => x.id === id);
                      if (s) dispatch(setRouteOrigin(s));
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Active alerts banner */}
            {recentAlerts > 0 && (
              <button
                onClick={() => dispatch(setActiveTab('alerts'))}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-[.98]"
                style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.25)' }}>
                <span className="text-xl">⚠️</span>
                <div className="flex-1 text-left">
                  <div className="text-xs font-black" style={{ color: '#f87171' }}>
                    {recentAlerts} alerte{recentAlerts > 1 ? 's' : ''} active{recentAlerts > 1 ? 's' : ''}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>Incidents signalés ces 30 dernières minutes</div>
                </div>
                <span className="text-[10px] font-bold" style={{ color: '#f87171' }}>Voir →</span>
              </button>
            )}

            {/* Trajets récurrents */}
            <RecurringTripWidget />

            {/* Calculateur de tarif multi-trajets */}
            <div>
              <button onClick={() => setTariffOpen(o => !o)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[.98]"
                style={{ background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.15)' }}>
                <span className="text-xl">💰</span>
                <div className="flex-1">
                  <div className="text-xs font-black text-white">Calculateur de tarif mensuel</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>Comparer BRT · DDD</div>
                </div>
                <span style={{ color: '#fbbf24' }}>{tariffOpen ? '▲' : '▼'}</span>
              </button>
              {tariffOpen && (() => {
                const trips = [10, 20, 30, 40];
                const tariffs = [
                  { label: 'BRT',  price: 300, color: '#00b450', emoji: '🚍' },
                  { label: 'DDD',  price: 200, color: '#2563eb', emoji: '🚌' },
                ];
                return (
                  <div className="mt-2 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(251,191,36,.15)' }}>
                    <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      <table className="w-full text-xs" style={{ minWidth: 280 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                            <th className="px-3 py-2 text-left font-black" style={{ color: '#475569' }}>Opérateur</th>
                            {trips.map(n => <th key={n} className="px-3 py-2 text-right font-black" style={{ color: '#475569' }}>{n} trajets</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {tariffs.map((t, i) => (
                            <tr key={t.label} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <span>{t.emoji}</span>
                                  <span className="font-black" style={{ color: t.color }}>{t.label}</span>
                                </div>
                                <div className="text-[11px]" style={{ color: '#334155' }}>{t.price} FCFA/trajet</div>
                              </td>
                              {trips.map(n => (
                                <td key={n} className="px-3 py-2 text-right font-bold text-white">
                                  {(t.price * n).toLocaleString('fr-FR')} F
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Covoiturage */}
            <button onClick={() => setCarpoolOpen(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[.98]"
              style={{ background: 'rgba(16,185,129,.07)', border: '1px solid rgba(16,185,129,.2)' }}>
              <span className="text-xl">🤝</span>
              <div className="flex-1">
                <div className="text-xs font-black text-white">Covoiturage informel</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>Trouvez des voyageurs sur votre trajet</div>
              </div>
              <span style={{ color: '#34d399' }}>›</span>
            </button>


            {/* Publicité discrète — tout en bas, facilement ignorable */}
            <AdSlot format="card" context={{}} className="mt-2" />

          </div>
        )}
      </div>

      {/* CarpoolPanel modal */}
      {carpoolOpen && <CarpoolPanel onClose={() => setCarpoolOpen(false)} />}
    </div>
  );
}
