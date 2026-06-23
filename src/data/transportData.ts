// ══════════════════════════════════════════════════════════════
//  SunuBRT — Données réseau BRT + DDD rabattement
//  Circuit réel Petersen (Plateau) ↔ Guédiawaye (18,3 km)
// ══════════════════════════════════════════════════════════════

import type { Operator, Stop, Line, Departure, AffluenceData, ComfortIndex } from '@/types';

// ── Opérateurs ─────────────────────────────────────────────────
export const OPERATORS: Record<string, Operator> = {
  BRT: {
    id: 'BRT',
    name: 'BRT',
    fullName: 'SunuBRT — Bus Rapid Transit',
    icon: '🚍',
    color: '#00b450',
    bg: '#e8f5e9',
    tarif: 300,
    climatise: true,
  },
  DDD: {
    id: 'DDD',
    name: 'DDD',
    fullName: 'Dakar Dem Dikk (Rabattement)',
    icon: '🚌',
    color: '#1a56db',
    bg: '#eff6ff',
    tarif: 200,
    climatise: false,
  },
  YANGO: {
    id: 'YANGO',
    name: 'Yango',
    fullName: 'Yango — VTC Last Mile',
    icon: '🚖',
    color: '#ff3d00',
    bg: '#fff3f0',
    tarif: 0,
    climatise: true,
  },
};

