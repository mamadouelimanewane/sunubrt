import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, Circle, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedStop, setMapCenter, setMapZoom, clearFocusedLine, setUserLocation } from '@/store/store';
import type { RouteDisplay } from '@/store/store';
import { STOPS, LINES, OPERATORS } from '@/data/transportData';
import { routeOnRoads, routeOnFoot, routeLine, lineRouteCache, cacheLineRoute } from '@/utils/osrm';
import { buildStopTimings, sampleArrowPoints } from '@/utils/lineUtils';
import StopPopup from './StopPopup';
import type { Stop, Line, BusPosition } from '@/types';
import { MOCK_DRIVERS } from '@/services/simulation';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeStopIcon = (color: string, size = 10) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.8);box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size],
});

const makeTerminusIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid rgba(255,255,255,.9);transform:rotate(45deg);box-shadow:0 2px 12px rgba(0,0,0,.4);border-radius:3px"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -12],
});

const makeBusMarkerIcon = (color: string, speed: number, occupancy: number) => {
  const occ = occupancy > 80 ? '#dc2626' : occupancy > 50 ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color}22;animation:pr 2.5s ease-out infinite"></div>
      <div style="position:absolute;inset:3px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 12px ${color}88;display:flex;align-items:center;justify-content:center;font-size:10px">🚌</div>
      <div style="position:absolute;-bottom:2px;-right:-2px;bottom:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:${occ};border:1.5px solid #0f172a"></div>
    </div>
    <style>@keyframes pr{0%{transform:scale(.8);opacity:.6}100%{transform:scale(2);opacity:0}}</style>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
};

const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,86,219,.2);animation:pr 2s ease-out infinite"></div>
    <div style="position:absolute;inset:4px;border-radius:50%;background:#1a56db;border:2.5px solid white;box-shadow:0 0 16px rgba(26,86,219,.6)"></div>
  </div>
  <style>@keyframes pr{0%{transform:scale(.8);opacity:.8}100%{transform:scale(2.6);opacity:0}}</style>`,
  iconSize: [22, 22], iconAnchor: [11, 11],
});

const makeRouteEndIcon = (color: string, label: string) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 4px 16px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:white">${label}</div>
    <div style="width:3px;height:10px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px;opacity:.8"></div>
  </div>`,
  iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -32],
});

const originIcon = makeRouteEndIcon('#059669', 'A');
const destIcon   = makeRouteEndIcon('#dc2626', 'B');

