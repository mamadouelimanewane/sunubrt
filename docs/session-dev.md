# Journal de session de développement — SunuBRT

Période : juin 2026 — Sessions 1 à 3

---

## Contexte de départ

**SunuBus** (`C:/gravity/senu`) est une application de mobilité généraliste Dakar (DDD, AFTU, BRT, TER) en phase de test sur [senbus-unified.vercel.app](https://senbus-unified.vercel.app).

**Objectif** : Créer **SunuBRT** (`C:/gravity/brt`), une application spécialisée BRT Dakar, en réutilisant les composants SunuBus. Délai : 3 jours.

**Contrainte absolue** : Ne JAMAIS modifier `C:/gravity/senu`. Ce sont deux projets séparés.

---

## Session 1 — POC SunuBRT (Jour 1)

### Réalisations

1. **Duplication** de SunuBus → spécialisation BRT
2. **Données transport** : 23 gares BRT réelles avec GPS, 4 lignes B1-B4, 10 lignes feeder DDD
3. **Yango Last Mile** : 5 pôles d'échange avec deeplink `yango://route?...`
4. **Couleurs** : remplacement thème SunuBus → SunuBRT (`#00b450`)
5. **Wallet & Pass** : 5 types de pass, paiement Wave/Orange/Free
6. **Gamification** : Green Points, badges, CO2 économisé
7. **Alertes crowdsourcing** : bond, retard, panne, sécurité, harcèlement
8. **Admin** : Supervision réseau, Analytics, Régie publicitaire
9. **Flotte** : Télémétrie BRT + DDD, gestion incidents

### Fichiers créés/modifiés
- `src/data/transportData.ts` — Réécriture complète (gares BRT, lignes, Yango)
- `src/types.ts` — Ajout `OperatorId`, `YangoZone`, `Pass`, `GamifState`
- `src/store/store.ts` — Nouveaux slices : passes, gamif, favorites, journey
- `src/components/YangoConnect.tsx` — Nouveau composant deeplink
- `src/components/SplashScreen.tsx` — Splash BRT vert
- `src/views/admin/AdManagerPage.tsx` — Régie publicitaire
- `src/views/fleet/FleetManagerApp.tsx` — Gestionnaire flotte

---

## Session 2 — PDF Propositions + Déploiement GitHub (Jour 2)

### Objectif

Créer un PDF de présentation professionnelle des 16 propositions, avec mockups téléphone.

### Difficultés et solutions

| Problème | Cause | Solution |
|---|---|---|
| SyntaxError apostrophe | Apostrophes françaises dans strings Python | Réécriture via `fix_pdf.py` avec raw strings `r"""..."""` |
| `ImportError: RoundRect` | RoundRect absent de reportlab.graphics.shapes | Import supprimé ; `canvas.roundRect()` utilisé à la place |
| `UnboundLocalError: MUTE` | Variable `MUTE` assignée localement après référence globale | Déplacement de `MUTE = HexColor("#64748b")` au niveau module |
| `AttributeError: canvas.moveTo` | `beginPath()` retourne un objet path, pas canvas | `p = c.beginPath(); p.moveTo(...); c.drawPath(p)` |
| `NoneType.wrapOn` | `h2()` appendait à story ET retournait None (utilisé dans Table) | Suppression du layout Table ; story.append() séquentiels |

### Résultat PDF

`C:/gravity/SunuBRT_Propositions_Digitales_2025.pdf` — 66 KB

**Structure** :
- Couverture (vert BRT, titre, pitch 3 jours)
- Avant-propos + KPIs (50 000 utilisateurs, +45 M FCFA, 87 % prédiction IA)
- Sommaire 16 propositions
- 8 fiches détaillées avec mockups téléphone dessinés
- 6 écrans simulés : carte, pass, lignes, Yango, admin, planificateur
- Roadmap 3 phases
- Conclusion + CTA

### Classes ReportLab créées

```python
class PhoneFrame(Flowable):
    # Dessine un cadre téléphone iPhone-like
    # Appelle screen_fn(c, sx, sy, sw, sh) pour dessiner l'écran
    def __init__(self, screen_fn, pw=75*mm, ph=135*mm)
    def draw(self)  # Cadre, notch, home bar

# 6 fonctions d'écran :
def screen_map(c, sx, sy, sw, sh)    # Carte BRT 23 gares
def screen_pass(c, sx, sy, sw, sh)   # Wallet pass et badges NFC
def screen_lignes(c, sx, sy, sw, sh) # Liste lignes BRT+DDD
def screen_yango(c, sx, sy, sw, sh)  # Pôle échange + bouton Yango
def screen_admin(c, sx, sy, sw, sh)  # KPIs + graphique barres
def screen_plan(c, sx, sy, sw, sh)   # Planificateur itinéraires

def phone_showcase(screens, labels)  # Mise en page N téléphones côte à côte
```

### Déploiement GitHub

```bash
# Remote changé de dakarbus.git → sunubrt.git
git remote set-url origin https://github.com/mamadouelimanewane/sunubrt.git
git add -A && git commit -m "feat: specialisation BRT Dakar"
git push origin main  # 26 fichiers pushés
```

---

## Session 3 — Responsive Design complet (Jour 3)

### Objectif

Rendre l'application fonctionnelle sur tous les écrans (320px → desktop).

### Fichiers modifiés

| Fichier | Correction |
|---|---|
| `src/styles/globals.css` | Breakpoints `<360px`, helpers `.map-timeline`, `.search-dropdown`, `.modal-sheet`, `.grid-xs-1/2`, `.text-clamp`, `.profile-tab-label/icon` |
| `src/pages/LinesPage.tsx` | `minmax(260px)` → `minmax(min(100%, 260px), 1fr)` — élimine l'overflow horizontal |
| `src/pages/ProfilePage.tsx` | Tabs scrollables (flex-shrink-0 + icône+label) ; `fontSize: 22` → `text-xl` responsive ; grille thèmes `overflow-hidden` avec label "Nuit" |
| `src/components/MapView.tsx` | DraggableInfoBar : `maxWidth calc(100vw - 24px)`, `left` borné, `flexWrap` ; DraggableTimeline : `maxWidth 52vw` ; banner : `maxWidth min(280px, calc(100vw - 80px))` |
| `src/components/SearchBar.tsx` | Dropdown `maxHeight: 70vh` → `min(70vh, 420px)` |
| `src/components/RoutePanel.tsx` | Grid 4 colonnes avec `minmax(0, 1fr)` garanti |
| `src/views/admin/AdManagerPage.tsx` | KPIs : `grid-cols-4` → `auto-fit minmax(120px)` |
| `src/views/fleet/FleetManagerApp.tsx` | Télémétrie : `grid-cols-3` → `auto-fit minmax(90px)` |

### Commit et push

```
[main 044d3d4] fix: responsive design complet mobile 320px a desktop
 8 files changed, 57 insertions(+), 17 deletions(-)
```

Pushé sur [github.com/mamadouelimanewane/sunubrt](https://github.com/mamadouelimanewane/sunubrt) — branch `main`.

### Erreurs TypeScript pré-existantes (non bloquantes)

Les erreurs TS suivantes existaient avant la session et ne proviennent pas des corrections responsive :

- `src/App.tsx:35` — `Stop` utilisé comme fonction (problème de types dans filterFn)
- `src/components/admin/LineCreator.tsx:4` — `addCustomStop`/`addCustomLine` non exportés de `transportData`
- `src/components/CarpoolPanel.tsx:38` — Même problème Stop callable

Ces erreurs n'empêchent pas Vite de builder (esbuild ignore les erreurs TS).

---

## État final du projet

- **App** : `http://localhost:5174` (dev) — fonctionnel
- **GitHub** : [github.com/mamadouelimanewane/sunubrt](https://github.com/mamadouelimanewane/sunubrt) — à jour
- **PDF** : `C:/gravity/SunuBRT_Propositions_Digitales_2025.pdf` — 66 KB
- **Responsive** : 320px → desktop — OK
- **Prochaine étape** : Fix erreurs TypeScript pré-existantes + déploiement Vercel
