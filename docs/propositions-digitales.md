# 16 Propositions Digitales — SunuBRT

Document de référence des propositions soumises à CETUD / AFTU.  
PDF complet : `C:/gravity/SunuBRT_Propositions_Digitales_2025.pdf`

---

## Phase 1 — Fondations (Mois 1-6) — 4 propositions

### P1 : Application Mobile Voyageur BRT
**Cible** : Passagers du BRT Dakar  
**Fonctions** : Carte interactive temps réel, planificateur de trajet, positions des bus, alertes, thèmes  
**KPIs cibles** : 50 000 utilisateurs actifs, 4,2+ étoiles AppStore  
**Statut** : POC fonctionnel en ligne

### P2 : Wallet Digital Ticket & Pass
**Cible** : Passagers réguliers  
**Fonctions** : QR Code embarquement, Wave / Orange Money / Free Money, 5 types de pass (Mensuel BRT 8 000 F, BRT+DDD 14 000 F, Étudiant 5 000 F, Famille 25 000 F, Entreprise 60 000 F)  
**KPIs cibles** : 70 % de ventes digitales, 0 fraude détectée

### P3 : Dashboard Temps Réel Admin
**Cible** : Exploitants BRT  
**Fonctions** : Supervision réseau, positions bus, KPIs opérationnels, gestion lignes, incidents  
**KPIs cibles** : Délai décision réduit de 40 %

### P4 : Interface Chauffeur BRT
**Cible** : Conducteurs BRT  
**Fonctions** : Navigation GPS sur ligne, signalement panne, alertes passagers, fin de service  
**KPIs cibles** : -30 % incidents non signalés

---

## Phase 2 — Expansion (Mois 7-12) — 6 propositions

### P5 : Yango Last Mile Integration
**Cible** : Passagers sortant aux 5 pôles d'échange  
**Fonctions** : Deeplink Yango natif, estimation attente, Green Points récompense, fallback Play Store  
**Pôles** : Petersen (2 min), Patte d'Oie (3 min), Guédiawaye HCW (4 min), Guédiawaye Marché (3 min), Terminus (5 min)  
**KPIs cibles** : 15 000 trajets/mois, +22 % utilisation pôles

### P6 : Green Points Gamification
**Cible** : Tous les passagers  
**Fonctions** : Points par trajet BRT, badges (Voyageur Bronze/Silver/Gold, Champion CO2, Fidèle BRT), niveaux, leaderboard  
**KPIs cibles** : +35 % fidélisation, 25 % trajets en co-voiturage

### P7 : Alertes Crowdsourcing
**Cible** : Passagers + Exploitants  
**Fonctions** : Signalement bond, retard, panne, sécurité, harcèlement. Vote communautaire, validation admin, notification push  
**KPIs cibles** : 500 rapports/mois, MTTR réduit de 28 %

### P8 : Régie Publicitaire Intégrée
**Cible** : Annonceurs Dakar  
**Fonctions** : Bannières contextuelles dans l'app, ciblage zone géographique, dashboard CTR/impressions/revenus  
**KPIs cibles** : +45 M FCFA revenus/an, 2,8 % CTR moyen

### P9 : Gestionnaire de Flotte BRT+DDD
**Cible** : Responsables flotte  
**Fonctions** : Télémétrie live GPS, kilométrage, occupation moyenne, état des bus, alertes maintenance  
**KPIs cibles** : -18 % pannes, +12 % disponibilité flotte

### P10 : Analytics & Reporting CETUD
**Cible** : CETUD, bailleurs, actionnaires  
**Fonctions** : Rapport export PDF, KPIs financiers, affluence par gare et heure, projection annuelle  
**KPIs cibles** : Rapport mensuel auto-généré en < 30 secondes

---

## Phase 3 — Excellence (Mois 13-24) — 6 propositions

### P11 : Co-voiturage BRT-First
**Cible** : Passagers partageant des trajets similaires  
**Fonctions** : Match algorithme (même ligne, même heure, trajet compatible), chat in-app, paiement partagé  
**KPIs cibles** : 8 000 trajets partagés/mois, -15 % véhicules privés

### P12 : Pass Entreprise & PME
**Cible** : Entreprises 5-500 employés  
**Fonctions** : Dashboard RH, quota par employé, report utilisation, facturation mensuelle, NFC badge  
**KPIs cibles** : 200 entreprises partenaires, 80 M FCFA/mois

### P13 : API Transport Open Data
**Cible** : Développeurs tiers, startups mobilité  
**Fonctions** : REST API positions bus, horaires, gares, tarifs. Documentation Swagger. Authentification JWT  
**KPIs cibles** : 50+ apps partenaires, 2M appels API/mois

### P14 : Système NFC Embarquement
**Cible** : Abonnés pass mensuel  
**Fonctions** : Badge NFC intégré dans le wallet, validation en 0,3 secondes, synchronisation cloud  
**KPIs cibles** : Embarquement < 1 seconde, 0 fraude NFC

### P15 : Prédiction IA Affluence
**Cible** : Exploitants + Planificateurs  
**Fonctions** : Prédiction affluence par gare / heure / météo / événements, optimisation nombre de bus, alertes surcharge préventives  
**KPIs cibles** : Prédiction précise à 87 %, -20 % bus vides

### P16 : Extension TER & Métro
**Cible** : Réseau Dakar complet  
**Fonctions** : Intégration TER (gares Dakar Plateau, Thiaroye, Rufisque), correspondances multimodales, tarification intégrée BRT+TER  
**KPIs cibles** : Couverture 95 % zone métropolitaine, -40 % temps de trajet total

---

## Synthèse économique

| Phase | Coût estimé | Revenus an 1 | ROI |
|---|---|---|---|
| Phase 1 | 45 M FCFA | 120 M FCFA | 167 % |
| Phase 2 | 80 M FCFA | 380 M FCFA | 375 % |
| Phase 3 | 120 M FCFA | 950 M FCFA | 692 % |
| **Total** | **245 M FCFA** | **1,45 Md FCFA** | **492 %** |

---

## Artéfacts livrables

| Artéfact | Fichier | Description |
|---|---|---|
| POC App | `C:/gravity/brt/` | Application React complète |
| PDF Propositions | `C:/gravity/SunuBRT_Propositions_Digitales_2025.pdf` | 66 KB, mockups téléphone |
| Script PDF v1 | `C:/gravity/sunubrt_propositions_pdf.py` | ReportLab Python |
| Script PDF v2 | `C:/gravity/sunubrt_pdf_v2.py` | Version avec PhoneFrame mockups |
| GitHub | [github.com/mamadouelimanewane/sunubrt](https://github.com/mamadouelimanewane/sunubrt) | Dépôt public |
