// ══════════════════════════════════════════════════════════════
//  SunuBRT — Types TypeScript globaux
// ══════════════════════════════════════════════════════════════

export type OperatorId = 'BRT' | 'DDD' | 'all';
export type UserRole   = 'passenger' | 'driver' | 'admin' | 'super_admin';
export type Lang       = 'fr' | 'wo' | 'en';
export type Theme      = 'dark' | 'light';

export interface Operator {
  id: OperatorId | 'YANGO';
  name: string;
  fullName: string;
  icon: string;
  color: string;
  bg: string;
  tarif: number;
  climatise: boolean;
}

export interface Stop {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  operators: OperatorId[];
  lines: string[];
  isPole?: boolean;      // pôle d'échange BRT
  isTerminus?: boolean;
}

export interface Line {
  id: string;
  name: string;
  route: string;
  color: string;
  freq: string;
  tarif: number;
  stops: string[];
  operator: OperatorId;
  isExpress?: boolean;
}

export interface Departure {
  lineId: string;
  lineName: string;
  operator: OperatorId;
  color: string;
  route: string;
  waitMin: number;
  time: string;
  comfort: ComfortIndex;
}

export interface ComfortIndex {
  score: number;
  label: string;
  color: string;
  emoji: string;
}

export interface AffluenceData {
  level: string;
  pct: number;
  color: string;
  emoji: string;
  extra: string;
}

export interface Report {
  id: number;
  type: string;
  label: string;
  emoji: string;
  time: string;
  stopId: string;
}

export interface RouteResult {
  type: 'direct' | 'transfer' | 'none';
  duration: number;
  distance: number;
  fare: number;
  segments: RouteSegment[];
  transfers: number;
}

export interface RouteSegment {
  line: Line;
  fromStop: Stop;
  toStop: Stop;
  stops: Stop[];
  duration: number;
  fare: number;
}

export interface BusPosition {
  busId: string;
  lineId: string;
  lat: number;
  lng: number;
  speed: number;
  occupancy: number;
  driverId?: string;
  timestamp: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  emoji: string;
  nearestStop: string;
}

export interface Ticket {
  id: string;
  operator: OperatorId;
  lineId?: string;
  price: number;
  purchaseTime: number;
  status: 'valid' | 'used' | 'expired';
  qrData: string;
}

export interface CrowdsourceReport {
  id: string;
  type: 'delay' | 'accident' | 'crowd' | 'harcelement' | 'other';
  description: string;
  location: [number, number];
  timestamp: number;
  upvotes: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export type JourneyStatus = 'walking' | 'waiting' | 'on_bus' | 'arrived';

export interface ActiveJourney {
  id: string;
  originStop: Stop;
  destinationStop: Stop;
  walkingStop: Stop;
  walkingMeters: number;
  lineId: string;
  lineName: string;
  lineColor: string;
  operator: OperatorId;
  fare: number;
  transfers: number;
  startedAt: number;
  estimatedDuration: number;
  status: JourneyStatus;
  ticketId: string | null;
  steps?: import('@/utils/routeFinder').RouteStep[];
}

export interface JourneyRecord {
  id: string;
  originName: string;
  originId?: string;
  destName: string;
  destId?: string;
  lineId: string;
  operator: OperatorId;
  fare: number;
  duration: number;
  co2: number;
  date: number;
}
