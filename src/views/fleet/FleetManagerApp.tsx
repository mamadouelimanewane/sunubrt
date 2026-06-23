/**
 * FleetManagerApp.tsx
 * Gestionnaire de flotte temps réel — DDD et BRT.
 * 5 onglets : Tableau de bord · Carte live · Flotte · Lignes · Alertes
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutFleetManager, showToast } from '@/store/store';
import { LINES, OPERATORS } from '@/data/transportData';
import type { BusPosition } from '@/types';
import {
  getFleet, computeRevenue, generateIncidents, generateMessages,
  DDD_INCIDENTS_SEED, BRT_INCIDENTS_SEED,
} from '@/services/fleetSimulation';
import type {
  FleetVehicle, FleetIncident, FleetMessage, VehicleStatus,
} from '@/services/fleetSimulation';

// ── Constantes visuelles ─────────────────────────────────────────
const OP_CONFIG = {
  DDD:  { color: '#2563eb', bg: 'rgba(37,99,235,.12)', label: 'DDD',  full: 'Dakar Dem Dikk', emoji: '🚌', accent: '#60a5fa' },
  BRT:  { color: '#00b450', bg: 'rgba(0,180,80,.12)', label: 'BRT',  full: 'Bus Rapid Transit', emoji: '🚍', accent: '#86efac' },
};

const STATUS_CFG: Record<VehicleStatus, { label: string; color: string; dot: string; emoji: string }> = {
  en_service:     { label: 'En service',      color: '#10b981', dot: '#34d399', emoji: '🟢' },
  ralenti:        { label: 'Ralenti',          color: '#f59e0b', dot: '#fbbf24', emoji: '🟡' },
  arret_prolonge: { label: 'Arrêt prolongé',  color: '#f97316', dot: '#fb923c', emoji: '🟠' },
  panne:          { label: 'Panne',           color: '#ef4444', dot: '#f87171', emoji: '🔴' },
  hors_service:   { label: 'Hors service',    color: '#64748b', dot: '#94a3b8', emoji: '⚫' },
};

const SEV_CFG = {
  faible:   { color: '#f59e0b', bg: 'rgba(245,158,11,.15)',  label: 'Faible'   },
  moyen:    { color: '#f97316', bg: 'rgba(249,115,22,.15)',  label: 'Moyen'    },
  critique: { color: '#ef4444', bg: 'rgba(239,68,68,.15)',   label: 'Critique' },
};

const TABS = [
  { id: 'dashboard', icon: '📊', label: 'Tableau' },
  { id: 'map',       icon: '🗺️', label: 'Carte'   },
  { id: 'fleet',     icon: '🚌', label: 'Flotte'  },
  { id: 'lines',     icon: '📋', label: 'Lignes'  },
  { id: 'alerts',    icon: '📢', label: 'Alertes' },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Helpers ───────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' k';
  return String(n);
}
function fmtFcfa(n: number): string { return fmt(n) + ' FCFA'; }
function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)   return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  return `${Math.floor(d / 3600)}h`;
}
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Map: recenter helper ─────────────────────────────────────────
function MapAutoCenter({ positions }: { positions: BusPosition[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current && positions.length > 0) {
      const lats = positions.map(p => p.lat);
      const lngs = positions.map(p => p.lng);
      const bounds = L.latLngBounds(
        [Math.min(...lats) - 0.02, Math.min(...lngs) - 0.02],
        [Math.max(...lats) + 0.02, Math.max(...lngs) + 0.02],
      );
      map.fitBounds(bounds, { padding: [20, 20] });
      done.current = true;
    }
  }, [positions]);
  return null;
}

// ── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, trend }: {
  icon: string; label: string; value: string; sub?: string;
  color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {trend && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: trend === 'up' ? 'rgba(16,185,129,.15)' : trend === 'down' ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)',
              color: trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#94a3b8',
            }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-black" style={{ color }}>{value}</div>
        <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#475569' }}>{label}</div>
        {sub && <div className="text-[10px] mt-0.5" style={{ color: '#334155' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: VehicleStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: cfg.color + '20', color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

// ── Vehicle Card ─────────────────────────────────────────────────
function VehicleCard({ v, busPos, onMessage, onHighlight }: {
  v: FleetVehicle;
  busPos?: BusPosition;
  onMessage: (v: FleetVehicle) => void;
  onHighlight: (v: FleetVehicle) => void;
}) {
  const line = LINES.find(l => l.id === v.lineId);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: STATUS_CFG[v.status].color + '18' }}>
          {v.vehicleType === 'grand_bus' ? '🚌' : v.vehicleType === 'car_rapide' ? '🚐' : '🚎'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-white text-sm">{v.plate}</span>
            {line && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                style={{ background: line.color }}>
                {line.name}
              </span>
            )}
            <StatusBadge status={v.status} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
            👤 {v.driverName}
          </div>
        </div>
        <div className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#334155' }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Live telemetry */}
      {busPos && (
        <div className="flex gap-3 mt-2 px-1">
          <span className="text-[11px]" style={{ color: '#475569' }}>
            🚀 <strong className="text-white">{busPos.speed}</strong> km/h
          </span>
          <span className="text-[11px]" style={{ color: '#475569' }}>
            👥 <strong className="text-white">{busPos.occupancy}</strong>%
          </span>
          <span className="text-[11px]" style={{ color: '#475569' }}>
            ⏱ <strong className="text-white">{timeAgo(busPos.timestamp)}</strong>
          </span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--c-border)' }}>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div style={{ color: '#475569' }}>📞 Téléphone</div>
            <div className="font-semibold text-white">{v.driverPhone}</div>
            <div style={{ color: '#475569' }}>⛽ Carburant</div>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.1)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${v.fuelPct}%`,
                      background: v.fuelPct < 20 ? '#ef4444' : v.fuelPct < 40 ? '#f59e0b' : '#10b981',
                    }} />
                </div>
                <span className="font-semibold text-white">{v.fuelPct}%</span>
              </div>
            </div>
            <div style={{ color: '#475569' }}>🛣 KM aujourd'hui</div>
            <div className="font-semibold text-white">{v.kmToday} km</div>
            <div style={{ color: '#475569' }}>🔧 Révision il y a</div>
            <div className={`font-semibold ${v.lastMaintenanceDays > 90 ? 'text-orange-400' : 'text-white'}`}>
              {v.lastMaintenanceDays}j {v.lastMaintenanceDays > 90 ? '⚠️' : ''}
            </div>
            <div style={{ color: '#475569' }}>📅 Année</div>
            <div className={`font-semibold ${v.year < 2015 ? 'text-orange-400' : 'text-white'}`}>{v.year}</div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={e => { e.stopPropagation(); onMessage(v); }}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={{ background: 'rgba(37,99,235,.2)', color: '#60a5fa', border: '1px solid rgba(37,99,235,.3)' }}>
              💬 Message
            </button>
            <button
              onClick={e => { e.stopPropagation(); onHighlight(v); }}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={{ background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.25)' }}>
              🗺️ Localiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Revenue Bar Chart (CSS) ───────────────────────────────────────
function RevenueBar({ entries, max }: { entries: { lineName: string; amount: number }[]; max: number }) {
  return (
    <div className="space-y-2">
      {entries.slice(0, 8).map(e => (
        <div key={e.lineName} className="flex items-center gap-2">
          <div className="w-20 text-[10px] font-black text-right truncate" style={{ color: '#64748b' }}>
            {e.lineName}
          </div>
          <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.05)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((e.amount / max) * 100)}%`,
                background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
              }} />
          </div>
          <div className="text-[10px] font-black w-16 text-right" style={{ color: '#94a3b8' }}>
            {fmtFcfa(e.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Message Modal ─────────────────────────────────────────────────
function MessageModal({ vehicle, messages, onClose, onSend }: {
  vehicle: FleetVehicle;
  messages: FleetMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState('');
  const thread = messages.filter(m => m.vehicleId === vehicle.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <span className="text-2xl">💬</span>
          <div>
            <div className="font-black text-white text-sm">{vehicle.driverName}</div>
            <div className="text-[11px]" style={{ color: '#475569' }}>{vehicle.plate} · {vehicle.lineId}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-lg" style={{ color: '#475569' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          {thread.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: '#334155' }}>Aucun message échangé</div>
          )}
          {thread.map(m => (
            <div key={m.id} className={`flex ${m.direction === 'dispatch→driver' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] rounded-2xl px-3 py-2"
                style={m.direction === 'dispatch→driver'
                  ? { background: 'rgba(37,99,235,.25)', border: '1px solid rgba(37,99,235,.3)' }
                  : { background: 'rgba(255,255,255,.06)', border: '1px solid var(--c-border)' }}>
                <p className="text-xs text-white">{m.text}</p>
                <p className="text-[11px] mt-1" style={{ color: '#334155' }}>{formatTime(m.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 flex gap-2" style={{ borderTop: '1px solid var(--c-border)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onSend(input.trim()); setInput(''); } }}
            placeholder="Message au chauffeur…"
            className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--c-border)' }}
          />
          <button
            onClick={() => { if (input.trim()) { onSend(input.trim()); setInput(''); } }}
            className="px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-90"
            style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white' }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Incident Replay Modal ─────────────────────────────────────────
function IncidentReplayModal({ incident, onClose }: { incident: FleetIncident; onClose: () => void }) {
  const loc = incident.location || [14.7167, -17.4677];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const t = setInterval(() => {
      p += 1;
      if (p > 100) p = 100;
      setProgress(p);
      if (p >= 100) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, [incident.id]);

  const path: [number, number][] = [
    [loc[0] - 0.005, loc[1] - 0.005],
    [loc[0] - 0.002, loc[1] - 0.001],
    [loc[0], loc[1]], 
    [loc[0] + 0.003, loc[1] + 0.004],
  ];

  const currentIdx = Math.floor((progress / 100) * (path.length - 1));
  const currentPos = path[currentIdx];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-fade-up"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
        
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div>
            <h3 className="font-black text-lg text-white flex items-center gap-2">⏪ Replay Incident</h3>
            <p className="text-[11px]" style={{ color: 'var(--c-muted)' }}>{incident.description}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-xl transition-all hover:bg-white/10 text-white">✕</button>
        </div>

        <div className="h-64 relative bg-slate-900">
          <MapContainer center={loc as any} zoom={14} style={{ width: '100%', height: '100%' }} zoomControl={false} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <Polyline positions={path} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.5 }} />
            <CircleMarker center={currentPos as any} radius={6} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}>
              <Popup className="custom-popup">
                <div className="font-bold text-xs">{incident.vehiclePlate}</div>
              </Popup>
            </CircleMarker>
            <CircleMarker center={loc as any} radius={12} pathOptions={{ color: '#f59e0b', fillColor: 'transparent', weight: 2, dashArray: '4' }} />
          </MapContainer>
          
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-2xl p-4 border" style={{ borderColor: 'rgba(255,255,255,.1)' }}>
            <div className="flex justify-between text-[10px] font-black text-white mb-2">
              <span style={{ color: '#94a3b8' }}>T-5m</span>
              <span className="text-red-400">Impact : {formatTime(incident.timestamp)}</span>
              <span style={{ color: '#94a3b8' }}>T+10m</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.1)' }}>
              <div className="h-full rounded-full transition-all duration-75"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #ef4444)' }} />
            </div>
            {progress >= 100 && (
               <button onClick={() => setProgress(0)} className="w-full mt-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95"
                 style={{ background: 'rgba(255,255,255,.1)', color: 'white' }}>
                 🔄 Rejouer
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function FleetManagerApp({ operator }: { operator: 'DDD' | 'BRT' }) {
  const dispatch = useAppDispatch();
  const busPositions = useAppSelector(s => s.mobility.busPositions);
  const cfg = OP_CONFIG[operator];

  // ── State ──────────────────────────────────────────────────────
  const [tab, setTab]             = useState<TabId>('dashboard');
  const [incidents, setIncidents] = useState<FleetIncident[]>(
    operator === 'DDD' ? DDD_INCIDENTS_SEED : BRT_INCIDENTS_SEED
  );
  const [messages, setMessages]   = useState<FleetMessage[]>(() => generateMessages(getFleet(operator), operator));
  const [msgVehicle, setMsgVehicle] = useState<FleetVehicle | null>(null);
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<VehicleStatus | 'all' | 'maintenance'>('all');
  const [lineFilter, setLineFilter] = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'pending' | 'critique'>('all');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [replayIncident, setReplayIncident] = useState<FleetIncident | null>(null);
  const [tick, setTick]           = useState(0);

  // ── Data ───────────────────────────────────────────────────────
  const fleet    = useMemo(() => getFleet(operator), [operator]);
  const opLines  = useMemo(() => LINES.filter(l => l.operator === operator), [operator]);
  const revenue  = useMemo(() => computeRevenue(fleet), [fleet]);

  // Positions des bus de cet opérateur (via lignes)
  const opLineIds = useMemo(() => new Set(opLines.map(l => l.id)), [opLines]);
  const opBusPositions = useMemo(
    () => busPositions.filter(p => opLineIds.has(p.lineId)),
    [busPositions, opLineIds]
  );

  // Index pos par busId
  const posIndex = useMemo<Record<string, BusPosition>>(() => {
    const idx: Record<string, BusPosition> = {};
    opBusPositions.forEach(p => { idx[p.busId] = p; });
    return idx;
  }, [opBusPositions]);

  // ── Tickers ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => n + 1);
      setIncidents(prev => generateIncidents(fleet, prev));
    }, 15_000);
    return () => clearInterval(t);
  }, [fleet]);

  // ── KPIs ───────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const active    = fleet.filter(v => v.status === 'en_service').length;
    const ralenti   = fleet.filter(v => v.status === 'ralenti').length;
    const pannes    = fleet.filter(v => v.status === 'panne').length;
    const hs        = fleet.filter(v => v.status === 'hors_service').length;
    const arrets    = fleet.filter(v => v.status === 'arret_prolonge').length;
    const total     = fleet.length;
    const liveBuses = opBusPositions.length;
    const avgSpeed  = liveBuses > 0
      ? Math.round(opBusPositions.reduce((s, p) => s + p.speed, 0) / liveBuses)
      : 0;
    const avgOcc    = liveBuses > 0
      ? Math.round(opBusPositions.reduce((s, p) => s + p.occupancy, 0) / liveBuses)
      : 0;
    const punctuality = Math.round(((active + ralenti) / total) * 100);
    const criticalAlerts = incidents.filter(i => i.severity === 'critique' && !i.acknowledged).length;

    return { active, ralenti, pannes, hs, arrets, total, liveBuses, avgSpeed, avgOcc, punctuality, criticalAlerts };
  }, [fleet, opBusPositions, incidents, tick]);

  // ── Lines health ───────────────────────────────────────────────
  const linesHealth = useMemo(() => opLines.map(line => {
    const lineBuses     = fleet.filter(v => v.lineId === line.id);
    const activeCount   = lineBuses.filter(v => v.status === 'en_service' || v.status === 'ralenti').length;
    const liveBusLine   = opBusPositions.filter(p => p.lineId === line.id);
    const avgOcc        = liveBusLine.length > 0
      ? Math.round(liveBusLine.reduce((s, p) => s + p.occupancy, 0) / liveBusLine.length)
      : Math.floor(30 + (line.id.charCodeAt(1) % 55));
    const hasIncident   = incidents.some(i => i.lineId === line.id && !i.acknowledged);
    const freqNum       = parseInt(line.freq) || 15;
    const freqStatus    = hasIncident ? 'perturbé' : freqNum <= 10 ? 'normal' : freqNum <= 20 ? 'réduit' : 'limité';
    return { line, lineBuses, activeCount, avgOcc, hasIncident, freqStatus };
  }), [opLines, fleet, opBusPositions, incidents]);

  // ── Filtered fleet ─────────────────────────────────────────────
  const filteredFleet = useMemo(() => fleet.filter(v => {
    const matchSearch = fleetSearch === '' ||
      v.plate.toLowerCase().includes(fleetSearch.toLowerCase()) ||
      v.driverName.toLowerCase().includes(fleetSearch.toLowerCase()) ||
      v.lineId.toLowerCase().includes(fleetSearch.toLowerCase());
    if (fleetStatusFilter === 'maintenance') return matchSearch && v.lastMaintenanceDays > 90;
    const matchStatus = fleetStatusFilter === 'all' || v.status === fleetStatusFilter;
    return matchSearch && matchStatus;
  }), [fleet, fleetSearch, fleetStatusFilter]);

  // ── Filtered alerts ────────────────────────────────────────────
  const filteredAlerts = useMemo(() => incidents.filter(i => {
    if (alertFilter === 'pending')  return !i.acknowledged;
    if (alertFilter === 'critique') return i.severity === 'critique';
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp), [incidents, alertFilter]);

  // ── Actions ────────────────────────────────────────────────────
  const ackIncident = useCallback((id: string) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, acknowledged: true } : i));
  }, []);

  const resolveIncident = useCallback((id: string) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolvedAt: Date.now(), acknowledged: true } : i));
  }, []);

  const sendMessage = useCallback((vehicleId: string, text: string) => {
    const v = fleet.find(f => f.id === vehicleId);
    if (!v) return;
    setMessages(prev => [{
      id:          `msg_new_${Date.now()}`,
      vehicleId,
      driverName:  v.driverName,
      direction:   'dispatch→driver',
      text,
      timestamp:   Date.now(),
      read:        false,
    }, ...prev]);
  }, [fleet]);

  const goToMap = useCallback((v: FleetVehicle) => {
    setHighlightId(v.id);
    setTab('map');
  }, []);

  // ── Bus marker color ───────────────────────────────────────────
  function busColor(pos: BusPosition): string {
    const v = fleet.find(f => f.id === pos.busId);
    if (!v) return '#60a5fa';
    return STATUS_CFG[v.status]?.color ?? '#60a5fa';
  }

  // ══════════════════════════════════════════════════════════════
  //  RENDER TABS
  // ══════════════════════════════════════════════════════════════

  // ── TAB 1: Dashboard ──────────────────────────────────────────
  const renderDashboard = () => (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4 pb-24">

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon="🚌" label="En service"   value={String(kpis.active)}
          sub={`sur ${kpis.total} véhicules`}  color="#10b981" trend="up" />
        <KpiCard icon="⚠️" label="Pannes actives" value={String(kpis.pannes + kpis.arrets)}
          sub={`${kpis.hs} hors service`}       color={kpis.pannes > 2 ? '#ef4444' : '#f59e0b'}
          trend={kpis.pannes > 2 ? 'down' : 'neutral'} />
        <KpiCard icon="⏱" label="Ponctualité"   value={`${kpis.punctuality}%`}
          sub="véhicules opérationnels"         color={kpis.punctuality >= 80 ? '#10b981' : '#f59e0b'}
          trend={kpis.punctuality >= 80 ? 'up' : 'down'} />
        <KpiCard icon="💰" label="Recettes today" value={fmtFcfa(revenue.today)}
          sub={`hier : ${fmtFcfa(revenue.yesterday)}`}
          color={cfg.color} trend={revenue.today > revenue.yesterday ? 'up' : 'down'} />
      </div>

      {/* Status distribution */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
        <div className="text-xs font-black mb-3" style={{ color: '#64748b' }}>RÉPARTITION FLOTTE</div>
        <div className="space-y-2">
          {(Object.entries(STATUS_CFG) as [VehicleStatus, typeof STATUS_CFG[VehicleStatus]][]).map(([key, s]) => {
            const count = fleet.filter(v => v.status === key).length;
            const pct   = Math.round((count / fleet.length) * 100);
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="w-24 text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                </div>
                <div className="text-[11px] font-black w-10 text-right" style={{ color: '#64748b' }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live metrics */}
      {opBusPositions.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
          <div className="text-xs font-black mb-3" style={{ color: '#64748b' }}>TÉLÉMÉTRIE LIVE ({opBusPositions.length} GPS actifs)</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-black text-white">{kpis.avgSpeed}</div>
              <div className="text-[10px]" style={{ color: '#475569' }}>km/h moy.</div>
            </div>
            <div>
              <div className="text-xl font-black text-white">{kpis.avgOcc}%</div>
              <div className="text-[10px]" style={{ color: '#475569' }}>taux occup.</div>
            </div>
            <div>
              <div className="text-xl font-black" style={{ color: kpis.criticalAlerts > 0 ? '#ef4444' : '#10b981' }}>
                {kpis.criticalAlerts}
              </div>
              <div className="text-[10px]" style={{ color: '#475569' }}>alertes crit.</div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue summary + top lines */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
        <div className="text-xs font-black mb-1" style={{ color: '#64748b' }}>REVENUS — TOP LIGNES</div>
        <div className="flex gap-4 mb-3 text-[11px]">
          <div><span style={{ color: '#475569' }}>Semaine : </span><strong className="text-white">{fmtFcfa(revenue.week)}</strong></div>
          <div><span style={{ color: '#475569' }}>Mois : </span><strong className="text-white">{fmtFcfa(revenue.month)}</strong></div>
        </div>
        <RevenueBar entries={revenue.byLine} max={revenue.byLine[0]?.amount ?? 1} />
      </div>

      {/* Profil horaire */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
        <div className="text-xs font-black mb-3" style={{ color: '#64748b' }}>PROFIL HORAIRE (recettes)</div>
        <div className="flex items-end gap-0.5 h-14">
          {revenue.hourly.map((v, h) => {
            const maxH = Math.max(...revenue.hourly);
            const pct  = maxH > 0 ? (v / maxH) * 100 : 0;
            const peak = h === 7 || h === 8 || h === 17 || h === 18;
            return (
              <div key={h} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                <div className="w-full rounded-sm transition-all"
                  style={{ height: `${Math.max(2, pct)}%`, background: peak ? cfg.color : 'rgba(255,255,255,.12)' }} />
                {(h % 6 === 0) && (
                  <div className="text-[8px]" style={{ color: '#334155' }}>{h}h</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dernières alertes */}
      {incidents.filter(i => !i.acknowledged).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-black" style={{ color: '#64748b' }}>ALERTES NON TRAITÉES</div>
            <button onClick={() => setTab('alerts')}
              className="text-xs font-black px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,.15)', color: '#f87171', minHeight: 40 }}>
              Voir tout →
            </button>
          </div>
          <div className="space-y-2">
            {incidents.filter(i => !i.acknowledged).slice(0, 3).map(inc => (
              <div key={inc.id} className="flex items-start gap-2 rounded-xl p-2"
                style={{ background: SEV_CFG[inc.severity].bg }}>
                <span className="text-sm mt-0.5 flex-shrink-0">
                  {inc.severity === 'critique' ? '🔴' : inc.severity === 'moyen' ? '🟠' : '🟡'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">{inc.description}</div>
                  <div className="text-[10px]" style={{ color: '#475569' }}>
                    {inc.vehiclePlate} · {inc.lineName} · il y a {timeAgo(inc.timestamp)}
                  </div>
                </div>
                <button onClick={() => ackIncident(inc.id)}
                  className="text-xs font-black px-2 py-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,.1)', color: '#94a3b8', minHeight: 40 }}>
                  ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── TAB 2: Carte Live ─────────────────────────────────────────
  const renderMap = () => (
    <div className="h-full flex flex-col">
      {/* Mini legend */}
      <div className="flex-shrink-0 px-4 py-2 flex gap-3 overflow-x-auto"
        style={{ background: 'var(--c-bg)', borderBottom: '1px solid var(--c-border)' }}>
        {(Object.entries(STATUS_CFG) as [VehicleStatus, typeof STATUS_CFG[VehicleStatus]][]).map(([k, s]) => (
          <div key={k} className="flex items-center gap-1 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
        <div className="ml-2 text-[10px] font-black flex-shrink-0" style={{ color: '#334155' }}>
          {opBusPositions.length} bus GPS live
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={[14.7267, -17.41]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          <MapAutoCenter positions={opBusPositions} />

          {opBusPositions.map(pos => {
            const v = fleet.find(f => f.id === pos.busId);
            const line = LINES.find(l => l.id === pos.lineId);
            const color = busColor(pos);
            const isHighlighted = highlightId === pos.busId;
            return (
              <CircleMarker
                key={pos.busId}
                center={[pos.lat, pos.lng]}
                radius={isHighlighted ? 12 : 8}
                pathOptions={{
                  color: isHighlighted ? '#fff' : color,
                  fillColor: color,
                  fillOpacity: 0.9,
                  weight: isHighlighted ? 3 : 1.5,
                }}>
                <Popup>
                  <div style={{ minWidth: 180, fontFamily: 'system-ui', fontSize: 12 }}>
                    <div style={{ fontWeight: 900, marginBottom: 4, color: color }}>
                      {v?.vehicleType === 'grand_bus' ? '🚌' : '🚐'} {v?.plate ?? pos.busId}
                    </div>
                    {line && (
                      <div style={{ background: line.color, color: '#fff', padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 4, fontSize: 10, fontWeight: 800 }}>
                        {line.name}
                      </div>
                    )}
                    <div style={{ marginTop: 2 }}>
                      {v && <><strong>Chauffeur :</strong> {v.driverName}<br /></>}
                      <strong>Vitesse :</strong> {pos.speed} km/h<br />
                      <strong>Occupation :</strong> {pos.occupancy}%<br />
                      {v && <><strong>Statut :</strong> {STATUS_CFG[v.status]?.label}<br /></>}
                      <strong>Dernière màj :</strong> {timeAgo(pos.timestamp)}
                    </div>
                    {v && (
                      <button
                        onClick={() => setMsgVehicle(v)}
                        style={{ marginTop: 6, width: '100%', padding: '4px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                        💬 Envoyer message
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {opBusPositions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl px-6 py-4 text-center"
            style={{ background: 'rgba(6,10,20,.85)', border: '1px solid var(--c-border2)' }}>
            <div className="text-2xl mb-2">🛰️</div>
            <div className="text-sm font-black text-white">Aucun bus GPS actif</div>
            <div className="text-xs mt-1" style={{ color: '#475569' }}>
              Les lignes {operator} ne sont pas encore simulées en temps réel
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── TAB 3: Flotte ─────────────────────────────────────────────
  const renderFleet = () => (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="flex-shrink-0 px-4 py-3 space-y-2" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#475569' }}>🔍</span>
          <input value={fleetSearch} onChange={e => setFleetSearch(e.target.value)}
            placeholder="Plaque, chauffeur, ligne…"
            className="input pl-9 text-sm" />
          {fleetSearch && (
            <button onClick={() => setFleetSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#475569' }}>✕</button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(['all', ...Object.keys(STATUS_CFG), 'maintenance'] as ('all' | VehicleStatus | 'maintenance')[]).map(s => (
            <button key={s}
              onClick={() => setFleetStatusFilter(s)}
              className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-black transition-all"
              style={fleetStatusFilter === s
                ? { background: s === 'all' ? cfg.color : s === 'maintenance' ? '#ef4444' : STATUS_CFG[s as VehicleStatus]?.color ?? cfg.color, color: '#fff' }
                : { background: 'rgba(255,255,255,.05)', color: '#475569', border: '1px solid var(--c-border)', minHeight: 36 }}>
              {s === 'all' ? `Tous (${fleet.length})` : s === 'maintenance' ? `🔧 À réviser (${fleet.filter(v => v.lastMaintenanceDays > 90).length})` : `${STATUS_CFG[s as VehicleStatus].emoji} ${STATUS_CFG[s as VehicleStatus].label} (${fleet.filter(v => v.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="text-[10px]" style={{ color: '#334155' }}>
          {filteredFleet.length} véhicule{filteredFleet.length > 1 ? 's' : ''} affiché{filteredFleet.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-24">
        {filteredFleet.length === 0 && (
          <div className="text-center py-10 text-xs" style={{ color: '#334155' }}>Aucun résultat</div>
        )}
        {filteredFleet.slice(0, 60).map(v => (
          <VehicleCard
            key={v.id}
            v={v}
            busPos={posIndex[v.id]}
            onMessage={setMsgVehicle}
            onHighlight={goToMap}
          />
        ))}
        {filteredFleet.length > 60 && (
          <div className="text-center text-xs py-2" style={{ color: '#334155' }}>
            + {filteredFleet.length - 60} véhicules (utilisez la recherche)
          </div>
        )}
      </div>
    </div>
  );

  // ── TAB 4: Lignes ─────────────────────────────────────────────
  const renderLines = () => {
    const filtered = linesHealth.filter(lh =>
      lineFilter === '' ||
      lh.line.name.toLowerCase().includes(lineFilter.toLowerCase()) ||
      lh.line.route.toLowerCase().includes(lineFilter.toLowerCase())
    );
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <input value={lineFilter} onChange={e => setLineFilter(e.target.value)}
            placeholder="Filtrer par ligne ou itinéraire…"
            className="input text-sm" />
          <div className="mt-1 text-[10px]" style={{ color: '#334155' }}>
            {filtered.length} ligne{filtered.length > 1 ? 's' : ''} · {opLines.length} au total
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-24">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.03)', borderBottom: '1px solid var(--c-border)' }}>
                {['Ligne', 'Itinéraire', 'Bus actifs', 'Occup.', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-black" style={{ color: '#334155', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lh => {
                const sc = lh.freqStatus === 'normal'    ? { bg: 'rgba(16,185,129,.15)', color: '#34d399' }
                         : lh.freqStatus === 'réduit'    ? { bg: 'rgba(245,158,11,.15)', color: '#fbbf24' }
                         : lh.freqStatus === 'perturbé'  ? { bg: 'rgba(239,68,68,.15)', color: '#f87171' }
                         :                                 { bg: 'rgba(100,116,139,.15)', color: '#94a3b8' };
                return (
                  <tr key={lh.line.id} style={{ borderBottom: '1px solid var(--c-border)' }}
                    className="hover:bg-white/[.02] transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="font-black px-2 py-0.5 rounded-full text-white text-[10px]"
                        style={{ background: lh.line.color }}>{lh.line.name}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px]">
                      <div className="truncate" style={{ color: '#94a3b8' }}>{lh.line.route}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-black text-white">{lh.activeCount}</span>
                        <span style={{ color: '#334155' }}>/ {lh.lineBuses.length}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.1)' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${lh.avgOcc}%`, background: lh.avgOcc > 80 ? '#ef4444' : lh.avgOcc > 50 ? '#f59e0b' : '#10b981' }} />
                        </div>
                        <span className="font-semibold text-white">{lh.avgOcc}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-black text-[10px]"
                        style={{ background: sc.bg, color: sc.color }}>
                        {lh.freqStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setFleetStatusFilter('all'); setFleetSearch(lh.line.id); setTab('fleet'); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-90"
                          style={{ background: 'rgba(37,99,235,.15)', color: '#60a5fa', minHeight: 36 }}>
                          🚌 Bus
                        </button>
                        <button
                          onClick={() => {
                            const desc = window.prompt(`Saisir le message de déviation pour la ligne ${lh.line.name} :`);
                            if (desc) {
                              setIncidents(prev => [{
                                id: `dev_${Date.now()}`,
                                vehicleId: '',
                                vehiclePlate: 'Flotte',
                                lineId: lh.line.id,
                                lineName: lh.line.name,
                                type: 'deviation',
                                severity: 'moyen',
                                description: `DÉVIATION : ${desc}`,
                                timestamp: Date.now(),
                                acknowledged: true,
                              }, ...prev]);
                              dispatch(showToast({ type: 'success', message: 'Déviation annoncée avec succès.' }));
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-90"
                          style={{ background: 'rgba(217,119,6,.15)', color: '#fbbf24', minHeight: 36 }}>
                          🔀 Déviation
                        </button>
                        {lh.hasIncident && (
                          <button
                            onClick={() => { setAlertFilter('pending'); setTab('alerts'); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-90"
                            style={{ background: 'rgba(239,68,68,.15)', color: '#f87171', minHeight: 36 }}>
                            ⚠️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── TAB 5: Alertes ────────────────────────────────────────────
  const renderAlerts = () => (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid var(--c-border)' }}>
        {(['all', 'pending', 'critique'] as const).map(f => (
          <button key={f}
            onClick={() => setAlertFilter(f)}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
            style={alertFilter === f
              ? { background: f === 'critique' ? '#ef4444' : cfg.color, color: '#fff' }
              : { background: 'rgba(255,255,255,.04)', color: '#475569', border: '1px solid var(--c-border)' }}>
            {f === 'all' ? `Toutes (${incidents.length})` : f === 'pending' ? `En attente (${incidents.filter(i => !i.acknowledged).length})` : `Critiques (${incidents.filter(i => i.severity === 'critique').length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-24">
        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm font-black text-white">Aucune alerte</div>
            <div className="text-xs mt-1" style={{ color: '#334155' }}>La flotte est opérationnelle</div>
          </div>
        )}
        {filteredAlerts.map(inc => {
          const sc = SEV_CFG[inc.severity];
          return (
            <div key={inc.id} className="rounded-2xl p-4"
              style={{
                background: 'var(--c-surface)',
                border: `1px solid ${inc.acknowledged ? 'var(--c-border)' : sc.color + '50'}`,
                opacity: inc.resolvedAt ? 0.5 : 1,
              }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: sc.bg }}>
                  {inc.severity === 'critique' ? '🔴' : inc.severity === 'moyen' ? '🟠' : '🟡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-white text-sm truncate">{inc.description}</span>
                    <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    {inc.acknowledged && !inc.resolvedAt && (
                      <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(100,116,139,.15)', color: '#94a3b8' }}>Acquittée</span>
                    )}
                    {inc.resolvedAt && (
                      <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(16,185,129,.15)', color: '#34d399' }}>Résolue</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px]" style={{ color: '#475569' }}>
                    <span>🚌 {inc.vehiclePlate}</span>
                    <span>📋 {inc.lineName}</span>
                    <span>⏱ {timeAgo(inc.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => setReplayIncident(inc)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95"
                  style={{ background: 'rgba(139,92,246,.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.2)', minWidth: '40%' }}>
                  ⏪ Replay
                </button>
                {!inc.resolvedAt && (
                  <>
                    {!inc.acknowledged && (
                      <button onClick={() => ackIncident(inc.id)}
                        className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95"
                        style={{ background: 'rgba(100,116,139,.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,.2)', minWidth: '40%' }}>
                        ✓ Acquitter
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const v = fleet.find(f => f.id === inc.vehicleId);
                        if (v) setMsgVehicle(v);
                      }}
                      className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95"
                      style={{ background: 'rgba(37,99,235,.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,.2)', minWidth: '40%' }}>
                      💬 Contacter
                    </button>
                    <button onClick={() => resolveIncident(inc.id)}
                      className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95"
                      style={{ background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.2)', minWidth: '40%' }}>
                      ✅ Résoudre
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  SHELL
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 safe-top"
        style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border2)', boxShadow: '0 2px 20px rgba(0,0,0,.4)' }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-sm leading-none">{cfg.full}</div>
          <div className="text-[10px] mt-0.5 font-semibold" style={{ color: cfg.accent }}>
            Gestionnaire de Flotte · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
          <span className="text-[11px] font-black" style={{ color: '#34d399' }}>LIVE</span>
        </div>
        <button onClick={() => dispatch(logoutFleetManager())}
          className="ml-1 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90"
          style={{ minWidth: 40, minHeight: 40, background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}
          title="Déconnexion">
          ⏏
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {tab === 'dashboard' && renderDashboard()}
        {tab === 'map'       && renderMap()}
        {tab === 'fleet'     && renderFleet()}
        {tab === 'lines'     && renderLines()}
        {tab === 'alerts'    && renderAlerts()}
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 flex items-center safe-bottom"
        style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border2)', height: 60 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          const alertBadge = t.id === 'alerts' ? incidents.filter(i => !i.acknowledged).length : 0;
          return (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 relative"
              style={{ color: active ? cfg.color : '#4b5563' }}>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ background: cfg.color }} />
              )}
              <div className="relative">
                <span className="text-xl leading-none">{t.icon}</span>
                {alertBadge > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-white text-[8px] font-black flex items-center justify-center"
                    style={{ background: '#ef4444' }}>
                    {alertBadge > 9 ? '9+' : alertBadge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message modal */}
      {msgVehicle && (
        <MessageModal
          vehicle={msgVehicle}
          messages={messages}
          onClose={() => setMsgVehicle(null)}
          onSend={text => { sendMessage(msgVehicle.id, text); }}
        />
      )}

      {/* Replay Modal */}
      {replayIncident && (
        <IncidentReplayModal
          incident={replayIncident}
          onClose={() => setReplayIncident(null)}
        />
      )}
    </div>
  );
}
