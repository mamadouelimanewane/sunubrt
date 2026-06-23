/**
 * fleetSimulation.ts
 * Moteur de données temps réel pour les gestionnaires de flottes DDD et BRT.
 * Génère : roster véhicules, statuts dynamiques, incidents, revenus, messages.
 */

import { LINES } from '@/data/transportData';

// ── Types ────────────────────────────────────────────────────────
export type VehicleStatus = 'en_service' | 'ralenti' | 'arret_prolonge' | 'panne' | 'hors_service';
export type IncidentType  = 'panne_moteur' | 'accident' | 'retard_trafic' | 'surcharge' | 'arret_prolonge' | 'deviation' | 'pneu_crevé';
export type IncidentSeverity = 'faible' | 'moyen' | 'critique';
export type MessageDir = 'dispatch→driver' | 'driver→dispatch';

export interface FleetVehicle {
  id: string;
  plate: string;
  lineId: string;
  operator: 'DDD' | 'BRT';
  driverName: string;
  driverPhone: string;
  driverId: string;
  status: VehicleStatus;
  capacity: number;
  vehicleType: 'grand_bus' | 'car_rapide' | 'minibus';
  lastMaintenanceDays: number;   // jours depuis la dernière révision
  kmTotal: number;
  kmToday: number;
  fuelPct: number;               // 0–100
  year: number;
}

export interface FleetIncident {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  lineId: string;
  lineName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  timestamp: number;
  acknowledged: boolean;
  dispatchedAt?: number;
  resolvedAt?: number;
  location?: [number, number];
}