// ── Numbered stop icon for focused line ───────────────────────
const makeNumberedStopIcon = (index: number, color: string, isTerminus: boolean) => L.divIcon({
  className: '',
  html: isTerminus
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="width:22px;height:22px;border-radius:50%;background:${color};border:2.5px solid white;
          box-shadow:0 0 16px ${color}88,0 4px 12px rgba(0,0,0,.5);
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:900;color:white;line-height:1">
          ${index === 1 ? 'A' : 'Z'}
        </div>
        <div style="width:2px;height:8px;background:${color};border-radius:2px;opacity:.7"></div>
      </div>`
    : `<div style="width:18px;height:18px;border-radius:50%;background:${color}dd;
        border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);
        display:flex;align-items:center;justify-content:center;
        font-size:8px;font-weight:900;color:white;line-height:1">
        ${index}
      </div>`,
  iconSize: isTerminus ? [22, 32] : [18, 18],
  iconAnchor: isTerminus ? [11, 32] : [9, 9],
  popupAnchor: [0, isTerminus ? -34 : -20],
});

// ── Direction arrow icon ──────────────────────────────────────
const makeArrowIcon = (deg: number, color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;
    transform:rotate(${deg}deg);filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))">
    <svg width="14" height="14" viewBox="0 0 14 14">
      <polygon points="7,1 13,13 7,10 1,13" fill="${color}" opacity="0.9"/>
    </svg>
  </div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ── Carte déplaçable : tarif + marche ────────────────────────
function DraggableInfoBar({ routeDisplay }: { routeDisplay: NonNullable<ReturnType<typeof useAppSelector<any>>> }) {
  const isMobile = window.innerWidth < 640;
  const { pos, onMouseDown, onTouchStart, onTouchMove, onTouchEnd } = useDraggable({ x: 12, y: -80 });

  const origin = STOPS.find((s: Stop) => s.id === routeDisplay.originStopId);
  const walkDist = routeDisplay.walkFrom && origin ? Math.round(
    Math.sqrt(
      Math.pow((routeDisplay.walkFrom[0] - origin.lat) * 111000, 2) +
      Math.pow((routeDisplay.walkFrom[1] - origin.lng) * 85000, 2)
    )
  ) : null;
  const walkMin = walkDist ? Math.ceil(walkDist / 80) : null;

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'absolute',
        left: pos.x,
        bottom: -pos.y,
        zIndex: 900,
        cursor: 'grab',
        display: 'flex',
        gap: 8,
        userSelect: 'none',
        touchAction: 'none',
      }}>

      {/* Marche à pied */}
      {routeDisplay.walkFrom && origin && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8,
          padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 14,
          background: 'rgba(10,15,30,.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(5,150,105,.4)', boxShadow: '0 6px 24px rgba(0,0,0,.4)',
        }}>
          <span style={{ fontSize: isMobile ? 14 : 18 }}>🚶</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '.05em' }}>À pied</div>
            <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 900, color: 'white', maxWidth: isMobile ? 80 : 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{origin.name}</div>
            {walkMin && <div style={{ fontSize: 11, color: '#64748b' }}>~{walkDist}m · {walkMin}min</div>}
          </div>
        </div>
      )}

      {/* Tarif */}
      {routeDisplay.fare && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8,
          padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 14,
          background: 'rgba(10,15,30,.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(250,204,21,.4)', boxShadow: '0 6px 24px rgba(0,0,0,.4)',
        }}>
          <span style={{ fontSize: isMobile ? 14 : 18 }}>🎫</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Tarif</div>
            <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 900, color: '#fbbf24' }}>{routeDisplay.fare} FCFA</div>
          </div>
        </div>
      )}

      {/* Poignée drag */}
      <div style={{
        position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
        width: 32, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.2)',
      }} />
    </div>
  );
}

// ── Carte déplaçable : timeline itinéraire ────────────────────
function DraggableTimeline({ routeDisplay }: { routeDisplay: NonNullable<ReturnType<typeof useAppSelector<any>>> }) {
  const isMobile = window.innerWidth < 640;
  // Réduit par défaut sur mobile pour ne pas masquer la carte
  const [collapsed, setCollapsed] = React.useState(isMobile);
  const { pos, onMouseDown, onTouchStart, onTouchMove, onTouchEnd } = useDraggable({ x: -10, y: -88 });

  const origin = STOPS.find((s: Stop) => s.id === routeDisplay.originStopId);
  const dest   = STOPS.find((s: Stop) => s.id === routeDisplay.destStopId);
  if (!origin || !dest) return null;

  type TNode =
    | { t: 'stop';    name: string; color: string; label: string }
    | { t: 'segment'; lineName: string; color: string; from: string; to: string };

  const nodes: TNode[] = [];
  nodes.push({ t: 'stop', name: origin.name, color: '#059669', label: 'A' });
  routeDisplay.segments.forEach((seg: any, i: number) => {
    const fromStop = STOPS.find((s: Stop) => s.id === seg.fromStopId);
    const toStop   = STOPS.find((s: Stop) => s.id === seg.toStopId);
    const segColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    nodes.push({ t: 'segment', lineName: seg.lineName, color: segColor, from: fromStop?.name ?? '', to: toStop?.name ?? '' });
    if (i < routeDisplay.segments.length - 1 && toStop) {
      nodes.push({ t: 'stop', name: toStop.name, color: '#d97706', label: '↻' });
    }
  });
  nodes.push({ t: 'stop', name: dest.name, color: '#dc2626', label: 'B' });

  // Résumé : noms des lignes pour la vue réduite
  const lineNames = routeDisplay.segments.map((s: any) => s.lineName).join(' → ');

  // Calcul position : droite de la carte
  const style: React.CSSProperties = {
    position: 'absolute',
    right: 10,
    bottom: 88,
    zIndex: 900,
    cursor: collapsed ? 'pointer' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
    background: 'rgba(10,15,30,.93)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: collapsed ? 12 : 16,
    boxShadow: '0 8px 32px rgba(0,0,0,.45)',
    transition: 'all .2s',
  };

  // Vue réduite : petite pilule cliquable
  if (collapsed) {
    return (
      <div style={{ ...style, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 7 }}
        onClick={() => setCollapsed(false)}>
        <span style={{ fontSize: 14 }}>🗺️</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: 'white', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lineNames || 'Itinéraire'}</span>
        <span style={{ fontSize: 14, color: '#475569', marginLeft: 2 }}>›</span>
      </div>
    );
  }

  return (
    <div style={{ ...style, minWidth: 150, maxWidth: isMobile ? 170 : 190 }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}>

      {/* Header avec bouton réduire */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px 5px', borderBottom: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}
        onClick={() => setCollapsed(true)}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' }}>Itinéraire</span>
        <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1 }}>−</span>
      </div>

      {/* Nœuds */}
      <div style={{ padding: '7px 10px' }}>
        {nodes.map((node, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 7, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
              {node.t === 'stop' ? (
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: node.color, border: '1.5px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white', flexShrink: 0 }}>
                  {node.label}
                </div>
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: 5, background: node.color + 'cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  🚌
                </div>
              )}
              {idx < nodes.length - 1 && (
                <div style={{ flex: 1, width: 1, margin: '2px 0', minHeight: 8, background: node.t === 'segment' ? node.color + '80' : ((nodes[idx + 1] as any)?.color ?? '#fff') + '60' }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 5, paddingTop: 1, minWidth: 0 }}>
              {node.t === 'stop' && (
                <span style={{ fontSize: 10, fontWeight: 900, color: node.color, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.name}
                </span>
              )}
              {node.t === 'segment' && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 900, padding: '1px 5px', borderRadius: 5, background: node.color, color: 'white', display: 'inline-block' }}>
                    {node.lineName}
                  </span>
                  {node.from && node.to && (
                    <p style={{ fontSize: 8, marginTop: 1, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.from} → {node.to}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Focused line: numbered stops + arrows ─────────────────────
function FocusedLineOverlay({ line }: { line: Line }) {
  const dispatch = useAppDispatch();
  const [coords, setCoords] = useState<[number, number][] | null>(null);
  const timings = buildStopTimings(line);

  useEffect(() => {
    if (lineRouteCache[line.id]) { setCoords(lineRouteCache[line.id]); return; }
    const stops = line.stops.map(id => STOPS.find(s => s.id === id)).filter(Boolean) as Stop[];
    if (stops.length < 2) return;
    routeLine(stops).then(result => {
      const c = result || stops.map(s => [s.lat, s.lng] as [number, number]);
      cacheLineRoute(line.id, c);
      setCoords(c);
    });
  }, [line.id]);

  if (!coords || coords.length < 2) return null;

  const arrows = sampleArrowPoints(coords, 5);

  return (
    <>
      {/* Shadow polyline */}
      <Polyline positions={coords} color="rgba(0,0,0,.35)" weight={6} opacity={1} />
      {/* Main line */}
      <Polyline positions={coords} color={line.color} weight={4} opacity={1}
        dashArray={line.operator === 'BRT' ? '18 9' : undefined} />
      {/* Bright inner line */}
      <Polyline positions={coords} color="rgba(255,255,255,.3)" weight={1.5} opacity={1} />

      {/* Direction arrows */}
      {arrows.map((a, i) => (
        <Marker key={`arrow-${i}`} position={[a.lat, a.lng]}
          icon={makeArrowIcon(a.deg, line.color)} interactive={false} />
      ))}

      {/* Numbered stop markers */}
      {timings.map(({ stop, index, isTerminus }) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]}
          icon={makeNumberedStopIcon(index, line.color, isTerminus)}
          zIndexOffset={isTerminus ? 500 : 100}
          eventHandlers={{ click: () => dispatch(setSelectedStop(stop.id)) }}>
          <Popup maxWidth={240} minWidth={210}>
            <div style={{ fontFamily: 'Inter, sans-serif', padding: 12, background: '#ffffff', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: line.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: 'white', flexShrink: 0 }}>
                  {isTerminus ? (index === 1 ? 'A' : 'Z') : index}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13 }}>{stop.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{stop.zone}</div>
                </div>
              </div>
              {isTerminus && (
                <div style={{ fontSize: 10, color: line.color, fontWeight: 700 }}>
                  {index === 1 ? '🟢 Terminus départ' : '🏁 Terminus arrivée'}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function MapController() {
  const map = useMap();
  const { mapCenter, mapZoom } = useAppSelector(s => s.mobility);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const move = () => {
      const key = `${mapCenter[0]},${mapCenter[1]},${mapZoom}`;
      if (key === prev.current) return;
      prev.current = key;
      try { map.setView(mapCenter, mapZoom, { animate: true, duration: 1 }); } catch (_) {}
    };
    // Wait for map to be ready before panning
    if ((map as any)._loaded) {
      move();
    } else {
      map.once('load', move);
    }
    return () => { map.off('load', move); };
  }, [mapCenter, mapZoom, map]);

  return null;
}

function FitRouteBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) {
      try { map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 14 }); } catch (_) { /* map not ready */ }
    }
  }, [coords, map]);
  return null;
}

function BusLine({ line, isFocused, hasFocus }: { line: Line; isFocused: boolean; hasFocus: boolean }) {
  const [coords, setCoords] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (lineRouteCache[line.id]) { setCoords(lineRouteCache[line.id]); return; }
    const stops = line.stops.map(sid => STOPS.find(s => s.id === sid)).filter(Boolean) as Stop[];
    if (stops.length < 2) return;
    routeLine(stops).then(result => {
      const c = result || stops.map(s => [s.lat, s.lng] as [number, number]);
      cacheLineRoute(line.id, c);
      setCoords(c);
    });
  }, [line.id]);

  if (!coords || coords.length < 2) return null;

  const opacity = hasFocus && !isFocused ? 0.04 : isFocused ? 1 : 0.65;
  const weight  = isFocused ? 5 : 2.5;

  return (
    <>
      {!hasFocus || isFocused ? (
        <Polyline positions={coords} color="rgba(0,0,0,.3)" weight={weight + 2} opacity={1} />
      ) : null}
      <Polyline positions={coords} color={line.color} weight={weight} opacity={opacity}
        dashArray={line.operator === 'BRT' ? '16 8' : undefined} />
    </>
  );
}

function TripRoute({ origin, destination, onCoordsReady }: {
  origin: Stop; destination: Stop; onCoordsReady: (c: [number, number][]) => void;
}) {
  const [coords, setCoords] = useState<[number, number][] | null>(null);

  useEffect(() => {
    setCoords(null);
    routeOnRoads([origin, destination]).then(res => {
      const c = res || [[origin.lat, origin.lng], [destination.lat, destination.lng]] as [number, number][];
      setCoords(c);
      onCoordsReady(c);
    });
  }, [origin.id, destination.id]);

  if (!coords || coords.length < 2) return null;

  return (
    <>
      <Polyline positions={coords} color="rgba(255,255,255,.8)" weight={18} opacity={0.6} />
      <Polyline positions={coords} color="rgba(0,0,0,.4)"      weight={14} opacity={1} />
      <Polyline positions={coords} color="#1a56db"              weight={8}  opacity={1} />
      <Polyline positions={coords} color="rgba(255,255,255,.9)" weight={2}  opacity={1} dashArray="10 22" />
    </>
  );
}

// ── Route overlay icons ────────────────────────────────────────
const makeLetterIcon = (letter: string, color: string) => L.divIcon({
  className: '',
  iconSize: [34, 42],
  iconAnchor: [17, 42],
  html: `<div style="position:relative;width:34px;height:42px">
    <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color}"></div>
    <div style="width:34px;height:34px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 4px 12px ${color}80;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:white">${letter}</div>
  </div>`,
});

// ── Étiquette du numéro de bus sur le tracé ──────────────────
const makeLineLabelIcon = (lineName: string, color: string) => L.divIcon({
  className: '',
  iconSize: [72, 28],
  iconAnchor: [36, 14],
  html: `<div style="
    background:${color};
    color:white;
    font-family:'Inter',sans-serif;
    font-size:11px;
    font-weight:900;
    padding:4px 10px;
    border-radius:20px;
    border:2.5px solid white;
    box-shadow:0 3px 12px rgba(0,0,0,.35);
    white-space:nowrap;
    text-align:center;
    line-height:1.2;
    letter-spacing:.02em;
  ">🚌 ${lineName}</div>`,
});

