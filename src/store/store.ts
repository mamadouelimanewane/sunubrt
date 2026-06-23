import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OperatorId, Stop, BusPosition, Lang, Ticket, CrowdsourceReport, Toast, ActiveJourney, JourneyRecord, JourneyStatus } from '@/types';

// ── Pass Mensuel types ─────────────────────────────────────────
export type PassType = 'mensuel_brt' | 'mensuel_brt_ddd' | 'scolaire' | 'famille' | 'entreprise';
export interface MonthlyPass {
  id: string;
  type: PassType;
  operator: OperatorId | 'all';
  holderName: string;
  price: number;
  purchaseTime: number;
  validUntil: number;
  usedRides: number;
  qrData: string;
  status: 'active' | 'expired';
}
export const PASS_CATALOG: Record<PassType, {
  label: string; emoji: string; operator: OperatorId|'all';
  price: number; duration: number; desc: string; color: string;
  maxRides: number | null;
}> = {
  mensuel_brt:     { label: 'Pass BRT Mensuel',    emoji: '🚍', operator: 'BRT', price: 8_000,  duration: 30, desc: 'Voyages illimités sur les 4 lignes BRT (B1·B2·B3·B4)', color: '#00b450', maxRides: null },
  mensuel_brt_ddd: { label: 'Pass BRT + DDD',      emoji: '🌐', operator: 'all', price: 14_000, duration: 30, desc: 'BRT illimité + rabattement DDD — réseau complet Dakar', color: '#00c853', maxRides: null },
  scolaire:        { label: 'Pass Étudiant',        emoji: '📚', operator: 'BRT', price: 5_000,  duration: 30, desc: 'Tarif réduit BRT pour élèves et étudiants',             color: '#059669', maxRides: 60   },
  famille:         { label: 'Pass Famille (×4)',   emoji: '👨‍👩‍👧‍👦', operator: 'all', price: 25_000, duration: 30, desc: '4 voyageurs BRT + DDD illimités — économisez 40%',    color: '#f59e0b', maxRides: null },
  entreprise:      { label: 'Pass Entreprise',     emoji: '🏢', operator: 'BRT', price: 60_000, duration: 30, desc: '10 pass BRT mensuels — solution mobilité entreprise',    color: '#1a56db', maxRides: null },
};

// ── Mobility Slice ─────────────────────────────────────────────
export interface RouteSegmentDisplay {
  lineId: string;
  lineName: string;
  color: string;
  fromStopId: string;
  toStopId: string;
}
export interface RouteDisplay {
  segments: RouteSegmentDisplay[];
  originStopId: string;
  destStopId: string;
  transferStopIds: string[];
  walkFrom: [number, number] | null;
  fare?: number;
}

interface MobilityState {
  activeTab: 'plan' | 'lines' | 'stops' | 'alerts' | 'tickets' | 'profile';
  selectedOperator: OperatorId;
  selectedStop: string | null;
  focusedLine: string | null;
  userLocation: [number, number] | null;
  mapCenter: [number, number];
  mapZoom: number;
  route: { origin: Stop | null; destination: Stop | null };
  busPositions: BusPosition[];
  routeDisplay: RouteDisplay | null;
}

const mobilitySlice = createSlice({
  name: 'mobility',
  initialState: {
    activeTab: 'plan',
    selectedOperator: 'all',
    selectedStop: null,
    focusedLine: null,
    userLocation: null,
    mapCenter: [14.7167, -17.4677] as [number, number],
    mapZoom: 11,
    route: { origin: null, destination: null },
    busPositions: [],
    routeDisplay: null,
  } as MobilityState,
  reducers: {
    setActiveTab: (s, a: PayloadAction<MobilityState['activeTab']>) => { s.activeTab = a.payload; },
    setSelectedOperator: (s, a: PayloadAction<OperatorId>) => { s.selectedOperator = a.payload; },
    setSelectedStop: (s, a: PayloadAction<string | null>) => { s.selectedStop = a.payload; },
    setFocusedLine: (s, a: PayloadAction<string>) => { s.focusedLine = a.payload; },
    clearFocusedLine: (s) => { s.focusedLine = null; },
    setUserLocation: (s, a: PayloadAction<[number, number]>) => { s.userLocation = a.payload; },
    setMapCenter: (s, a: PayloadAction<[number, number]>) => { s.mapCenter = a.payload; },
    setMapZoom: (s, a: PayloadAction<number>) => { s.mapZoom = a.payload; },
    setRouteOrigin: (s, a: PayloadAction<Stop | null>) => { s.route.origin = a.payload; },
    setRouteDestination: (s, a: PayloadAction<Stop | null>) => { s.route.destination = a.payload; },
    clearRoute: (s) => { s.route = { origin: null, destination: null }; },
    setBusPositions: (s, a: PayloadAction<BusPosition[]>) => { s.busPositions = a.payload; },
    setRouteDisplay: (s, a: PayloadAction<RouteDisplay | null>) => { s.routeDisplay = a.payload; },
  },
});

