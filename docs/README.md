# SunuBRT — Documentation du projet

> **Application mobile BRT Dakar** — POC opérationnel construit sur la base SunuBus

---

## Index de la documentation

| Fichier | Contenu |
|---|---|
| [architecture.md](architecture.md) | Stack technique, structure des fichiers, types clés |
| [donnees-transport.md](donnees-transport.md) | 23 gares, 4 lignes BRT, 10 lignes DDD, opérateurs |
| [propositions-digitales.md](propositions-digitales.md) | Les 16 propositions en 3 phases |
| [session-dev.md](session-dev.md) | Journal de la session de développement |
| [decisions-techniques.md](decisions-techniques.md) | Choix d'architecture et arbitrages |
| [deploiement.md](deploiement.md) | Démarrage local, build, GitHub, Vercel |

---

## Résumé exécutif

**SunuBRT** est un POC (Proof of Concept) d'application mobile pour le réseau Bus Rapid Transit de Dakar, couvrant le corridor **Petersen → Guédiawaye** (18,3 km, 23 gares).

Il a été construit en **3 jours** par réutilisation et spécialisation de **SunuBus** (application de mobilité généraliste Dakar, en phase de test sur [senbus-unified.vercel.app](https://senbus-unified.vercel.app)).

### Points forts du POC

- 23 gares BRT réelles avec coordonnées GPS précises
- 4 lignes BRT simulées (B1 Omnibus 6 min, B2 Semi-Express, B3 Pointe, B4 Express)
- 10 lignes DDD de rabattement (Parcelles, Pikine, Keur Massar, Ouakam, Yoff, Thiaroye, Rufisque, Malika)
- 5 pôles d'échange avec intégration **Yango Last Mile** (deeplink natif)
- Paiement Wave / Orange Money / Free Money
- 5 types de pass (BRT Mensuel 8 000 F, BRT+DDD 14 000 F, Étudiant, Famille, Entreprise)
- Interface aux couleurs officielles SunuBRT `#00b450`
- Tableau de bord Admin + Gestionnaire de flotte
- Responsive complet (320px → desktop)
- PWA offline + APK Android (Capacitor)

### Dépôt GitHub

[https://github.com/mamadouelimanewane/sunubrt](https://github.com/mamadouelimanewane/sunubrt)

### Contact

**Mamadou Eliman Ewane** — Architecte Digital Mobilité  
mamadouastelwane@gmail.com — Dakar, Sénégal