export interface FleetMessage {
  id: string;
  vehicleId: string;
  driverName: string;
  direction: MessageDir;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface RevenueEntry { lineId: string; lineName: string; amount: number; trips: number; }
export interface DailyRevenue {
  today: number;
  yesterday: number;
  week: number;
  month: number;
  byLine: RevenueEntry[];
  hourly: number[];   // 24 valeurs
}

// ── Noms sénégalais réalistes ────────────────────────────────────
const DDD_NAMES = [
  'Modou Diallo','Ibrahima Sow','Ousmane Ndiaye','Mamadou Fall','Aliou Gaye',
  'Cheikh Ba','Abdou Sy','Lamine Diouf','Pape Mbaye','Serigne Touba',
  'Alioune Badara','Moussa Diatta','Omar Sène','Babacar Faye','Souleymane Diop',
  'Ndéye Fatou','Assane Cissé','Boubacar Diallo','Tidiane Ndiaye','Samba Thiam',
  'Mansour Fall','Idrissa Gueye','Pape Diagne','Abdoulaye Wade','Malick Niang',
  'Thierno Mbaye','Khadim Ba','Landing Badji','Momar Talla','Boucounta Diallo',
];
const BRT_NAMES = [
  'Sadio Faye','Baye Dame','Serigne Moustapha','Malick Sarr','Issa Diallo',
  'Amadou Lamine','Daouda Ndiaye','Baïdy Fall','Cheikh Ahmed','Mbaye Dieng',
  'Pape Matar','Oumar Konaté','Ibou Diallo','Samba Badji','Landing Mané',
  'Arfang Diatta','Bourama Diabaté','Fodé Sylla','Seydou Kouyaté','Adama Coulibaly',
  'Mamadou Bah','Alpha Bah','Mory Camara','Aliou Baldé','Ousmane Diallo',
  'Demba Sow','Aly Ndiaye','Boucar Diarra','Souleymane Koné','Yaya Coulibaly',
];

// ── Générateur pseudo-aléatoire déterministe (seed-based) ────────
function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function pickPlate(rng: () => number, i: number, op: 'DDD' | 'BRT'): string {
  const num = 1000 + Math.floor(rng() * 8999);
  const letters = op === 'DDD' ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'BCDFGHJKLMNPQRSTVWXYZ';
  const c1 = letters[Math.floor(rng() * letters.length)];
  const c2 = letters[Math.floor(rng() * letters.length)];
  return `DK-${num}-${c1}${c2}`;
}

function pickStatus(rng: () => number): VehicleStatus {
  const r = rng();
  if (r < 0.72) return 'en_service';
  if (r < 0.82) return 'ralenti';
  if (r < 0.89) return 'arret_prolonge';
  if (r < 0.95) return 'panne';
  return 'hors_service';
}

// ── Génération du roster ─────────────────────────────────────────
function buildRoster(operator: 'DDD' | 'BRT'): FleetVehicle[] {
  const lines  = LINES.filter(l => l.operator === operator);
  const names  = operator === 'DDD' ? DDD_NAMES : BRT_NAMES;
  const buses  = operator === 'DDD' ? 3 : 2;  // véhicules par ligne en moyenne
  const rng    = seededRand(operator === 'DDD' ? 42 : 137);

  const vehicles: FleetVehicle[] = [];
  let idx = 0;

  for (const line of lines) {
    const count = buses + (rng() > 0.6 ? 1 : 0); // 2-4 véhicules par ligne
    for (let k = 1; k <= count; k++) {
      const plate = pickPlate(rng, idx, operator);
      vehicles.push({
        id:      `bus_${line.id}_${k}`,
        plate,
        lineId:  line.id,
        operator,
        driverName:  names[idx % names.length],
        driverPhone: `+221 ${['77','76','70','78'][idx % 4]} ${String(100 + (idx % 900)).padStart(3,'0')} ${String(idx % 100).padStart(2,'0')} ${String((idx * 7) % 100).padStart(2,'0')}`,
        driverId:    `${operator.toLowerCase()}_d${String(idx).padStart(3,'0')}`,
        status:      pickStatus(rng),
        capacity:    operator === 'DDD' ? 60 : 80,
        vehicleType: operator === 'DDD' ? 'grand_bus' : (rng() > 0.5 ? 'grand_bus' : 'minibus'),
        lastMaintenanceDays: Math.floor(rng() * 120),
        kmTotal:    100000 + Math.floor(rng() * 200000),
        kmToday:    Math.floor(rng() * 220),
        fuelPct:    10 + Math.floor(rng() * 85),
        year:       2010 + Math.floor(rng() * 14),
      });
      idx++;
    }
  }
  return vehicles;
}

// Rosters statiques (générés une seule fois)
export const DDD_FLEET  = buildRoster('DDD');
export const BRT_FLEET  = buildRoster('BRT');

export function getFleet(op: 'DDD' | 'BRT') {
  return op === 'DDD' ? DDD_FLEET : BRT_FLEET;
}

// ── Incidents auto-générés ────────────────────────────────────────
const INCIDENT_TEMPLATES: Record<IncidentType, { label: string; severity: IncidentSeverity }> = {
  panne_moteur:    { label: 'Panne moteur — véhicule immobilisé', severity: 'critique' },
  accident:        { label: 'Accrochage signalé — dommages légers', severity: 'moyen' },
  retard_trafic:   { label: 'Retard trafic — embouteillage détecté', severity: 'faible' },
  surcharge:       { label: 'Surcharge passagers — taux >90 %', severity: 'moyen' },
  arret_prolonge:  { label: 'Arrêt prolongé sans raison signalée (>8 min)', severity: 'moyen' },
  deviation:       { label: 'Déviation non autorisée détectée', severity: 'moyen' },
  pneu_crevé:      { label: 'Crevaison signalée par le chauffeur', severity: 'critique' },
};

let _incidentCounter = 1000;

export function generateIncidents(fleet: FleetVehicle[], existing: FleetIncident[]): FleetIncident[] {
  const incidents = [...existing];
  const now = Date.now();

  // Génère 0-2 nouveaux incidents toutes les ~30s
  const rng = seededRand(now % 100000);

  if (rng() > 0.65) {
    // Cherche un véhicule en panne ou arret prolonge
    const candidates = fleet.filter(v =>
      (v.status === 'panne' || v.status === 'arret_prolonge') &&
      !incidents.some(i => i.vehicleId === v.id && !i.resolvedAt)
    );
    if (candidates.length > 0) {
      const v = candidates[Math.floor(rng() * candidates.length)];
      const type: IncidentType = v.status === 'panne' ? 'panne_moteur' : 'arret_prolonge';
      const tmpl = INCIDENT_TEMPLATES[type];
      const line = LINES.find(l => l.id === v.lineId);
      incidents.unshift({
        id:           `inc_${_incidentCounter++}`,
        vehicleId:    v.id,
        vehiclePlate: v.plate,
        lineId:       v.lineId,
        lineName:     line?.name ?? v.lineId,
        type,
        severity:     tmpl.severity,
        description:  tmpl.label,
        timestamp:    now - Math.floor(rng() * 10 * 60 * 1000),
        acknowledged: false,
      });
    }
  }

  // Supprime incidents résolus depuis > 1h
  return incidents.filter(i => !i.resolvedAt || (now - i.resolvedAt < 3600_000)).slice(0, 50);
}

// ── Seed incidents initiaux ───────────────────────────────────────
function seedIncidents(fleet: FleetVehicle[]): FleetIncident[] {
  const rng  = seededRand(9999);
  const now  = Date.now();
  const inc: FleetIncident[] = [];
  const types = Object.keys(INCIDENT_TEMPLATES) as IncidentType[];

  for (let i = 0; i < 8; i++) {
    const v = fleet[Math.floor(rng() * fleet.length)];
    const type = types[Math.floor(rng() * types.length)];
    const tmpl = INCIDENT_TEMPLATES[type];
    const line = LINES.find(l => l.id === v.lineId);
    inc.push({
      id:           `inc_seed_${i}`,
      vehicleId:    v.id,
      vehiclePlate: v.plate,
      lineId:       v.lineId,
      lineName:     line?.name ?? v.lineId,
      type,
      severity:     tmpl.severity,
      description:  tmpl.label,
      timestamp:    now - Math.floor(rng() * 60 * 60 * 1000),
      acknowledged: rng() > 0.5,
    });
  }
  return inc;
}

export const DDD_INCIDENTS_SEED  = seedIncidents(DDD_FLEET);
export const BRT_INCIDENTS_SEED  = seedIncidents(BRT_FLEET);

// ── Revenus simulés ───────────────────────────────────────────────
export function computeRevenue(fleet: FleetVehicle[]): DailyRevenue {
  const rng = seededRand(fleet.length * 7 + 3);
  const activeFleet = fleet.filter(v => v.status === 'en_service' || v.status === 'ralenti');

  const lineGroups: Record<string, FleetVehicle[]> = {};
  for (const v of activeFleet) {
    if (!lineGroups[v.lineId]) lineGroups[v.lineId] = [];
    lineGroups[v.lineId].push(v);
  }

  const tarif = fleet[0]?.operator === 'DDD' ? 200 : 300;
  const byLine: RevenueEntry[] = Object.entries(lineGroups).map(([lineId, buses]) => {
    const line  = LINES.find(l => l.id === lineId);
    const trips = buses.length * (12 + Math.floor(rng() * 8));   // 12-20 rotations/jour/bus
    const amount = trips * tarif * (20 + Math.floor(rng() * 20)); // 20-40 passagers/rotation
    return { lineId, lineName: line?.name ?? lineId, amount, trips };
  }).sort((a, b) => b.amount - a.amount);

  const today   = byLine.reduce((s, r) => s + r.amount, 0);
  const yesterday = Math.floor(today * (0.88 + rng() * 0.22));
  const week    = today * 6 + Math.floor(rng() * today * 0.8);
  const month   = week * 4 + Math.floor(rng() * today * 2);

  // Profil horaire : faible la nuit, pic matin (7-9h) et soir (17-19h)
  const hourProfile = [0.01,0.01,0.01,0.01,0.02,0.04,0.07,0.09,0.08,0.06,0.05,0.04,
                       0.04,0.04,0.05,0.06,0.07,0.08,0.07,0.05,0.04,0.03,0.02,0.01];
  const hourly = hourProfile.map(w => Math.round(today * w * (0.9 + rng() * 0.2)));

  return { today, yesterday, week, month, byLine, hourly };
}

// ── Messages de dispatch ──────────────────────────────────────────
const MSG_TEMPLATES_DISPATCH = [
  'Veuillez accélérer la rotation — terminus chargé.',
  'Signalement passager reçu sur votre ligne. Vérifiez.',
  'Changement itinéraire : déviation pont Hann.',
  'Comptez vos passagers au prochain arrêt.',
  'Retour dépôt prévu à 21h00 ce soir.',
];
const MSG_TEMPLATES_DRIVER = [
  'Embouteillage au rond-point VDN, retard estimé 15 min.',
  'Panne de clim. Passagers inconfortables.',
  'Accident devant moi, je dévie par Liberté 5.',
  'Bus plein, je ne peux plus charger.',
  'Crevaison arrière, besoin assistance.',
  'Fin de service dans 20 min, qui reprend ?',
];

export function generateMessages(fleet: FleetVehicle[], op: 'DDD' | 'BRT'): FleetMessage[] {
  const rng = seededRand(fleet.length + (op === 'DDD' ? 1 : 2));
  const now = Date.now();
  const msgs: FleetMessage[] = [];

  for (let i = 0; i < 12; i++) {
    const v   = fleet[Math.floor(rng() * fleet.length)];
    const dir: MessageDir = rng() > 0.5 ? 'dispatch→driver' : 'driver→dispatch';
    const templates = dir === 'dispatch→driver' ? MSG_TEMPLATES_DISPATCH : MSG_TEMPLATES_DRIVER;
    msgs.push({
      id:          `msg_${op}_${i}`,
      vehicleId:   v.id,
      driverName:  v.driverName,
      direction:   dir,
      text:        templates[Math.floor(rng() * templates.length)],
      timestamp:   now - Math.floor(rng() * 4 * 3600_000),
      read:        rng() > 0.4,
    });
  }
  return msgs.sort((a, b) => b.timestamp - a.timestamp);
}