// ── Auth Slice ────────────────────────────────────────────────
import type { UserRole } from '@/types';
interface AuthState {
  role: UserRole;
  name: string;
  lineId: string | null;
  isAuthenticated: boolean;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    role: 'passenger' as UserRole,
    name: 'Voyageur',
    lineId: null,
    isAuthenticated: false,
  } as AuthState,
  reducers: {
    loginPassenger: (s) => {
      s.role = 'passenger'; s.name = 'Voyageur'; s.isAuthenticated = true;
    },
    loginDriver: (s, a: PayloadAction<{ name: string; lineId: string }>) => {
      s.role = 'driver'; s.name = a.payload.name; s.lineId = a.payload.lineId; s.isAuthenticated = true;
    },
    loginAdmin: (s, a: PayloadAction<{ name: string }>) => {
      s.role = 'admin'; s.name = a.payload.name; s.isAuthenticated = true;
    },
    logout: (s) => { s.role = 'passenger'; s.name = 'Voyageur'; s.lineId = null; s.isAuthenticated = false; },
  },
});

// ── UI Slice ──────────────────────────────────────────────────
export type AppTheme = 'dark' | 'dim' | 'light' | 'natural' | 'dakar-night' | 'sahel';

interface UIState {
  darkMode: boolean;   // true si theme !== 'light' (rétro-compat MapView etc.)
  theme: AppTheme;
  autoTheme: boolean;
  lang: Lang;
  sidebarCollapsed: boolean;
  showQR: boolean;
  notifEnabled: boolean;
  a11yMode: boolean;
}

function getAutoTheme(): AppTheme {
  const h = new Date().getHours();
  return h < 6 || h >= 19 ? 'dark' : 'light';
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'dark' as AppTheme,
    darkMode: true,   // rétro-compat : true quand theme !== 'light'
    autoTheme: false,
    lang: 'fr' as Lang,
    sidebarCollapsed: false,
    showQR: false,
    notifEnabled: false,
    a11yMode: false,
  } as UIState,
  reducers: {
    toggleDarkMode: (s) => {
      s.theme = s.theme === 'light' ? 'dark' : 'light';
      s.darkMode = s.theme !== 'light';
      s.autoTheme = false;
    },
    setTheme: (s, a: PayloadAction<AppTheme>) => {
      s.theme = a.payload;
      s.darkMode = a.payload !== 'light';
      s.autoTheme = false;
    },
    setAutoTheme: (s, a: PayloadAction<boolean>) => {
      s.autoTheme = a.payload;
      if (a.payload) {
        s.theme = getAutoTheme();
        s.darkMode = s.theme !== 'light';
      }
    },
    setLang: (s, a: PayloadAction<Lang>) => { s.lang = a.payload; },
    toggleSidebar: (s) => { s.sidebarCollapsed = !s.sidebarCollapsed; },
    setShowQR: (s, a: PayloadAction<boolean>) => { s.showQR = a.payload; },
    setNotifEnabled: (s, a: PayloadAction<boolean>) => { s.notifEnabled = a.payload; },
    toggleA11yMode: (s) => { s.a11yMode = !s.a11yMode; },
  },
});

// ── Ticket Slice ────────────────────────────────────────────────
interface TicketState {
  myTickets: Ticket[];
  reports: CrowdsourceReport[];
  adminRevenue: Record<OperatorId, number>;
}

