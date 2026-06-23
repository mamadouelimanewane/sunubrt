/**
 * ads.ts — Catalogue des campagnes publicitaires SunuBus
 * En production, ces données viendraient d'une API REST.
 * Format : régie propre (Option A) — pas de réseau tiers.
 */

export type AdFormat   = 'banner' | 'card' | 'interstitial';
export type AdStatus   = 'active' | 'paused' | 'scheduled' | 'completed';
export type AdCategory = 'finance' | 'telecom' | 'retail' | 'transport' | 'civic' | 'food';

export interface AdTargeting {
  hours?:     [number, number];   // [heure_debut, heure_fin] ex: [6, 10]
  days?:      number[];           // 0=dim … 6=sam
  zones?:     string[];           // ids de zones ex: ['Plateau','Pikine']
  lines?:     string[];           // lignes ciblées ex: ['L8','A3']
  operators?: ('DDD'|'BRT'|'all')[];
}

export interface AdCampaign {
  id:           string;
  advertiser:   string;
  logo:         string;       // emoji ou URL image (on utilise emoji ici)
  tagline:      string;       // sous-titre annonceur
  category:     AdCategory;
  title:        string;
  body:         string;
  ctaLabel:     string;
  ctaUrl:       string;
  accentColor:  string;       // couleur de marque
  bgColor:      string;       // fond de la bannière
  format:       AdFormat;
  geoTarget?:   string;       // ciblage géographique (commune ou ligne)
  targeting:    AdTargeting;
  // Budget & programmation
  startDate:    number;       // timestamp ms
  endDate:      number;
  budgetFcfa:   number;       // budget total alloué
  spentFcfa:    number;       // dépensé (calculé)
  cpmFcfa:      number;       // coût pour 1000 impressions
  maxImpressions: number;
  status:       AdStatus;
  priority:     number;       // 1=haute … 5=basse (tiebreak)
  freqCap:      number;       // max affichages par session
}

const NOW   = Date.now();
const DAY   = 86_400_000;
const MONTH = 30 * DAY;