// ── Arrêts BRT (circuit officiel Petersen → Guédiawaye) ────────
// Pôles d'échange : b01, b08, b15, b16, b23
export const STOPS: Record<string, Stop> = {
  // ── BRT Ligne principale ──────────────────────────────────
  b01: { id:'b01', name:'Petersen',              zone:'Plateau',       lat:14.6811, lng:-17.4464, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B2','BRT-B3','BRT-B4'], isPole:true,  isTerminus:true  },
  b02: { id:'b02', name:'Médina Carrefour',       zone:'Médina',        lat:14.6867, lng:-17.4471, operators:['BRT'],       lines:['BRT-B1'] },
  b03: { id:'b03', name:'Colobane',               zone:'Médina',        lat:14.6908, lng:-17.4478, operators:['BRT'],       lines:['BRT-B1'] },
  b04: { id:'b04', name:'Liberté 5',              zone:'Liberté',       lat:14.7133, lng:-17.4500, operators:['BRT','DDD'], lines:['BRT-B1'] },
  b05: { id:'b05', name:'Liberté 6',              zone:'Liberté',       lat:14.7200, lng:-17.4558, operators:['BRT'],       lines:['BRT-B1','BRT-B3'] },
  b06: { id:'b06', name:'Grand Yoff',             zone:'Grand Yoff',    lat:14.7268, lng:-17.4553, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B3'] },
  b07: { id:'b07', name:'CICES — Nord Foire',     zone:'Grand Yoff',    lat:14.7350, lng:-17.4670, operators:['BRT','DDD'], lines:['BRT-B1'] },
  b08: { id:'b08', name:"Patte d'Oie",            zone:"Patte d'Oie",   lat:14.7247, lng:-17.4672, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B2','BRT-B3','BRT-B4'], isPole:true },
  b09: { id:'b09', name:'Zone de Captage',        zone:'Cambérène',     lat:14.7389, lng:-17.4711, operators:['BRT','DDD'], lines:['BRT-B1'] },
  b10: { id:'b10', name:'VDN Cambérène',           zone:'Cambérène',     lat:14.7500, lng:-17.4472, operators:['BRT'],       lines:['BRT-B1'] },
  b11: { id:'b11', name:'Cambérène Cité Nations',  zone:'Cambérène',     lat:14.7633, lng:-17.4292, operators:['BRT','DDD'], lines:['BRT-B1'] },
  b12: { id:'b12', name:'Parcelles Carrefour',    zone:'Parcelles',     lat:14.7583, lng:-17.4308, operators:['BRT'],       lines:['BRT-B1'] },
  b13: { id:'b13', name:'Sam Notaire',            zone:'Sam Notaire',   lat:14.7672, lng:-17.4072, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B2','BRT-B3'] },
  b14: { id:'b14', name:'Sam Notaire Marché',     zone:'Sam Notaire',   lat:14.7700, lng:-17.4040, operators:['BRT'],       lines:['BRT-B1'] },
  b15: { id:'b15', name:'Guédiawaye HCW',         zone:'Guédiawaye',    lat:14.7750, lng:-17.4022, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B2','BRT-B4'], isPole:true },
  b16: { id:'b16', name:'Guédiawaye Marché',      zone:'Guédiawaye',    lat:14.7769, lng:-17.3986, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B2','BRT-B3','BRT-B4'], isPole:true },
  b17: { id:'b17', name:'Wakhinane Nimzat',       zone:'Guédiawaye',    lat:14.7833, lng:-17.4025, operators:['BRT'],       lines:['BRT-B1'] },
  b18: { id:'b18', name:'Golf Franc',             zone:'Guédiawaye',    lat:14.7825, lng:-17.3968, operators:['BRT'],       lines:['BRT-B1'] },
  b19: { id:'b19', name:"Cité Aliou Sow",         zone:'Guédiawaye',    lat:14.7780, lng:-17.3962, operators:['BRT'],       lines:['BRT-B1'] },
  b20: { id:'b20', name:'Golf Sud',               zone:'Guédiawaye',    lat:14.7808, lng:-17.3942, operators:['BRT'],       lines:['BRT-B1','BRT-B2'] },
  b21: { id:'b21', name:'Médina Gounass',         zone:'Guédiawaye',    lat:14.7906, lng:-17.3956, operators:['BRT'],       lines:['BRT-B1','BRT-B2','BRT-B3'] },
  b22: { id:'b22', name:'Diamalaye',              zone:'Guédiawaye',    lat:14.7720, lng:-17.4030, operators:['BRT'],       lines:['BRT-B1'] },
  b23: { id:'b23', name:'Guédiawaye Terminus',    zone:'Guédiawaye',    lat:14.7850, lng:-17.3890, operators:['BRT','DDD'], lines:['BRT-B1','BRT-B2','BRT-B3','BRT-B4'], isPole:true, isTerminus:true },

  // ── Hubs DDD (terminus rabattement) ──────────────────────
  d01: { id:'d01', name:'Leclerc Terminus',        zone:'Médina',        lat:14.7117, lng:-17.4567, operators:['DDD'], lines:['DDD-F3'] },
  d02: { id:'d02', name:'Pikine Gare Routière',    zone:'Pikine',        lat:14.7499, lng:-17.3858, operators:['DDD'], lines:['DDD-F2','DDD-F8'] },
  d03: { id:'d03', name:'Keur Massar Marché',      zone:'Keur Massar',   lat:14.7833, lng:-17.3183, operators:['DDD'], lines:['DDD-F4'] },
  d04: { id:'d04', name:'Parcelles Terminus',      zone:'Parcelles',     lat:14.7583, lng:-17.4308, operators:['DDD'], lines:['DDD-F1'] },
  d05: { id:'d05', name:'Ouakam Terminus',         zone:'Ouakam',        lat:14.7186, lng:-17.4897, operators:['DDD'], lines:['DDD-F6'] },
  d06: { id:'d06', name:'Yoff Village',            zone:'Yoff',          lat:14.7467, lng:-17.4903, operators:['DDD'], lines:['DDD-F7'] },
  d07: { id:'d07', name:'Thiaroye Marché',         zone:'Thiaroye',      lat:14.7358, lng:-17.3533, operators:['DDD'], lines:['DDD-F8'] },
  d08: { id:'d08', name:'Rufisque Gare',           zone:'Rufisque',      lat:14.7153, lng:-17.2747, operators:['DDD'], lines:['DDD-F10'] },
  d09: { id:'d09', name:'Malika Terminus',         zone:'Malika',        lat:14.7958, lng:-17.3475, operators:['DDD'], lines:['DDD-F9'] },
  d10: { id:'d10', name:'Nord Foire DDD',          zone:'Grand Yoff',    lat:14.7358, lng:-17.4639, operators:['DDD'], lines:['DDD-F5'] },
  d11: { id:'d11', name:'Cambérène Terminus DDD',  zone:'Cambérène',     lat:14.7683, lng:-17.4248, operators:['DDD'], lines:['DDD-F1'] },
  d12: { id:'d12', name:'Zone Captage DDD',        zone:'Cambérène',     lat:14.7389, lng:-17.4711, operators:['DDD'], lines:['DDD-F5'] },
};

// ── Lignes BRT ─────────────────────────────────────────────────
export const LINES: Record<string, Line> = {
  'BRT-B1': {
    id: 'BRT-B1',
    name: 'B1 — Omnibus',
    route: 'Petersen ↔ Guédiawaye Terminus',
    color: '#00b450',
    freq: '6 min',
    tarif: 300,
    operator: 'BRT',
    stops: ['b01','b02','b03','b04','b05','b06','b07','b08','b09','b10','b11','b12','b13','b14','b15','b16','b17','b18','b19','b20','b21','b22','b23'],
  },
  'BRT-B2': {
    id: 'BRT-B2',
    name: 'B2 — Semi-Express',
    route: 'Petersen ↔ Guédiawaye via pôles',
    color: '#00c853',
    freq: '10 min',
    tarif: 300,
    operator: 'BRT',
    isExpress: true,
    stops: ['b01','b08','b13','b15','b16','b20','b21','b23'],
  },
  'BRT-B3': {
    id: 'BRT-B3',
    name: 'B3 — Semi-Express Pointe',
    route: 'Petersen ↔ Médina Gounass (heures de pointe)',
    color: '#69f0ae',
    freq: '8 min',
    tarif: 300,
    operator: 'BRT',
    isExpress: true,
    stops: ['b01','b05','b06','b08','b13','b16','b21','b23'],
  },
  'BRT-B4': {
    id: 'BRT-B4',
    name: 'B4 — Express ✦',
    route: 'Petersen ↔ Guédiawaye (express — prochainement)',
    color: '#1de9b6',
    freq: '15 min',
    tarif: 400,
    operator: 'BRT',
    isExpress: true,
    stops: ['b01','b08','b15','b23'],
  },

  // ── Lignes DDD Rabattement ──────────────────────────────
  'DDD-F1': {
    id: 'DDD-F1',
    name: 'F1 — Parcelles → Petersen',
    route: 'Parcelles Terminus → Cambérène → Petersen BRT',
    color: '#1a56db',
    freq: '12 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d04','d11','b11','b08','b01'],
  },
  'DDD-F2': {
    id: 'DDD-F2',
    name: 'F2 — Pikine → Guédiawaye',
    route: 'Pikine Gare → Guédiawaye HCW & Marché BRT',
    color: '#1a56db',
    freq: '10 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d02','b13','b15','b16'],
  },
  'DDD-F3': {
    id: 'DDD-F3',
    name: 'F3 — Leclerc → Petersen',
    route: 'Leclerc → Liberté 5 → Grand Yoff → Petersen BRT',
    color: '#1a56db',
    freq: '8 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d01','b04','b06','b01'],
  },
  'DDD-F4': {
    id: 'DDD-F4',
    name: 'F4 — Keur Massar → Sam Notaire',
    route: 'Keur Massar → Sam Notaire → Guédiawaye HCW BRT',
    color: '#1a56db',
    freq: '15 min',
    tarif: 250,
    operator: 'DDD',
    stops: ['d03','b13','b15'],
  },
  'DDD-F5': {
    id: 'DDD-F5',
    name: "F5 — Zone Captage → Patte d'Oie",
    route: "Zone Captage → Nord Foire → Patte d'Oie BRT",
    color: '#1a56db',
    freq: '10 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d12','d10','b07','b08'],
  },
  'DDD-F6': {
    id: 'DDD-F6',
    name: 'F6 — Ouakam → Petersen',
    route: 'Ouakam → Grand Yoff → Petersen BRT',
    color: '#1a56db',
    freq: '15 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d05','b06','b03','b01'],
  },
  'DDD-F7': {
    id: 'DDD-F7',
    name: "F7 — Yoff → Patte d'Oie",
    route: "Yoff Village → Patte d'Oie BRT",
    color: '#1a56db',
    freq: '20 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d06','b08'],
  },
  'DDD-F8': {
    id: 'DDD-F8',
    name: 'F8 — Thiaroye → Guédiawaye',
    route: 'Thiaroye → Pikine → Guédiawaye HCW BRT',
    color: '#1a56db',
    freq: '15 min',
    tarif: 200,
    operator: 'DDD',
    stops: ['d07','d02','b13','b15'],
  },
  'DDD-F9': {
    id: 'DDD-F9',
    name: 'F9 — Malika → Guédiawaye',
    route: 'Malika → Guédiawaye HCW → Terminus BRT',
    color: '#1a56db',
    freq: '20 min',
    tarif: 250,
    operator: 'DDD',
    stops: ['d09','b15','b23'],
  },
  'DDD-F10': {
    id: 'DDD-F10',
    name: 'F10 — Rufisque Express',
    route: 'Rufisque → Guédiawaye Marché BRT',
    color: '#1a56db',
    freq: '25 min',
    tarif: 300,
    operator: 'DDD',
    stops: ['d08','d02','b16'],
  },
};