const ticketSlice = createSlice({
  name: 'tickets',
  initialState: {
    myTickets: [],
    reports: [
      { id: '1', type: 'delay', description: 'Bouchon énorme sur VDN, retard estimé 20 min', location: [14.71, -17.46] as [number, number], timestamp: Date.now() - 1000 * 60 * 15, upvotes: 12 },
      { id: '2', type: 'accident', description: 'Accident au croisement Liberté 6 / VDN', location: [14.73, -17.45] as [number, number], timestamp: Date.now() - 1000 * 60 * 45, upvotes: 5 },
      { id: '3', type: 'crowd', description: 'Arrêt Petersen très chargé, bus pleins', location: [14.678, -17.44] as [number, number], timestamp: Date.now() - 1000 * 60 * 8, upvotes: 23 },
    ] as CrowdsourceReport[],
    adminRevenue: { BRT: 1_250_000, DDD: 320000, all: 0 },
  } as TicketState,
  reducers: {
    buyTicket: (s, a: PayloadAction<Omit<Ticket, 'id' | 'purchaseTime' | 'status' | 'qrData'>>) => {
      const id = Math.random().toString(36).substring(2, 11).toUpperCase();
      const ticket: Ticket = {
        ...a.payload,
        id,
        purchaseTime: Date.now(),
        status: 'valid',
        qrData: `TICKET-${id}-${a.payload.operator}-${Date.now()}`,
      };
      s.myTickets.push(ticket);
      s.adminRevenue[a.payload.operator] = (s.adminRevenue[a.payload.operator] || 0) + a.payload.price;
    },
    useTicket: (s, a: PayloadAction<string>) => {
      const t = s.myTickets.find(x => x.id === a.payload);
      if (t) t.status = 'used';
    },
    addReport: (s, a: PayloadAction<CrowdsourceReport>) => {
      s.reports.unshift(a.payload);
    },
    upvoteReport: (s, a: PayloadAction<string>) => {
      const r = s.reports.find(x => x.id === a.payload);
      if (r) r.upvotes += 1;
    },
    acknowledgeReport: (s, a: PayloadAction<string>) => {
      s.reports = s.reports.filter(r => r.id !== a.payload);
    },
  },
});

// ── Pass Slice ───────────────────────────────────────────────
interface PassState { myPasses: MonthlyPass[]; passSales: Record<PassType, number>; }
const passSlice = createSlice({
  name: 'passes',
  initialState: { myPasses: [], passSales: { mensuel_brt:0, mensuel_brt_ddd:0, scolaire:0, famille:0, entreprise:0 } } as PassState,
  reducers: {
    buyPass: (s, a: PayloadAction<{ type: PassType; holderName: string; payMethod: string }>) => {
      const cfg = PASS_CATALOG[a.payload.type];
      const id = Math.random().toString(36).substring(2, 11).toUpperCase();
      const now = Date.now();
      s.myPasses.push({
        id, type: a.payload.type, operator: cfg.operator, holderName: a.payload.holderName,
        price: cfg.price, purchaseTime: now,
        validUntil: now + cfg.duration * 86_400_000,
        usedRides: 0, qrData: `PASS-${id}-${a.payload.type.toUpperCase()}`,
        status: 'active',
      });
      s.passSales[a.payload.type] = (s.passSales[a.payload.type] || 0) + 1;
    },
    usePassRide: (s, a: PayloadAction<string>) => {
      const p = s.myPasses.find(x => x.id === a.payload);
      if (p && p.status === 'active') {
        p.usedRides++;
        if (Date.now() > p.validUntil) p.status = 'expired';
      }
    },
    expirePasses: (s) => {
      s.myPasses.forEach(p => { if (Date.now() > p.validUntil) p.status = 'expired'; });
    },
  },
});

// ── Toast Slice ───────────────────────────────────────────────
const toastSlice = createSlice({
  name: 'toasts',
  initialState: { items: [] as Toast[] },
  reducers: {
    showToast: (s, a: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = Math.random().toString(36).substring(2, 9);
      s.items.push({ ...a.payload, id });
      if (s.items.length > 3) s.items.shift();
    },
    dismissToast: (s, a: PayloadAction<string>) => {
      s.items = s.items.filter(t => t.id !== a.payload);
    },
  },
});

// ── Favorites Slice ───────────────────────────────────────────────
interface FavState {
  stopIds: string[];
  lineIds: string[];
  recentLines: string[];
  tripCount: number;
  totalFCFA: number;
  co2SavedKg: number;
  favOperator: OperatorId | null;
}

const favSlice = createSlice({
  name: 'favorites',
  initialState: {
    stopIds: [],
    lineIds: [],
    recentLines: [],
    tripCount: 0,
    totalFCFA: 0,
    co2SavedKg: 0,
    favOperator: null,
  } as FavState,
  reducers: {
    toggleFavStop: (s, a: PayloadAction<string>) => {
      const idx = s.stopIds.indexOf(a.payload);
      if (idx >= 0) s.stopIds.splice(idx, 1);
      else s.stopIds.push(a.payload);
    },
    toggleFavLine: (s, a: PayloadAction<string>) => {
      const idx = s.lineIds.indexOf(a.payload);
      if (idx >= 0) s.lineIds.splice(idx, 1);
      else s.lineIds.push(a.payload);
    },
    visitLine: (s, a: PayloadAction<string>) => {
      s.recentLines = [a.payload, ...s.recentLines.filter(id => id !== a.payload)].slice(0, 6);
    },
    recordTrip: (s, a: PayloadAction<{ fare: number; operator: OperatorId }>) => {
      s.tripCount += 1;
      s.totalFCFA += a.payload.fare;
      s.co2SavedKg += 0.12;
      s.favOperator = a.payload.operator;
    },
  },
});