export const AD_CAMPAIGNS: AdCampaign[] = [
  // ── Finance & Paiement ────────────────────────────────────────
  {
    id:           'wave_001',
    advertiser:   'Wave',
    logo:         '💙',
    tagline:      'Le paiement mobile N°1 au Sénégal',
    category:     'finance',
    title:        'Payez votre billet avec Wave',
    body:         'Rapide, gratuit, sans file d\'attente. Rechargez et payez en un clin d\'œil.',
    ctaLabel:     'Télécharger Wave',
    ctaUrl:       'https://wave.com',
    accentColor:  '#1da1f2',
    bgColor:      'rgba(29,161,242,.12)',
    format:       'card',
    targeting:    { hours: [6, 22] },
    startDate:    NOW - 5 * DAY,
    endDate:      NOW + 25 * DAY,
    budgetFcfa:   2_500_000,
    spentFcfa:    0,
    cpmFcfa:      1_500,
    maxImpressions: 80_000,
    status:       'active',
    priority:     1,
    freqCap:      2,              // max 2× par session
  },
  {
    id:           'orange_money_001',
    advertiser:   'Orange Money',
    logo:         '🟠',
    tagline:      'Orange Sénégal',
    category:     'finance',
    title:        'Rechargez Orange Money aux arrêts partenaires',
    body:         'Plus de 500 points de vente Orange autour des arrêts DakarBus. Zéro commission ce mois.',
    ctaLabel:     'Trouver un point',
    ctaUrl:       'https://orange.sn',
    accentColor:  '#f97316',
    bgColor:      'rgba(249,115,22,.1)',
    format:       'banner',
    targeting:    { operators: ['DDD', 'BRT'], hours: [7, 21] },
    startDate:    NOW - 2 * DAY,
    endDate:      NOW + 28 * DAY,
    budgetFcfa:   1_800_000,
    spentFcfa:    0,
    cpmFcfa:      1_200,
    maxImpressions: 60_000,
    status:       'active',
    priority:     2,
    freqCap:      2,
  },
  // ── Telecom ───────────────────────────────────────────────────
  {
    id:           'free_sn_001',
    advertiser:   'Free Sénégal',
    logo:         '🔴',
    tagline:      'Free Mobile Sénégal',
    category:     'telecom',
    title:        '50 Go illimité à 3 000 FCFA/mois',
    body:         'Restez connecté dans le bus. Streaming, réseaux sociaux, maps — tout inclus.',
    ctaLabel:     'Souscrire maintenant',
    ctaUrl:       'https://free.sn',
    accentColor:  '#ef4444',
    bgColor:      'rgba(239,68,68,.1)',
    format:       'banner',
    targeting:    { hours: [6, 23] },
    startDate:    NOW,
    endDate:      NOW + 30 * DAY,
    budgetFcfa:   3_000_000,
    spentFcfa:    0,
    cpmFcfa:      1_000,
    maxImpressions: 100_000,
    status:       'active',
    priority:     2,
    freqCap:      2,
  },
  // ── Grande distribution ───────────────────────────────────────
  {
    id:           'auchan_sn_001',
    advertiser:   'Auchan Sénégal',
    logo:         '🛒',
    tagline:      'Auchan Sénégal — 12 magasins',
    category:     'retail',
    title:        'Promos Auchan près de votre arrêt',
    body:         '-30 % sur les produits laitiers ce week-end. Livraison gratuite dès 10 000 FCFA.',
    ctaLabel:     'Voir les promos',
    ctaUrl:       'https://auchan.sn',
    accentColor:  '#dc2626',
    bgColor:      'rgba(220,38,38,.1)',
    format:       'card',
    targeting:    { days: [5, 6], hours: [9, 20] },  // vendredi + samedi
    startDate:    NOW - DAY,
    endDate:      NOW + 7 * DAY,
    budgetFcfa:   800_000,
    spentFcfa:    0,
    cpmFcfa:      2_000,
    maxImpressions: 20_000,
    status:       'active',
    priority:     3,
    freqCap:      1,              // 1× par session (campagne weekend)
  },
  {
    id:           'citydia_001',
    advertiser:   'City Dia',
    logo:         '🏪',
    tagline:      'Votre supermarché de quartier',
    category:     'retail',
    title:        'City Dia — La qualité au meilleur prix',
    body:         'Présent dans tous les quartiers de Dakar. Fruits, légumes, épicerie — frais chaque matin.',
    ctaLabel:     'Trouver City Dia',
    ctaUrl:       'https://citydia.sn',
    accentColor:  '#16a34a',
    bgColor:      'rgba(22,163,74,.1)',
    format:       'banner',
    targeting:    { zones: ['Pikine','Guédiawaye','Parcelles','Médina'], hours: [7, 20] },
    startDate:    NOW,
    endDate:      NOW + MONTH,
    budgetFcfa:   1_200_000,
    spentFcfa:    0,
    cpmFcfa:      900,
    maxImpressions: 50_000,
    status:       'active',
    priority:     3,
    freqCap:      2,
  },
  // ── Transport complémentaire ──────────────────────────────────
  {
    id:           'yango_001',
    advertiser:   'Yango',
    logo:         '🚖',
    tagline:      'Votre VTC à Dakar',
    category:     'transport',
    title:        'Continuez votre trajet avec Yango',
    body:         'Premier kilomètre offert pour les nouveaux utilisateurs. De votre arrêt jusqu\'à destination.',
    ctaLabel:     'Commander Yango',
    ctaUrl:       'https://yango.com',
    accentColor:  '#7c3aed',
    bgColor:      'rgba(124,58,237,.1)',
    format:       'card',
    targeting:    { hours: [17, 23] },  // heure de pointe soir
    startDate:    NOW - 3 * DAY,
    endDate:      NOW + 27 * DAY,
    budgetFcfa:   2_000_000,
    spentFcfa:    0,
    cpmFcfa:      1_800,
    maxImpressions: 45_000,
    status:       'active',
    priority:     2,
    freqCap:      1,              // Yango : 1× par session max
  },
  {
    id:           'aibd_001',
    advertiser:   'AIBD',
    logo:         '✈️',
    tagline:      'Aéroport International Blaise Diagne',
    category:     'transport',
    title:        'Navette AIBD ↔ Dakar Centre',
    body:         'Service express depuis Gare Routière de Dakar. 3 700 FCFA. Départs toutes les heures.',
    ctaLabel:     'Réserver ma place',
    ctaUrl:       'https://aibd.aero',
    accentColor:  '#0284c7',
    bgColor:      'rgba(2,132,199,.06)',
    format:       'card',           // interstitiel → card (non bloquant)
    targeting:    { lines: ['L52','L64','L15'], hours: [5, 22] },
    startDate:    NOW,
    endDate:      NOW + 60 * DAY,
    budgetFcfa:   5_000_000,
    spentFcfa:    0,
    cpmFcfa:      2_000,
    maxImpressions: 30_000,
    status:       'active',
    priority:     2,
    freqCap:      1,                // max 1× par session
  },
  // ── Alimentation & Livraison ─────────────────────────────────
  {
    id:           'jumia_food_001',
    advertiser:   'Jumia Food',
    logo:         '🍔',
    tagline:      'Livraison de repas à Dakar',
    category:     'food',
    title:        'Faim en rentrant ? Commandez Jumia Food',
    body:         'Livraison en 30 min depuis votre arrêt. -15 % sur votre première commande avec le code BUS15.',
    ctaLabel:     'Commander maintenant',
    ctaUrl:       'https://food.jumia.sn',
    accentColor:  '#f59e0b',
    bgColor:      'rgba(245,158,11,.1)',
    format:       'card',
    targeting:    { hours: [11, 14], days: [1, 2, 3, 4, 5] }, // midi semaine
    startDate:    NOW - DAY,
    endDate:      NOW + 30 * DAY,
    budgetFcfa:   1_500_000,
    spentFcfa:    0,
    cpmFcfa:      1_400,
    maxImpressions: 55_000,
    status:       'active',
    priority:     2,
    freqCap:      2,
  },
  // ── Fintech locale ────────────────────────────────────────────
  {
    id:           'intouch_001',
    advertiser:   'InTouch',
    logo:         '📲',
    tagline:      'InTouch — Transfert d\'argent instantané',
    category:     'finance',
    title:        'Envoyez de l\'argent sans frais avec InTouch',
    body:         'Transfert mobile vers Tigo Cash, Orange Money, Wave et Free Money. 0 FCFA de commission jusqu\'au 31 juillet.',
    ctaLabel:     'Essayer InTouch',
    ctaUrl:       'https://intouchgroup.net',
    accentColor:  '#6366f1',
    bgColor:      'rgba(99,102,241,.1)',
    format:       'banner',
    targeting:    { hours: [7, 22], zones: ['Dakar','Plateau','Médina','Pikine','Guédiawaye'] },
    startDate:    NOW,
    endDate:      NOW + 45 * DAY,
    budgetFcfa:   2_000_000,
    spentFcfa:    0,
    cpmFcfa:      1_100,
    maxImpressions: 75_000,
    status:       'active',
    priority:     2,
    freqCap:      2,
  },
  // ── Campagnes DÉMO — DDD & BRT ───────────────────────────────
  {
    id:           'ddd_promo_001',
    advertiser:   'Dakar Dem Dikk',
    logo:         '🚌',
    tagline:      'Le réseau bus officiel de Dakar',
    category:     'transport',
    title:        '🎉 Abonnement mensuel DDD à 9 900 FCFA',
    body:         'Voyages illimités sur toutes les lignes DDD pendant 30 jours. Rechargeable sur Wave, Orange Money ou aux guichets.',
    ctaLabel:     'Souscrire l\'abonnement',
    ctaUrl:       'https://dakardemdikk.sn',
    accentColor:  '#2563eb',
    bgColor:      'rgba(37,99,235,.14)',
    format:       'card',
    targeting:    { operators: ['DDD'], hours: [6, 22] },
    startDate:    NOW,
    endDate:      NOW + 60 * DAY,
    budgetFcfa:   0,
    spentFcfa:    0,
    cpmFcfa:      0,
    maxImpressions: 500_000,
    status:       'active',
    priority:     1,
    freqCap:      3,
  },
  {
    id:           'brt_promo_001',
    advertiser:   'Dakar BRT',
    logo:         '🚍',
    tagline:      'Bus Rapid Transit — Dakar',
    category:     'transport',
    title:        '✨ BRT Dakar — Service express climatisé',
    body:         'Pikine ↔ Plateau en 35 min. Climatisé, Wi-Fi, paiement mobile. Nouveau réseau en service.',
    ctaLabel:     'Voir les lignes BRT',
    ctaUrl:       'https://brt.sn',
    accentColor:  '#00b450',
    bgColor:      'rgba(0,180,80,.12)',
    format:       'card',
    targeting:    { operators: ['BRT'], hours: [5, 23] },
    startDate:    NOW,
    endDate:      NOW + 60 * DAY,
    budgetFcfa:   0,
    spentFcfa:    0,
    cpmFcfa:      0,
    maxImpressions: 500_000,
    status:       'active',
    priority:     1,
    freqCap:      3,
  },

  // ── Campagne civique ──────────────────────────────────────────
  {
    id:           'dakar_propre_001',
    advertiser:   'Mairie de Dakar',
    logo:         '🌿',
    tagline:      'Ville de Dakar — Service Propreté',
    category:     'civic',
    title:        'Dakar Propre — Ensemble protégeons notre ville',
    body:         'Ne jetez pas vos déchets dans les rues. Utilisez les poubelles aux arrêts de bus.',
    ctaLabel:     'En savoir plus',
    ctaUrl:       'https://dakar.sn',
    accentColor:  '#059669',
    bgColor:      'rgba(5,150,105,.08)',
    format:       'banner',
    targeting:    {},   // pas de ciblage — campagne universelle
    startDate:    NOW - 10 * DAY,
    endDate:      NOW + 50 * DAY,
    budgetFcfa:   500_000,
    spentFcfa:    0,
    cpmFcfa:      0,   // CPM = 0 (campagne gratuite / obligation légale)
    maxImpressions: 200_000,
    status:       'active',
    priority:     5,   // priorité basse — affiché en fallback
    freqCap:      10,
  },
];
