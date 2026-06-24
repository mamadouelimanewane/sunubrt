/**
 * AdManagerPage.tsx — Régie publicitaire SunuBus (onglet Admin)
 * Gestion des campagnes, analytics temps réel, création / pause.
 */

import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setAdOverride, addCampaign } from '@/store/store';
import { AD_CAMPAIGNS } from '@/data/ads';
import type { AdCampaign, AdCategory, AdStatus } from '@/data/ads';
import { getAdStats, getTotalAdRevenue, getTotalImpressions, getTotalClicks } from '@/services/adEngine';

// ── Helpers ───────────────────────────────────────────────────────
function fmtFcfa(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' M FCFA';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' k FCFA';
  return n + ' FCFA';
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}

const CATEGORY_LABELS: Record<AdCategory, { label: string; emoji: string; color: string }> = {
  finance:    { label: 'Finance',    emoji: '💳', color: '#1da1f2' },
  telecom:    { label: 'Télécom',    emoji: '📡', color: '#ef4444' },
  retail:     { label: 'Commerce',   emoji: '🛒', color: '#f97316' },
  transport:  { label: 'Transport',  emoji: '🚖', color: '#7c3aed' },
  civic:      { label: 'Civique',    emoji: '🌿', color: '#059669' },
  food:       { label: 'Alimentaire',emoji: '🍽️', color: '#f59e0b' },
};

const STATUS_LABELS: Record<AdStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',     color: '#34d399', bg: 'rgba(52,211,153,.15)' },
  paused:    { label: 'En pause',   color: '#fbbf24', bg: 'rgba(251,191,36,.15)' },
  scheduled: { label: 'Planifiée',  color: '#60a5fa', bg: 'rgba(96,165,250,.15)' },
  completed: { label: 'Terminée',   color: '#94a3b8', bg: 'rgba(148,163,184,.15)' },
};

function daysLeft(endDate: number) {
  const d = Math.ceil((endDate - Date.now()) / 86_400_000);
  return d > 0 ? d : 0;
}

// ── Gauge ─────────────────────────────────────────────────────────
function Gauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black w-8 text-right" style={{ color: '#64748b' }}>{pct}%</span>
    </div>
  );
}