// ── Active Journey Slice ──────────────────────────────────────
const journeySlice = createSlice({
  name: 'journey',
  initialState: {
    active: null as ActiveJourney | null,
    history: [] as JourneyRecord[],
    showEndModal: false,
  },
  reducers: {
    startJourney: (s, a: PayloadAction<ActiveJourney>) => {
      s.active = a.payload;
      s.showEndModal = false;
    },
    updateJourneyStatus: (s, a: PayloadAction<JourneyStatus>) => {
      if (s.active) s.active.status = a.payload;
      if (a.payload === 'arrived') s.showEndModal = true;
    },
    attachTicketToJourney: (s, a: PayloadAction<string>) => {
      if (s.active) s.active.ticketId = a.payload;
    },
    finishJourney: (s) => {
      if (!s.active) return;
      const elapsed = Math.round((Date.now() - s.active.startedAt) / 60000);
      s.history.unshift({
        id: s.active.id,
        originName: s.active.originStop.name,
        originId: s.active.originStop.id,
        destName: s.active.destinationStop.name,
        destId: s.active.destinationStop.id,
        lineId: s.active.lineId,
        operator: s.active.operator,
        fare: s.active.fare,
        duration: elapsed || s.active.estimatedDuration,
        co2: Math.round((elapsed || s.active.estimatedDuration) * 0.008 * 100) / 100,
        date: Date.now(),
      });
      if (s.history.length > 20) s.history.pop();
      s.active = null;
      s.showEndModal = false;
    },
    cancelJourney: (s) => { s.active = null; s.showEndModal = false; },
    dismissEndModal: (s) => { s.showEndModal = false; },
  },
});

// ── Gamification Slice ────────────────────────────────────────
export interface Badge { id: string; label: string; emoji: string; earnedAt: number; }
interface GamifState {
  points: number;
  badges: Badge[];
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  carpoolRequests: { id: string; userId: string; from: string; to: string; ts: number }[];
  recurringTrips: { id: string; label: string; originId: string; destId: string; days: number[]; hour: number; minute: number }[];
}
const BADGES_DEF = [
  { id: 'first_trip',   emoji: '🚌', label: 'Premier voyage',       pts: 10  },
  { id: 'trip5',        emoji: '⭐', label: '5 voyages',             pts: 50  },
  { id: 'trip20',       emoji: '🏅', label: '20 voyages',            pts: 100 },
  { id: 'sentinel',     emoji: '🛡️', label: 'Sentinelle du réseau',  pts: 75  },
  { id: 'explorer',     emoji: '🗺️', label: 'Explorateur',           pts: 60  },
  { id: 'eco_bronze',   emoji: '🥉', label: 'Éco Bronze',            pts: 30  },
  { id: 'eco_silver',   emoji: '🥈', label: 'Éco Argent',            pts: 80  },
  { id: 'eco_gold',     emoji: '🥇', label: 'Éco Or',                pts: 150 },
  { id: 'sharer',       emoji: '📤', label: 'Grand partageur',       pts: 40  },
  { id: 'planner',      emoji: '📅', label: 'Planificateur',         pts: 50  },
];
function calcLevel(pts: number): GamifState['level'] {
  if (pts >= 500) return 'platinum';
  if (pts >= 200) return 'gold';
  if (pts >= 80)  return 'silver';
  return 'bronze';
}
const gamifSlice = createSlice({
  name: 'gamif',
  initialState: {
    points: 0, badges: [], level: 'bronze',
    carpoolRequests: [], recurringTrips: [],
  } as GamifState,
  reducers: {
    addPoints: (s, a: PayloadAction<number>) => {
      s.points += a.payload;
      s.level = calcLevel(s.points);
    },
    earnBadge: (s, a: PayloadAction<string>) => {
      if (!s.badges.find(b => b.id === a.payload)) {
        const def = BADGES_DEF.find(b => b.id === a.payload);
        if (def) { s.badges.push({ id: def.id, label: def.label, emoji: def.emoji, earnedAt: Date.now() }); s.points += def.pts; s.level = calcLevel(s.points); }
      }
    },
    addCarpoolRequest: (s, a: PayloadAction<{ from: string; to: string }>) => {
      s.carpoolRequests.unshift({ id: Math.random().toString(36).slice(2,9), userId: 'moi', from: a.payload.from, to: a.payload.to, ts: Date.now() });
      if (s.carpoolRequests.length > 20) s.carpoolRequests.pop();
    },
    removeCarpoolRequest: (s, a: PayloadAction<string>) => { s.carpoolRequests = s.carpoolRequests.filter(r => r.id !== a.payload); },
    addRecurringTrip: (s, a: PayloadAction<Omit<GamifState['recurringTrips'][0], 'id'>>) => {
      s.recurringTrips.push({ ...a.payload, id: Math.random().toString(36).slice(2,9) });
    },
    removeRecurringTrip: (s, a: PayloadAction<string>) => { s.recurringTrips = s.recurringTrips.filter(r => r.id !== a.payload); },
  },
});