// ── Helpers ─────────────────────────────────────────────────────
export function getAllStops(): Stop[] {
  return Object.values(STOPS);
}

export function getStopsByOperator(opId: string): Stop[] {
  return Object.values(STOPS).filter(s => s.operators.includes(opId as any));
}

export function getLinesByOperator(opId: string): Line[] {
  return Object.values(LINES).filter(l => l.operator === opId);
}

export function getStopsForLine(lineId: string): Stop[] {
  const line = LINES[lineId];
  if (!line) return [];
  return line.stops.map(id => STOPS[id]).filter(Boolean);
}

const BRT_FREQ: Record<string, number> = {
  'BRT-B1': 6, 'BRT-B2': 10, 'BRT-B3': 8, 'BRT-B4': 15,
  'DDD-F1': 12, 'DDD-F2': 10, 'DDD-F3': 8, 'DDD-F4': 15,
  'DDD-F5': 10, 'DDD-F6': 15, 'DDD-F7': 20, 'DDD-F8': 15,
  'DDD-F9': 20, 'DDD-F10': 25,
};

export function getNextDepartures(stopId: string): Departure[] {
  const stop = STOPS[stopId];
  if (!stop) return [];
  const now = new Date();
  return stop.lines.map(lineId => {
    const line = LINES[lineId];
    if (!line) return null;
    const freq = BRT_FREQ[lineId] ?? 10;
    const wait = Math.floor(Math.random() * freq);
    const depTime = new Date(now.getTime() + wait * 60000);
    const hh = depTime.getHours().toString().padStart(2,'0');
    const mm = depTime.getMinutes().toString().padStart(2,'0');
    return {
      lineId,
      lineName: line.name,
      operator: line.operator,
      color: line.color,
      route: line.route,
      waitMin: wait,
      time: `${hh}:${mm}`,
      comfort: getComfortIndex(lineId),
    } satisfies Departure;
  }).filter(Boolean) as Departure[];
}