// ── Campaign Detail Modal ─────────────────────────────────────────
function CampaignModal({ ad, onClose }: { ad: AdCampaign; onClose: () => void }) {
  const dispatch  = useAppDispatch();
  const overrides = useAppSelector(s => s.ads.overrides);
  const stats     = getAdStats(ad.id);
  const effectiveStatus = overrides[ad.id] || ad.status;
  const cat = CATEGORY_LABELS[ad.category];
  const statusCfg = STATUS_LABELS[effectiveStatus];

  const toggleStatus = () => {
    dispatch(setAdOverride({
      id:     ad.id,
      status: effectiveStatus === 'active' ? 'paused' : 'active',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="px-6 py-5 flex items-start gap-4"
          style={{ background: `linear-gradient(135deg, ${ad.bgColor}, ${ad.accentColor}08)`, borderBottom: '1px solid var(--c-border)' }}>
          <div className="text-4xl mt-1">{ad.logo}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-white text-base">{ad.advertiser}</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: `${cat.color}15`, color: cat.color }}>
                {cat.emoji} {cat.label}
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-1">{ad.title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{ad.body}</p>
          </div>
          <button onClick={onClose} className="text-lg flex-shrink-0" style={{ color: '#475569' }}>✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 text-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,120px),1fr))' }}>
            {[
              { label: 'Impressions', value: fmtNum(stats.impr), icon: '👁' },
              { label: 'Clics',       value: fmtNum(stats.clks), icon: '👆' },
              { label: 'CTR',         value: stats.ctr + '%',    icon: '📊' },
              { label: 'Revenus',     value: fmtFcfa(stats.rev), icon: '💰' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--c-border)' }}>
                <div className="text-lg">{s.icon}</div>
                <div className="font-black text-white text-sm mt-1">{s.value}</div>
                <div className="text-[9px]" style={{ color: '#334155' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Budget & dates */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--c-border)' }}>
            <div className="text-[10px] font-black" style={{ color: '#475569' }}>BUDGET & PÉRIODE</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span style={{ color: '#475569' }}>Budget total : </span><strong className="text-white">{fmtFcfa(ad.budgetFcfa)}</strong></div>
              <div><span style={{ color: '#475569' }}>CPM : </span><strong className="text-white">{ad.cpmFcfa > 0 ? fmtFcfa(ad.cpmFcfa) : 'Gratuit'}</strong></div>
              <div><span style={{ color: '#475569' }}>Revenus générés : </span><strong style={{ color: '#34d399' }}>{fmtFcfa(stats.rev)}</strong></div>
              <div><span style={{ color: '#475569' }}>Jours restants : </span><strong className="text-white">{daysLeft(ad.endDate)}j</strong></div>
            </div>
            <div>
              <div className="text-[10px] mb-1" style={{ color: '#334155' }}>
                Impressions : {fmtNum(stats.impr)} / {fmtNum(ad.maxImpressions)}
              </div>
              <Gauge value={stats.impr} max={ad.maxImpressions} color={ad.accentColor} />
            </div>
            <div>
              <div className="text-[10px] mb-1" style={{ color: '#334155' }}>
                Budget consommé : {fmtFcfa(stats.rev)} / {fmtFcfa(ad.budgetFcfa)}
              </div>
              <Gauge value={stats.rev} max={ad.budgetFcfa} color="#f59e0b" />
            </div>
          </div>

          {/* Targeting */}
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--c-border)' }}>
            <div className="text-[10px] font-black mb-2" style={{ color: '#475569' }}>CIBLAGE</div>
            <div className="flex flex-wrap gap-2">
              {ad.targeting.hours && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(96,165,250,.12)', color: '#60a5fa' }}>
                  🕐 {ad.targeting.hours[0]}h–{ad.targeting.hours[1]}h
                </span>
              )}
              {ad.targeting.days && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(251,191,36,.12)', color: '#fbbf24' }}>
                  📅 {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].filter((_,i) => ad.targeting.days!.includes(i)).join(', ')}
                </span>
              )}
              {ad.targeting.zones?.map(z => (
                <span key={z} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(52,211,153,.12)', color: '#34d399' }}>
                  📍 {z}
                </span>
              ))}
              {ad.targeting.lines?.map(l => (
                <span key={l} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(167,139,250,.12)', color: '#a78bfa' }}>
                  🚌 {l}
                </span>
              ))}
              {ad.targeting.operators?.map(op => (
                <span key={op} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,.12)', color: '#fbbf24' }}>
                  🏢 {op}
                </span>
              ))}
              {Object.keys(ad.targeting).length === 0 && (
                <span className="text-[10px]" style={{ color: '#334155' }}>Audience universelle (pas de ciblage)</span>
              )}
            </div>
          </div>

          {/* Format */}
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: '#475569' }}>Format :</span>
            <span className="font-black px-2 py-0.5 rounded-full"
              style={{ background: `${ad.accentColor}15`, color: ad.accentColor }}>
              {ad.format === 'banner' ? '📌 Bannière' : ad.format === 'card' ? '🃏 Card native' : '📺 Interstitiel'}
            </span>
            <span style={{ color: '#475569' }}>Priorité :</span>
            <span className="font-black text-white">P{ad.priority}</span>
            <span style={{ color: '#475569' }}>Freq. cap :</span>
            <span className="font-black text-white">{ad.freqCap}× / session</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={toggleStatus}
              className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={effectiveStatus === 'active'
                ? { background: 'rgba(251,191,36,.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.25)' }
                : { background: 'rgba(52,211,153,.15)', color: '#34d399', border: '1px solid rgba(52,211,153,.25)' }}>
              {effectiveStatus === 'active' ? '⏸ Mettre en pause' : '▶ Réactiver'}
            </button>
            <button
              onClick={() => window.open(ad.ctaUrl, '_blank')}
              className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={{ background: `${ad.accentColor}18`, color: ad.accentColor, border: `1px solid ${ad.accentColor}30` }}>
              🔗 Voir la destination
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Ad Modal ───────────────────────────────────────────────
function CreateAdModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [advertiser, setAdvertiser] = useState('');
  const [title, setTitle] = useState('');
  const [geoTarget, setGeoTarget] = useState('');

  const handleSave = () => {
    if (!advertiser || !title) return;
    const newAd: AdCampaign = {
      id: 'custom_' + Date.now(),
      advertiser,
      logo: '⭐',
      tagline: 'Annonce locale',
      category: 'retail',
      title,
      body: 'Description de la publicité...',
      ctaLabel: 'En savoir plus',
      ctaUrl: 'https://sunubus.sn',
      accentColor: '#10b981',
      bgColor: 'rgba(16,185,129,.12)',
      format: 'card',
      geoTarget: geoTarget || undefined,
      targeting: {},
      startDate: Date.now(),
      endDate: Date.now() + 30 * 86400000,
      budgetFcfa: 100000,
      spentFcfa: 0,
      cpmFcfa: 1000,
      maxImpressions: 100000,
      status: 'active',
      priority: 2,
      freqCap: 2,
    };
    dispatch(addCampaign(newAd));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-5 animate-fade-up"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
        <h2 className="font-black text-white text-lg mb-4">Nouvelle Campagne</h2>
        <div className="space-y-3">
          <input className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
            placeholder="Annonceur (ex: Wave)" value={advertiser} onChange={e => setAdvertiser(e.target.value)} />
          <input className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
            placeholder="Titre de la publicité" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
            placeholder="Ciblage géo (Commune ou Ligne)" value={geoTarget} onChange={e => setGeoTarget(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold transition-all">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: '#10b981' }}>Créer</button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdManagerPage ────────────────────────────────────────────
export default function AdManagerPage() {
  const dispatch  = useAppDispatch();
  const adsState  = useAppSelector(s => s.ads);
  const overrides = adsState.overrides;

  const [categoryFilter, setCategoryFilter] = useState<AdCategory | 'all'>('all');
  const [statusFilter,   setStatusFilter]   = useState<AdStatus | 'all'>('all');
  const [selectedAd,     setSelectedAd]     = useState<AdCampaign | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);

  // Applique les surcharges admin au status effectif
  const campaigns = useMemo(() =>
    [...AD_CAMPAIGNS, ...adsState.customCampaigns].map(ad => ({
      ...ad,
      status: (overrides[ad.id] || ad.status) as AdStatus,
    })),
    [overrides, adsState.customCampaigns]
  );

  const filtered = useMemo(() => campaigns.filter(ad => {
    if (categoryFilter !== 'all' && ad.category !== categoryFilter) return false;
    if (statusFilter !== 'all'   && ad.status   !== statusFilter)   return false;
    return true;
  }), [campaigns, categoryFilter, statusFilter]);

  // KPIs globaux
  const totalRev  = getTotalAdRevenue();
  const totalImpr = getTotalImpressions();
  const totalClks = getTotalClicks();
  const globalCtr = totalImpr > 0 ? ((totalClks / totalImpr) * 100).toFixed(1) : '0.0';
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {selectedAd && (
        <CampaignModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
      )}
      {showCreate && (
        <CreateAdModal onClose={() => setShowCreate(false)} />
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Header KPIs */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-black text-white">Régie Publicitaire</h2>
              <p className="text-[11px]" style={{ color: '#475569' }}>
                {activeCampaigns} campagne{activeCampaigns > 1 ? 's' : ''} active{activeCampaigns > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)}
                className="px-3 rounded-xl flex items-center justify-center text-xs font-black transition-all active:scale-95 text-white"
                style={{ background: '#10b981', boxShadow: '0 4px 12px rgba(16,185,129,.3)' }}>
                + Nouvelle
              </button>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(251,191,36,.15)', border: '1px solid rgba(251,191,36,.25)' }}>
                📢
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: '💰', label: 'Revenus pub',    value: fmtFcfa(totalRev),  color: '#fbbf24' },
              { icon: '👁',  label: 'Impressions',   value: fmtNum(totalImpr),  color: '#60a5fa' },
              { icon: '👆', label: 'Clics totaux',   value: fmtNum(totalClks),  color: '#34d399' },
              { icon: '📊', label: 'CTR global',     value: globalCtr + '%',    color: '#a78bfa' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
                <div className="text-lg">{k.icon}</div>
                <div className="font-black text-lg" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[9px] mt-0.5" style={{ color: '#334155' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 space-y-2">
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black transition-all"
              style={categoryFilter === 'all'
                ? { background: '#7c3aed', color: '#fff' }
                : { background: 'rgba(255,255,255,.05)', color: '#475569', border: '1px solid var(--c-border)' }}>
              Toutes catégories
            </button>
            {(Object.entries(CATEGORY_LABELS) as [AdCategory, typeof CATEGORY_LABELS[AdCategory]][]).map(([key, cat]) => (
              <button key={key}
                onClick={() => setCategoryFilter(key)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black transition-all whitespace-nowrap"
                style={categoryFilter === key
                  ? { background: cat.color, color: '#fff' }
                  : { background: 'rgba(255,255,255,.05)', color: '#475569', border: '1px solid var(--c-border)' }}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex gap-1.5 overflow-x-auto">
            {(['all', 'active', 'paused', 'scheduled', 'completed'] as const).map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black transition-all"
                style={statusFilter === s
                  ? { background: s === 'all' ? '#475569' : STATUS_LABELS[s].color, color: '#fff' }
                  : { background: 'rgba(255,255,255,.04)', color: '#475569', border: '1px solid var(--c-border)' }}>
                {s === 'all' ? `Tous statuts (${campaigns.length})` : `${STATUS_LABELS[s].label} (${campaigns.filter(c => c.status === s).length})`}
              </button>
            ))}
          </div>
          <div className="text-[10px]" style={{ color: '#334155' }}>
            {filtered.length} campagne{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Campaign list */}
        <div className="px-4 space-y-2">
          {filtered.map(ad => {
            const stats   = getAdStats(ad.id);
            const cat     = CATEGORY_LABELS[ad.category];
            const stCfg   = STATUS_LABELS[ad.status];
            const budgetPct = ad.budgetFcfa > 0 ? Math.min(100, Math.round((stats.rev / ad.budgetFcfa) * 100)) : 0;

            return (
              <div key={ad.id}
                onClick={() => setSelectedAd(ad)}
                className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[.99]"
                style={{
                  background: 'var(--c-surface)',
                  border: `1px solid ${ad.status === 'active' ? ad.accentColor + '30' : 'var(--c-border2)'}`,
                }}>
                <div className="flex items-start gap-3">
                  {/* Logo */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: ad.bgColor }}>
                    {ad.logo}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white text-sm">{ad.advertiser}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: stCfg.bg, color: stCfg.color }}>{stCfg.label}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${cat.color}12`, color: cat.color }}>{cat.emoji}</span>
                      {ad.geoTarget && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(139,92,246,.15)', color: '#a78bfa' }}>📍 Géociblé : {ad.geoTarget}</span>
                      )}
                    </div>

                    <div className="text-[11px] mt-0.5 truncate" style={{ color: '#64748b' }}>{ad.title}</div>

                    {/* Stats inline */}
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <span className="text-[10px]" style={{ color: '#475569' }}>
                        👁 <strong className="text-white">{fmtNum(stats.impr)}</strong>
                      </span>
                      <span className="text-[10px]" style={{ color: '#475569' }}>
                        👆 <strong className="text-white">{fmtNum(stats.clks)}</strong>
                      </span>
                      <span className="text-[10px]" style={{ color: '#475569' }}>
                        CTR <strong style={{ color: parseFloat(stats.ctr) > 1 ? '#34d399' : '#f87171' }}>{stats.ctr}%</strong>
                      </span>
                      <span className="text-[10px]" style={{ color: '#475569' }}>
                        💰 <strong style={{ color: '#fbbf24' }}>{fmtFcfa(stats.rev)}</strong>
                      </span>
                      <span className="text-[10px]" style={{ color: '#334155' }}>
                        📅 J−{daysLeft(ad.endDate)}
                      </span>
                    </div>

                    {/* Budget bar */}
                    {ad.budgetFcfa > 0 && (
                      <div className="mt-2">
                        <Gauge value={stats.rev} max={ad.budgetFcfa} color={ad.accentColor} />
                      </div>
                    )}
                  </div>

                  {/* Quick toggle */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      dispatch(setAdOverride({
                        id:     ad.id,
                        status: ad.status === 'active' ? 'paused' : 'active',
                      }));
                    }}
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90"
                    style={ad.status === 'active'
                      ? { background: 'rgba(52,211,153,.12)', color: '#34d399' }
                      : { background: 'rgba(251,191,36,.12)', color: '#fbbf24' }}>
                    {ad.status === 'active' ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue summary at bottom */}
        <div className="px-4 mt-4">
          <div className="rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, rgba(251,191,36,.1), rgba(245,158,11,.05))', border: '1px solid rgba(251,191,36,.2)' }}>
            <div className="text-[10px] font-black mb-3" style={{ color: '#d97706' }}>REVENUS PAR ANNONCEUR</div>
            <div className="space-y-2">
              {campaigns
                .map(ad => ({ ad, rev: getAdStats(ad.id).rev }))
                .sort((a, b) => b.rev - a.rev)
                .map(({ ad, rev }) => (
                  <div key={ad.id} className="flex items-center gap-2">
                    <span className="text-sm flex-shrink-0">{ad.logo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white truncate">{ad.advertiser}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                        <div className="h-full rounded-full" style={{
                          width: totalRev > 0 ? `${Math.round((rev / totalRev) * 100)}%` : '0%',
                          background: ad.accentColor,
                        }} />
                      </div>
                      <span className="text-[10px] font-black w-20 text-right" style={{ color: '#94a3b8' }}>
                        {fmtFcfa(rev)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: '1px solid rgba(251,191,36,.15)' }}>
              <span className="text-xs font-black" style={{ color: '#d97706' }}>TOTAL RÉGIE</span>
              <span className="text-base font-black" style={{ color: '#fbbf24' }}>{fmtFcfa(totalRev)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
