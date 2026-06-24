# Architecture technique — SunuBRT

## Stack

| Couche | Technologie | Version |
|---|---|---|
| Frontend | React | 19 |
| Langage | TypeScript | 5.x |
| Build | Vite | 6.x |
| Styling | Tailwind CSS | v4 |
| État global | Redux Toolkit | 2.x |
| Cartographie | React Leaflet + OSRM | — |
| Mobile | Capacitor | 7.x |
| Déploiement | Vercel | — |

---

## Structure des fichiers

```
src/
├── components/
│   ├── MapView.tsx          # Carte Leaflet principale (bus, gares, itinéraires)
│   ├── RoutePanel.tsx       # Panneau planificateur de trajet
│   ├── StopPopup.tsx        # Popup gare (départs, Yango, départ/arrivée)
│   ├── YangoConnect.tsx     # Bouton Yango Last Mile (pôles uniquement)
│   ├── OperatorFilter.tsx   # Filtre opérateur (BRT / DDD / Tous)
│   ├── SearchBar.tsx        # Recherche intelligente (stops + lieux)
│   ├── SplashScreen.tsx     # Écran de chargement SunuBRT
│   └── admin/
│       └── LineCreator.tsx  # Créateur de lignes (admin)
│
├── data/
│   ├── transportData.ts     # Source de vérité : gares, lignes, opérateurs, Yango
│   ├── ads.ts               # Régie publicitaire simulée
│   └── dakarPlaces.ts       # Lieux d'intérêt Dakar (POI)
│
├── pages/
│   ├── PlanPage.tsx         # Accueil planificateur
│   ├── LinesPage.tsx        # Liste et détail des lignes
│   ├── StopsPage.tsx        # Liste des gares
│   ├── TicketsPage.tsx      # Wallet billets et pass
│   ├── AlertsPage.tsx       # Signalements et crowdsourcing
│   ├── ActiveJourneyPage.tsx # Trajet en cours
│   └── ProfilePage.tsx      # Profil, stats, badges, réglages
│
├── services/
│   ├── simulation.ts        # Simulation positions bus temps réel
│   ├── fleetSimulation.ts   # Simulation flotte BRT + DDD
│   └── routeFinder.ts       # Algorithme calcul d'itinéraire multimodal
│
├── store/
│   ├── store.ts             # Redux store + slices (mobility, auth, ui, tickets, passes, fleet)
│   └── hooks.ts             # useAppDispatch / useAppSelector typés
│
├── views/
│   ├── passenger/           # Interface voyageur
│   ├── driver/              # Interface chauffeur
│   ├── admin/               # AdminApp, AnalyticsPage, AdManagerPage
│   └── fleet/               # FleetManagerApp
│
├── styles/
│   └── globals.css          # Design tokens, themes, animations, responsive helpers
│
└── types.ts                 # Types TypeScript globaux
```

---

## Types clés (`src/types.ts`)

```typescript
type OperatorId = 'BRT' | 'DDD' | 'all'

interface Operator {
  id: OperatorId | 'YANGO'  // YANGO exclu de OperatorId (pas une ligne de transit)
  name: string
  fullName: string
  color: string
  bg: string
  icon: string
  climatise?: boolean
  tarif: number
}

interface Stop {
  id: string          // b01-b23 (BRT), d01-d12 (DDD)
  name: string
  lat: number
  lng: number
  zone: string
  operators: OperatorId[]
  isPole?: boolean    // Pôle d'échange BRT ↔ DDD ↔ Yango
  isTerminus?: boolean
}

interface Line {
  id: string          // BRT-B1..B4, DDD-F1..F10
  name: string
  operator: OperatorId
  color: string
  stops: string[]     // IDs des gares
  freq: string        // ex: "6 min"
  tarif: number
  route: string       // "Petersen ↔ Guédiawaye"
}

interface CrowdsourceReport {
  type: 'bonde' | 'retard' | 'panne' | 'securite' | 'harcelement'
  // ...
}
```

---

## Redux Store (`src/store/store.ts`)

### Slices

| Slice | État clé |
|---|---|
| `mobility` | `selectedOperator`, `route`, `routeDisplay`, `focusedLine`, `busPositions`, `userLocation` |
| `auth` | `role` (`passenger`/`driver`/`fleet`/`admin`), `name`, `operatorId` |
| `ui` | `activeTab`, `theme`, `darkMode`, `lang`, `notifEnabled` |
| `tickets` | `myTickets[]`, `passSales` |
| `passes` | `activePasses[]`, `PASS_CATALOG` |
| `fleet` | `operator: 'BRT' | 'DDD' | null`, `buses[]`, `incidents[]` |
| `gamif` | `points`, `badges[]`, `level`, `co2SavedKg` |
| `favorites` | `stopIds[]`, `lineIds[]`, `favOperator` |
| `journey` | `history[]`, `current` |

### Pass catalog

| Code | Label | Prix |
|---|---|---|
| `mensuel_brt` | BRT Mensuel | 8 000 F |
| `mensuel_brt_ddd` | BRT + DDD | 14 000 F |
| `scolaire` | Étudiant | 5 000 F |
| `famille` | Famille ×4 | 25 000 F |
| `entreprise` | Entreprise ×10 | 60 000 F |

---

## Thèmes CSS (`src/styles/globals.css`)

6 thèmes disponibles via `data-theme` sur `<html>` :

| Valeur | Apparence |
|---|---|
| `dark` (défaut) | Fond très sombre `#0a0f1e` |
| `dim` | Sombre modéré `#141b2d` |
| `light` | Clair `#f0f4f8` |
| `natural` | Jour chaud `#f5f0eb` |
| `dakar-night` | Noir + or `#05060f` |
| `sahel` | Sable `#f5ede0` |

---

## Couleurs officielles SunuBRT

```css
--brt:   #00b450   /* Vert officiel SunuBRT */
--brt-l: #00c853   /* Vert clair */
--brt-d: #007a36   /* Vert foncé */
--ddd:   #1a56db   /* Bleu DDD */
```