export function getAffluence(stopId: string): AffluenceData {
  const poles = ['b01','b08','b15','b16','b23'];
  const isPole = poles.includes(stopId);
  const h = new Date().getHours();
  const isPeak = (h >= 7 && h <= 9) || (h >= 17 && h <= 20);
  const base = isPole ? 0.6 : 0.35;
  const pct = Math.min(0.98, base + (isPeak ? 0.25 : 0) + Math.random() * 0.1);
  if (pct > 0.85) return { level:'Bondé',   pct, color:'#dc2626', emoji:'🔴', extra:'Prochain bus dans 6 min' };
  if (pct > 0.65) return { level:'Chargé',  pct, color:'#f59e0b', emoji:'🟡', extra:'Places limitées' };
  if (pct > 0.40) return { level:'Modéré',  pct, color:'#00b450', emoji:'🟢', extra:'Confortable' };
  return                 { level:'Fluide',  pct, color:'#1a56db', emoji:'🔵', extra:'Très confortable' };
}

export function getComfortIndex(lineId: string): ComfortIndex {
  const line = LINES[lineId];
  if (!line) return { score:5, label:'Inconnu', color:'#64748b', emoji:'❓' };
  if (line.operator === 'BRT') {
    return { score:9, label:'Excellent — Climatisé', color:'#00b450', emoji:'❄️' };
  }
  const h = new Date().getHours();
  const isPeak = (h >= 7 && h <= 9) || (h >= 17 && h <= 20);
  return isPeak
    ? { score:5, label:'Chargé (heure de pointe)', color:'#f59e0b', emoji:'😅' }
    : { score:7, label:'Confortable',              color:'#1a56db', emoji:'😊' };
}

export const REPORT_TYPES: { type: string; label: string; emoji: string }[] = [
  { type: 'delay',       label: 'Retard',         emoji: '⏱️' },
  { type: 'accident',    label: 'Accident',        emoji: '🚨' },
  { type: 'crowd',       label: 'Surcharge',       emoji: '👥' },
  { type: 'harcelement', label: 'Harcèlement',     emoji: '🆘' },
  { type: 'panne',       label: 'Panne véhicule',  emoji: '🔧' },
  { type: 'other',       label: 'Autre',           emoji: '💬' },
];