// ── Ads Slice ─────────────────────────────────────────────────
import type { AdCampaign } from '@/data/ads';
interface AdsState {
  impressions: Record<string, number>;  // adId → count
  clicks:      Record<string, number>;  // adId → count
  // Surcharges admin (activer/désactiver une campagne en live)
  overrides:   Record<string, 'active' | 'paused'>;
  customCampaigns: AdCampaign[];
}
const adsSlice = createSlice({
  name: 'ads',
  initialState: { impressions: {}, clicks: {}, overrides: {}, customCampaigns: [] } as AdsState,
  reducers: {
    recordImpression: (s, a: PayloadAction<string>) => {
      s.impressions[a.payload] = (s.impressions[a.payload] || 0) + 1;
    },
    recordClick: (s, a: PayloadAction<string>) => {
      s.clicks[a.payload] = (s.clicks[a.payload] || 0) + 1;
    },
    setAdOverride: (s, a: PayloadAction<{ id: string; status: 'active' | 'paused' }>) => {
      s.overrides[a.payload.id] = a.payload.status;
    },
    addCampaign: (s, a: PayloadAction<AdCampaign>) => {
      s.customCampaigns.push(a.payload);
    },
  },
});

// ── Fleet Slice ───────────────────────────────────────────────
// Stocke l'opérateur connecté en tant que gestionnaire de flotte
interface FleetState {
  operator: 'BRT' | 'DDD' | null;
  managerName: string;
}
const fleetSlice = createSlice({
  name: 'fleet',
  initialState: { operator: null, managerName: '' } as FleetState,
  reducers: {
    loginFleetManager: (s, a: PayloadAction<{ operator: 'BRT' | 'DDD'; name: string }>) => {
      s.operator = a.payload.operator;
      s.managerName = a.payload.name;
    },
    logoutFleetManager: (s) => { s.operator = null; s.managerName = ''; },
  },
});

// ── Store ─────────────────────────────────────────────────────
export const store = configureStore({
  reducer: {
    ads:      adsSlice.reducer,
    mobility: mobilitySlice.reducer,
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
    tickets: ticketSlice.reducer,
    passes:   passSlice.reducer,
    favorites: favSlice.reducer,
    toasts: toastSlice.reducer,
    journey: journeySlice.reducer,
    gamif: gamifSlice.reducer,
    fleet: fleetSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const {
  setActiveTab, setSelectedOperator, setSelectedStop,
  setFocusedLine, clearFocusedLine, setUserLocation,
  setMapCenter, setMapZoom, setRouteOrigin, setRouteDestination,
  clearRoute, setBusPositions, setRouteDisplay,
} = mobilitySlice.actions;

export const { loginPassenger, loginDriver, loginAdmin, logout } = authSlice.actions;
export const { toggleDarkMode, setTheme, setAutoTheme, setLang, toggleSidebar, setShowQR, setNotifEnabled, toggleA11yMode } = uiSlice.actions;
export const { buyTicket, useTicket, addReport, upvoteReport, acknowledgeReport } = ticketSlice.actions;
export const { toggleFavStop, toggleFavLine, recordTrip, visitLine } = favSlice.actions;
export const { showToast, dismissToast } = toastSlice.actions;
export const { startJourney, updateJourneyStatus, attachTicketToJourney, finishJourney, cancelJourney, dismissEndModal } = journeySlice.actions;
export const { addPoints, earnBadge, addCarpoolRequest, removeCarpoolRequest, addRecurringTrip, removeRecurringTrip } = gamifSlice.actions;
export const { loginFleetManager, logoutFleetManager } = fleetSlice.actions;
export const { recordImpression, recordClick, setAdOverride, addCampaign } = adsSlice.actions;
export const { buyPass, usePassRide, expirePasses } = passSlice.actions;
export { BADGES_DEF };