const makeTransferIcon = (lineNames: string) => L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#d97706;border:3px solid white;box-shadow:0 3px 10px #d9770660;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:white" title="${lineNames}">↻</div>`,
});

// Palette de couleurs distinctes pour chaque segment de bus
const SEGMENT_COLORS = ['#2563eb', '#059669', '#f59e0b', '#7c3aed', '#dc2626'];

// ── Hook drag déplaçable ──────────────────────────────────────
function useDraggable(initialPos: { x: number; y: number }) {
  const [pos, setPos] = useState(initialPos);
  const dragging = useRef(false);
  const origin   = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',  onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setPos({
      x: origin.current.px + (e.clientX - origin.current.mx),
      y: origin.current.py + (e.clientY - origin.current.my),
    });
  };

  const onMouseUp = () => {
    dragging.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup',   onMouseUp);
  };

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    dragging.current = true;
    origin.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    setPos({
      x: origin.current.px + (t.clientX - origin.current.mx),
      y: origin.current.py + (t.clientY - origin.current.my),
    });
  };
  const onTouchEnd = () => { dragging.current = false; };

  return { pos, onMouseDown, onTouchStart, onTouchMove, onTouchEnd };
}

// ── RouteOverlay ───────────────────────────────────────────────
function RouteOverlay() {
  const map = useMap();
  const dispatch = useAppDispatch();
  const { routeDisplay, userLocation } = useAppSelector(s => s.mobility);
  const { active: journey } = useAppSelector(s => s.journey);
  const [busCoords, setBusCoords] = useState<Record<string, [number, number][]>>({});
  const [walkCoords, setWalkCoords] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!routeDisplay) { setBusCoords({}); return; }
    let cancelled = false;

    async function fetchSegments() {
      for (const seg of routeDisplay!.segments) {
        const line = LINES.find(l => l.id === seg.lineId);
        const key = `${seg.lineId}:${seg.fromStopId}:${seg.toStopId}`;

        // Build waypoints — fallback to just the two endpoints if stops not found in line list
        let waypoints: { lat: number; lng: number }[];
        if (line) {
          const fromIdx = line.stops.indexOf(seg.fromStopId);
          const toIdx   = line.stops.indexOf(seg.toStopId);
          if (fromIdx >= 0 && toIdx >= 0) {
            const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
            waypoints = line.stops.slice(lo, hi + 1)
              .map(id => STOPS.find(s => s.id === id))
              .filter(Boolean)
              .map(s => ({ lat: s!.lat, lng: s!.lng }));
          } else {
            // Stops not found in line — use direct endpoints
            const fromStop = STOPS.find(s => s.id === seg.fromStopId);
            const toStop   = STOPS.find(s => s.id === seg.toStopId);
            waypoints = [fromStop, toStop].filter(Boolean).map(s => ({ lat: s!.lat, lng: s!.lng }));
          }
        } else {
          const fromStop = STOPS.find(s => s.id === seg.fromStopId);
          const toStop   = STOPS.find(s => s.id === seg.toStopId);
          waypoints = [fromStop, toStop].filter(Boolean).map(s => ({ lat: s!.lat, lng: s!.lng }));
        }

        if (waypoints.length < 2) continue;

        // Show straight-line fallback immediately, then replace with OSRM route if available
        const immediateFallback = waypoints.map(w => [w.lat, w.lng] as [number, number]);
        if (!cancelled) setBusCoords(prev => ({ ...prev, [key]: immediateFallback }));

        const coords = await routeOnRoads(waypoints);
        if (!cancelled && coords) {
          setBusCoords(prev => ({ ...prev, [key]: coords }));
        }
      }
    }

    fetchSegments();
    return () => { cancelled = true; };
  }, [routeDisplay]);

  // Walking path: fetch road-following route from GPS to departure stop
  useEffect(() => {
    if (!routeDisplay?.walkFrom) { setWalkCoords(null); return; }
    const origin = STOPS.find(s => s.id === routeDisplay.originStopId);
    if (!origin) { setWalkCoords(null); return; }
    let cancelled = false;
    routeOnFoot([
      { lat: routeDisplay.walkFrom[0], lng: routeDisplay.walkFrom[1] },
      { lat: origin.lat, lng: origin.lng },
    ]).then(coords => {
      if (!cancelled) {
        // Fallback to straight line if OSRM fails
        setWalkCoords(coords ?? [routeDisplay.walkFrom!, [origin.lat, origin.lng]]);
      }
    });
    return () => { cancelled = true; };
  }, [routeDisplay?.walkFrom?.[0], routeDisplay?.walkFrom?.[1], routeDisplay?.originStopId]);

  // Fit map bounds to show the whole route
  useEffect(() => {
    if (!routeDisplay) return;
    const pts: [number, number][] = [];
    if (routeDisplay.walkFrom) pts.push(routeDisplay.walkFrom);
    const origin = STOPS.find(s => s.id === routeDisplay.originStopId);
    const dest   = STOPS.find(s => s.id === routeDisplay.destStopId);
    if (origin) pts.push([origin.lat, origin.lng]);
    if (dest)   pts.push([dest.lat, dest.lng]);
    routeDisplay.transferStopIds.forEach(id => {
      const s = STOPS.find(x => x.id === id);
      if (s) pts.push([s.lat, s.lng]);
    });
    if (pts.length >= 2) map.fitBounds(pts, { padding: [50, 50], maxZoom: 15 });
  }, [routeDisplay]);

  // Walking-only mode during active journey
  if (!routeDisplay) {
    if (journey?.status === 'walking' && userLocation && journey.walkingStop) {
      return (
        <Polyline
          positions={[userLocation, [journey.walkingStop.lat, journey.walkingStop.lng]]}
          pathOptions={{ color: '#059669', weight: 4, dashArray: '10 8', opacity: 0.9 }}
        />
      );
    }
    return null;
  }

  const origin  = STOPS.find(s => s.id === routeDisplay.originStopId);
  const dest    = STOPS.find(s => s.id === routeDisplay.destStopId);
  const transfers = routeDisplay.transferStopIds
    .map(id => STOPS.find(s => s.id === id))
    .filter(Boolean) as typeof STOPS;

  return (
    <>
      {/* Walking segment: road-following path with halo */}
      {walkCoords && walkCoords.length >= 2 && (
        <>
          {/* White halo for legibility */}
          <Polyline
            positions={walkCoords}
            pathOptions={{ color: '#ffffff', weight: 11, opacity: 0.55, lineCap: 'round', lineJoin: 'round' }}
          />
          {/* Thick green dashed line */}
          <Polyline
            positions={walkCoords}
            pathOptions={{ color: '#10b981', weight: 5, dashArray: '10 8', opacity: 1, lineCap: 'round', lineJoin: 'round' }}
          />
        </>
      )}
      {/* Fallback straight line while OSRM loads */}
      {!walkCoords && routeDisplay.walkFrom && origin && (
        <Polyline
          positions={[routeDisplay.walkFrom, [origin.lat, origin.lng]]}
          pathOptions={{ color: '#10b981', weight: 3, dashArray: '6 6', opacity: 0.5 }}
        />
      )}
      {/* 🚶 Person marker at user GPS position */}
      {routeDisplay.walkFrom && (() => {
        const walkIcon = L.divIcon({
          html: `<div style="
            width:36px; height:36px; border-radius:50%;
            background:linear-gradient(135deg,#059669,#10b981);
            border:3px solid #fff;
            box-shadow:0 3px 12px rgba(5,150,105,.7);
            display:flex; align-items:center; justify-content:center;
            font-size:18px; line-height:1;
          ">🚶</div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        return (
          <Marker position={routeDisplay.walkFrom!} icon={walkIcon}>
            <Popup>
              <div style={{ fontWeight: 700, color: '#059669' }}>📍 Votre position GPS</div>
              {walkCoords && origin && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#334155' }}>
                  → {origin.name}
                </div>
              )}
            </Popup>
          </Marker>
        );
      })()}

      {/* Bus segments : couleur distincte par index (bleu=1er, vert=2ème…) */}
      {routeDisplay.segments.map((seg, i) => {
        const key = `${seg.lineId}:${seg.fromStopId}:${seg.toStopId}`;
        const coords = busCoords[key];
        if (!coords) return null;
        const segColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

        return (
          <React.Fragment key={i}>
            {/* Halo blanc */}
            <Polyline positions={coords} pathOptions={{ color: '#fff', weight: 14, opacity: 0.35, lineCap: 'round' }} />
            {/* Tracé principal couleur distincte */}
            <Polyline positions={coords} pathOptions={{ color: segColor, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
          </React.Fragment>
        );
      })}

      {/* Origin marker A */}
      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={makeLetterIcon('A', '#059669')} zIndexOffset={1000}>
          <Popup>
            <div style={{ fontWeight: 700 }}>{origin.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Départ</div>
          </Popup>
        </Marker>
      )}

      {/* Destination marker B */}
      {dest && (
        <Marker position={[dest.lat, dest.lng]} icon={makeLetterIcon('B', '#dc2626')} zIndexOffset={1000}>
          <Popup>
            <div style={{ fontWeight: 700 }}>{dest.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Arrivée</div>
          </Popup>
        </Marker>
      )}

      {/* Transfer stop markers */}
      {transfers.map((stop, i) => {
        const lineNames = routeDisplay.segments.map(s => s.lineName).join(' → ');
        return (
          <Marker key={i} position={[stop.lat, stop.lng]} icon={makeTransferIcon(lineNames)} zIndexOffset={900}>
            <Popup>
              <div style={{ fontWeight: 700 }}>{stop.name}</div>
              <div style={{ fontSize: 11, color: '#d97706' }}>Correspondance</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lineNames}</div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// ── ZoomTracker (sous-composant interne) ──────────────────────
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

// ── Stop clustering icons & logic ───────────────────────────
const makeClusterIcon = (count: number, popularity: number) => {
  let color = '#2563eb'; // bleu (DDD / BRT / default)
  let glow = 'rgba(37, 99, 235, 0.4)';
  if (count > 8) {
    color = '#7c3aed'; // violet (BRT / premium)
    glow = 'rgba(124, 58, 237, 0.5)';
  } else if (count > 3) {
    color = '#d97706'; // orange/ambre (AFTU / warning)
    glow = 'rgba(217, 119, 6, 0.5)';
  }

  const size = Math.min(50, Math.max(32, 26 + count * 2));

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${color};
        border:3.5px solid white;
        box-shadow:0 0 16px ${glow}, 0 4px 12px rgba(0,0,0,0.4);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-family:'Inter',sans-serif;
        font-size:12px;
        font-weight:900;
        cursor:pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      " class="stop-cluster-marker">
        ${count}
        <div style="
          position:absolute;
          inset:-6px;
          border-radius:50%;
          border:1.5px solid ${color};
          opacity:0.3;
          animation: cluster-pulse 2s infinite ease-out;
        "></div>
      </div>
      <style>
        @keyframes cluster-pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .stop-cluster-marker:hover {
          transform: scale(1.12);
          box-shadow: 0 0 20px ${color}, 0 6px 16px rgba(0,0,0,0.5);
        }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const getClusterThreshold = (zoom: number): number => {
  if (zoom >= 16) return 0.0002;
  if (zoom === 15) return 0.0012;
  if (zoom === 14) return 0.0028;
  if (zoom === 13) return 0.0055;
  if (zoom === 12) return 0.011;
  if (zoom === 11) return 0.022;
  return 0.045;
};

interface StopCluster {
  id: string;
  lat: number;
  lng: number;
  stops: Stop[];
  popularity: number;
}

const performClustering = (stops: Stop[], zoom: number): StopCluster[] => {
  const clusters: StopCluster[] = [];
  const threshold = getClusterThreshold(zoom);

  stops.forEach(stop => {
    let merged = false;
    for (const cluster of clusters) {
      const dlat = stop.lat - cluster.lat;
      const dlng = stop.lng - cluster.lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      if (dist < threshold) {
        cluster.stops.push(stop);
        const len = cluster.stops.length;
        cluster.lat = (cluster.lat * (len - 1) + stop.lat) / len;
        cluster.lng = (cluster.lng * (len - 1) + stop.lng) / len;
        cluster.popularity += stop.lines.length;
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        id: `cluster-${stop.id}`,
        lat: stop.lat,
        lng: stop.lng,
        stops: [stop],
        popularity: stop.lines.length,
      });
    }
  });

  return clusters;
};

function ClusteredStops({ stops, zoom }: { stops: Stop[]; zoom: number }) {
  const map = useMap();
  const dispatch = useAppDispatch();
  const clusters = performClustering(stops, zoom);

  return (
    <>
      {clusters.map(cluster => {
        if (cluster.stops.length > 1) {
          const icon = makeClusterIcon(cluster.stops.length, cluster.popularity);
          return (
            <Marker
              key={cluster.id}
              position={[cluster.lat, cluster.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  map.setView([cluster.lat, cluster.lng], Math.min(17, map.getZoom() + 2), { animate: true });
                }
              }}
            />
          );
        } else {
          const stop = cluster.stops[0];
          const mainOp = stop.operators[0];
          const color = OPERATORS[mainOp]?.color || '#1a56db';
          const isHub = stop.lines.length > 2;
          const size = isHub ? 15 : (stop.lines.length > 1 ? 12 : 10);
          const icon = isHub ? makeTerminusIcon(color) : makeStopIcon(color, size);
          return (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={icon}
              eventHandlers={{ click: () => dispatch(setSelectedStop(stop.id)) }}>
              <Popup maxWidth={240} minWidth={210}>
                <StopPopup stop={stop} />
              </Popup>
            </Marker>
          );
        }
      })}
    </>
  );
}


export default function MapView() {
  const dispatch = useAppDispatch();
  const { selectedOperator, userLocation, route, focusedLine, busPositions, routeDisplay } = useAppSelector(s => s.mobility);
  const { theme } = useAppSelector(s => s.ui);
  const darkMode = useAppSelector(s => s.ui.darkMode);
  const [loadingCount, setLoadingCount] = useState(0);
  const [routeCoords, setRouteCoords]   = useState<[number, number][] | null>(null);
  const [locLoading, setLocLoading]     = useState(false);
  const [fullscreen, setFullscreen]     = useState(false);
  const [currentZoom, setCurrentZoom]   = useState(12);

  // Plein écran natif (avec fallback CSS)
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (!fullscreen) {
      const el = mapWrapRef.current;
      if (el?.requestFullscreen) { el.requestFullscreen().catch(() => {}); }
      else { setFullscreen(true); }
    } else {
      if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
      else { setFullscreen(false); }
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // routeMode = using old direct-road TripRoute (only when no bus routeDisplay)
  const routeMode = !!(route?.origin && route?.destination && !routeDisplay);

  const visibleLines = routeMode ? [] : (
    focusedLine
      ? LINES.filter(l => l.id === focusedLine)
      : (selectedOperator === 'all' ? LINES : LINES.filter(l => l.operator === selectedOperator))
  );

  const routeStopIds = routeMode
    ? [route.origin?.id, route.destination?.id].filter(Boolean) as string[]
    : focusedLine ? (LINES.find(l => l.id === focusedLine)?.stops || []) : null;

  // ── Filtre mer : polygone simplifié de la presqu'île de Dakar ──
  const DAKAR_POLY: [number, number][] = [
    [14.6450,-17.4430],[14.6650,-17.4550],[14.6900,-17.4780],[14.7100,-17.4950],
    [14.7300,-17.5000],[14.7450,-17.5150],[14.7600,-17.5050],[14.7700,-17.4800],
    [14.7700,-17.4400],[14.8000,-17.3800],[14.8600,-17.3000],[14.8600,-17.0500],
    [14.6500,-17.0500],[14.6450,-17.4430],
  ];
  const stopOnLand = (lat: number, lng: number) => {
    let inside = false;
    const poly = DAKAR_POLY;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  const allVisibleStops = routeMode ? [] : routeStopIds
    ? STOPS.filter(s => routeStopIds.includes(s.id))
    : (selectedOperator === 'all' ? STOPS : STOPS.filter(s => s.operators.includes(selectedOperator as any)));

  // Dédoublonnage par position géographique : si deux arrêts sont à moins de 20m,
  // on garde celui qui a le plus d'opérateurs (hubs BRT/DDD colocalisés → un seul marqueur)
  const visibleStops = allVisibleStops.filter((stop, idx) => {
    if (!stopOnLand(stop.lat, stop.lng)) return false; // exclure les stops en mer
    if (selectedOperator !== 'all') return true; // pas de dédup quand on filtre par opérateur
    return !allVisibleStops.some((other, oidx) => {
      if (oidx >= idx) return false;
      const dlat = Math.abs(stop.lat - other.lat);
      const dlng = Math.abs(stop.lng - other.lng);
      // ~20m threshold
      if (dlat > 0.0002 || dlng > 0.0002) return false;
      // garde l'arrêt avec le plus d'opérateurs/lignes
      return other.lines.length >= stop.lines.length;
    });
  });

  useEffect(() => {
    if (routeMode) { setLoadingCount(0); return; }
    const t = setInterval(() => {
      const c = visibleLines.filter(l => lineRouteCache[l.id]).length;
      setLoadingCount(c < visibleLines.length ? visibleLines.length - c : 0);
    }, 600);
    return () => clearInterval(t);
  }, [selectedOperator, focusedLine, routeMode, visibleLines.length]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        dispatch(setMapCenter(loc));
        dispatch(setMapZoom(16));
        dispatch(setUserLocation(loc));
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { timeout: 8000 }
    );
  };

  return (
    <div ref={mapWrapRef} style={{
      position: fullscreen ? 'fixed' : 'relative',
      inset: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 9999 : undefined,
      flex: 1, overflow: 'hidden', height: '100%',
      background: '#e8eaf0',
    }}>

      {/* Loading indicator */}
      {!routeMode && loadingCount > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[900] glass rounded-2xl px-4 py-2 text-xs font-bold text-blue-400 flex items-center gap-2 border border-blue-500/20 shadow-xl">
          <span className="animate-spin inline-block">◌</span>
          Tracés… ({loadingCount})
        </div>
      )}

      {routeMode && !routeCoords && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[900] bg-blue-600 text-white rounded-2xl px-5 py-2.5 shadow-lg text-xs font-bold flex items-center gap-2">
          <span className="animate-spin inline-block">◌</span>
          Calcul itinéraire sur routes réelles…
        </div>
      )}

      {/* Focused line banner */}
      {!routeMode && focusedLine && (() => {
        const fl = LINES.find(l => l.id === focusedLine);
        if (!fl) return null;
        const liveBuses = busPositions.filter((b: BusPosition) => b.lineId === focusedLine);
        return (
          <div className="absolute top-3 left-3 z-[900] rounded-2xl shadow-2xl overflow-hidden max-w-xs"
            style={{ background: 'rgba(10,15,30,.92)', backdropFilter: 'blur(16px)', border: `1px solid ${fl.color}40` }}>
            <div className="h-1" style={{ background: fl.color }} />
            <div className="px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-sm">{fl.name}</span>
                  {liveBuses.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(74,222,128,.15)', color: '#4ade80' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'live-pulse 2s infinite' }} />
                      {liveBuses.length} bus
                    </span>
                  )}
                </div>
                <p className="text-[10px] truncate" style={{ color: '#64748b' }}>{fl.route}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: fl.color + '20', color: fl.color }}>
                  {fl.freq}
                </div>
                <button onClick={() => dispatch(clearFocusedLine())}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors"
                  style={{ background: 'rgba(255,255,255,.08)', color: '#64748b' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Info barre et timeline déplacées dans RoutePanel (cadre blanc en bas) */}

      {/* Fullscreen button */}
      <button onClick={toggleFullscreen} title={fullscreen ? 'Quitter plein écran' : 'Plein écran'}
        className="absolute z-[9000] rounded-xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        style={{
          width: 44, height: 44,
          top: 12, right: 12,
          background: fullscreen ? 'rgba(37,99,235,.9)' : 'rgba(15,23,42,.85)',
          backdropFilter: 'blur(8px)',
          border: fullscreen ? '1px solid rgba(96,165,250,.5)' : '1px solid rgba(255,255,255,.1)',
          fontSize: 16,
        }}>
        {fullscreen ? '⊡' : '⤢'}
      </button>

      {/* Bouton retour itinéraire — visible en plein écran avec ou sans route calculée */}
      {fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute z-[9000] flex items-center gap-2 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
          style={{
            top: 68, left: 12,
            padding: '10px 16px',
            background: routeDisplay ? 'rgba(29,78,216,.95)' : 'rgba(8,12,24,.92)',
            backdropFilter: 'blur(16px)',
            border: routeDisplay ? '1px solid rgba(96,165,250,.5)' : '1px solid rgba(255,255,255,.15)',
            color: 'white',
            fontSize: 13,
            fontWeight: 800,
            boxShadow: routeDisplay ? '0 4px 20px rgba(29,78,216,.5)' : '0 4px 16px rgba(0,0,0,.5)',
          }}>
          ← {routeDisplay ? 'Itinéraire' : 'Retour'}
        </button>
      )}

      {/* Geolocate button */}
      <button onClick={handleLocate} title="Ma position"
        className="absolute bottom-20 right-4 z-[900] w-12 h-12 rounded-xl border border-blue-500/20 shadow-xl flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-all"
        style={{ background: 'rgba(15,23,42,.9)', backdropFilter: 'blur(8px)' }}>
        {locLoading ? <span className="animate-spin text-blue-400 text-base">◌</span> : '📍'}
      </button>

      <MapContainer center={[14.7167, -17.4677]} zoom={12}
        style={{ width: '100%', height: '100%', background: '#e8eaf0' }} zoomControl={true}>
        {/* Tuiles adaptées au thème */}
        <TileLayer
          url={theme === 'natural'
            ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"}
          attribution=""
          keepBuffer={4}
        />
        <ZoomTracker onZoom={setCurrentZoom} />
        <MapController />
        <RouteOverlay />

        {/* FocusedLineOverlay masquée quand un itinéraire calculé est affiché */}
        {!routeMode && !routeDisplay && focusedLine && (() => {
          const fl = LINES.find(l => l.id === focusedLine);
          if (!fl) return null;
          return (
            <>
              {/* Dim all other lines */}
              {visibleLines.filter(l => l.id !== focusedLine).map(line => (
                <BusLine key={line.id} line={line} isFocused={false} hasFocus={true} />
              ))}
              {/* Full focused overlay */}
              <FocusedLineOverlay line={fl} />
            </>
          );
        })()}

        {/* Normal mode: all lines + simple stop markers — masqué quand un itinéraire est actif */}
        {!routeMode && !focusedLine && !routeDisplay && (
          <>
            {visibleLines.map(line => (
              <BusLine key={line.id} line={line} isFocused={false} hasFocus={false} />
            ))}
            {/* Stops et clusters au zoom >= 11 pour éviter la surcharge globale */}
            {currentZoom >= 11 && (
              <ClusteredStops stops={visibleStops} zoom={currentZoom} />
            )}
          </>
        )}

        {routeMode && route?.origin && route?.destination && (
          <>
            <TripRoute origin={route.origin} destination={route.destination}
              onCoordsReady={c => setRouteCoords(c)} />
            {routeCoords && <FitRouteBounds coords={routeCoords} />}
          </>
        )}

        {routeMode && route?.origin && (
          <Marker position={[route.origin.lat, route.origin.lng]} icon={originIcon} zIndexOffset={1000}>
            <Popup>
              <div style={{ padding: 12, fontFamily: 'Inter', background: '#ffffff', borderRadius: 12 }}>
                <div style={{ fontWeight: 900, color: '#059669' }}>🟢 Départ</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{route.origin.name}</div>
              </div>
            </Popup>
          </Marker>
        )}
        {routeMode && route?.destination && (
          <Marker position={[route.destination.lat, route.destination.lng]} icon={destIcon} zIndexOffset={1000}>
            <Popup>
              <div style={{ padding: 12, fontFamily: 'Inter', background: '#ffffff', borderRadius: 12 }}>
                <div style={{ fontWeight: 900, color: '#dc2626' }}>🔴 Arrivée</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{route.destination.name}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div style={{ padding: 12, fontFamily: 'Inter', background: '#ffffff', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
                  📍 Ma position
                </div>
              </Popup>
            </Marker>
            <Circle center={userLocation} radius={200} color="#1a56db" fillColor="#1a56db" fillOpacity={0.08} weight={1.5} />
          </>
        )}

        {/* Bus simulés masqués quand un itinéraire est affiché */}
        {!routeMode && !routeDisplay && (() => {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
          // Sur mobile : max 6 bus (1 par opérateur principal), sur desktop : tous
          const visibleBuses = isMobile
            ? busPositions.filter((_: BusPosition, idx: number) => idx < 6)
            : busPositions;
          return visibleBuses;
        })().map((bus: BusPosition, i: number) => {
          const line = LINES.find(l => l.id === bus.lineId);
          const color = line?.color || '#10b981';
          const driver = MOCK_DRIVERS[bus.busId] ?? Object.values(MOCK_DRIVERS).find(d => d.lineId === bus.lineId);
          const isOnFocusedLine = focusedLine && bus.lineId === focusedLine;
          // Hide buses not on focused line
          if (focusedLine && !isOnFocusedLine) return null;

          const busIcon = isOnFocusedLine
            ? L.divIcon({
                className: '',
                html: `<div style="position:relative;width:34px;height:34px">
                  <div style="position:absolute;inset:0;border-radius:50%;background:${color}30;animation:pr 2s ease-out infinite"></div>
                  <div style="position:absolute;inset:4px;border-radius:50%;background:${color};border:3px solid white;
                    box-shadow:0 0 20px ${color},0 4px 12px rgba(0,0,0,.6);
                    display:flex;align-items:center;justify-content:center;font-size:12px">🚌</div>
                </div>
                <style>@keyframes pr{0%{transform:scale(.8);opacity:.8}100%{transform:scale(2.2);opacity:0}}</style>`,
                iconSize: [34, 34], iconAnchor: [17, 17],
              })
            : makeBusMarkerIcon(color, bus.speed, bus.occupancy);

          return (
            <Marker key={i} position={[bus.lat, bus.lng]} icon={busIcon}
              zIndexOffset={isOnFocusedLine ? 1000 : 0}>
              <Popup maxWidth={240}>
                <div style={{ padding: 12, fontFamily: 'Inter', background: '#ffffff', borderRadius: 12 }}>
                  <div style={{ fontWeight: 900, color, fontSize: 13, marginBottom: 8 }}>
                    {line?.name ?? bus.lineId}
                    <span style={{ fontWeight: 500, color: '#64748b', marginLeft: 6, fontSize: 11 }}>{line?.operator}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                    <div style={{ color: '#64748b' }}>🚌 {driver?.plate ?? 'N/A'}</div>
                    <div style={{ color: '#059669', fontWeight: 700 }}>{bus.speed} km/h</div>
                    <div style={{ color: '#64748b' }}>👤 {driver?.name ?? '—'}</div>
                    <div style={{ color: '#64748b' }}>👥 {bus.occupancy}% plein</div>
                  </div>
                  {driver?.phone && (
                    <div style={{ marginTop: 8, fontSize: 10, color: '#475569' }}>📞 {driver.phone}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