export const POIS = [
  { id:'poi1', name:'Hôpital Le Dantec',    lat:14.6780, lng:-17.4436, category:'santé',    emoji:'🏥', nearestStop:'b01' },
  { id:'poi2', name:'Université Dakar',      lat:14.6917, lng:-17.4611, category:'éducation',emoji:'🎓', nearestStop:'b03' },
  { id:'poi3', name:'Stade Léopold Sédar',   lat:14.7178, lng:-17.4547, category:'sport',    emoji:'🏟️', nearestStop:'b04' },
  { id:'poi4', name:'CICES Foire',           lat:14.7350, lng:-17.4650, category:'commerce', emoji:'🛍️', nearestStop:'b07' },
  { id:'poi5', name:'Pôle Patte d\'Oie',    lat:14.7247, lng:-17.4680, category:'commerce', emoji:'🏬', nearestStop:'b08' },
  { id:'poi6', name:'Hôpital Guédiawaye',   lat:14.7750, lng:-17.4020, category:'santé',    emoji:'🏥', nearestStop:'b15' },
  { id:'poi7', name:'Marché Guédiawaye',    lat:14.7769, lng:-17.3990, category:'marché',   emoji:'🛒', nearestStop:'b16' },
  { id:'poi8', name:'Mairie Guédiawaye',    lat:14.7860, lng:-17.3900, category:'admin',    emoji:'🏛️', nearestStop:'b23' },
];

// ── Yango — zones de prise en charge aux pôles BRT ────────────
export interface YangoZone {
  stopId: string;
  stopName: string;
  lat: number;
  lng: number;
  yangoPickupLabel: string;
  estimatedWaitMin: number;
  deeplink: string;
}

export const YANGO_ZONES: YangoZone[] = [
  {
    stopId: 'b01',
    stopName: 'Petersen',
    lat: 14.6811,
    lng: -17.4464,
    yangoPickupLabel: 'Sortie BRT Petersen — côté Plateau',
    estimatedWaitMin: 3,
    deeplink: 'yango://route?pickup_lat=14.6811&pickup_lng=-17.4464&pickup_name=BRT+Petersen',
  },
  {
    stopId: 'b08',
    stopName: "Patte d'Oie",
    lat: 14.7247,
    lng: -17.4672,
    yangoPickupLabel: "Pôle BRT Patte d'Oie — sortie nord",
    estimatedWaitMin: 2,
    deeplink: "yango://route?pickup_lat=14.7247&pickup_lng=-17.4672&pickup_name=BRT+Patte+d'Oie",
  },
  {
    stopId: 'b15',
    stopName: 'Guédiawaye HCW',
    lat: 14.7750,
    lng: -17.4022,
    yangoPickupLabel: 'Pôle BRT Guédiawaye HCW — entrée hôpital',
    estimatedWaitMin: 4,
    deeplink: 'yango://route?pickup_lat=14.7750&pickup_lng=-17.4022&pickup_name=BRT+Gueediawaye+HCW',
  },
  {
    stopId: 'b16',
    stopName: 'Guédiawaye Marché',
    lat: 14.7769,
    lng: -17.3986,
    yangoPickupLabel: 'Pôle BRT Guédiawaye Marché — côté marché',
    estimatedWaitMin: 3,
    deeplink: 'yango://route?pickup_lat=14.7769&pickup_lng=-17.3986&pickup_name=BRT+Gueediawaye+Marche',
  },
  {
    stopId: 'b23',
    stopName: 'Guédiawaye Terminus',
    lat: 14.7850,
    lng: -17.3890,
    yangoPickupLabel: 'Terminus BRT Guédiawaye — zone VTC',
    estimatedWaitMin: 2,
    deeplink: 'yango://route?pickup_lat=14.7850&pickup_lng=-17.3890&pickup_name=BRT+Terminus+Gueediawaye',
  },
];

export function getYangoZone(stopId: string): YangoZone | undefined {
  return YANGO_ZONES.find(z => z.stopId === stopId);
}

export function openYango(zone: YangoZone): void {
  // Deeplink natif → fallback web store si Yango non installé
  window.location.href = zone.deeplink;
  setTimeout(() => {
    window.open('https://play.google.com/store/apps/details?id=ru.ridetech.driver', '_blank');
  }, 1200);
}

export const LS_PREFIX = 'sunubrt_';
