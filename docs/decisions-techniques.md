# Décisions techniques — SunuBRT

Arbitrages et choix d'architecture expliqués.

---

## 1. Séparation SunuBus / SunuBRT

**Décision** : Deux projets distincts, jamais de code partagé via import.

**Raison** : SunuBRT est une application BRT-only avec ses propres couleurs, données, branding et roadmap. Partager du code créerait des dépendances et risquerait de polluer SunuBus (qui est en test sur Vercel).

**Conséquence** : Duplication de certains composants (MapView, SearchBar, RoutePanel). Acceptable dans le contexte d'un POC.

---

## 2. OperatorId n'inclut pas YANGO

```typescript
type OperatorId = 'BRT' | 'DDD' | 'all'
// YANGO est séparé — jamais dans OperatorId
```

**Raison** : Yango n'est pas un opérateur de transit. C'est un service last-mile activé uniquement aux pôles d'échange. Le mixer dans `OperatorId` casserait les filtres et la logique de planning.

---

## 3. Deeplink Yango avec fallback Play Store

```typescript
window.location.href = yangoUrl
setTimeout(() => {
  window.open('https://play.google.com/store/apps/details?id=net.yango.client', '_blank')
}, 1200)
```

**Raison** : Si Yango n'est pas installé, le deeplink `yango://` échoue silencieusement. Le fallback vers le Play Store après 1200ms assure une expérience utilisateur correcte sans dialog d'erreur.

---

## 4. Simulation temps réel côté client

**Décision** : Les positions des bus sont simulées côté client via `setInterval` dans `src/services/simulation.ts`.

**Raison** : POC sans backend. La simulation est suffisamment réaliste pour démontrer la valeur (bus qui suivent les tracés OSRM des lignes réelles).

**Prochaine étape** : Remplacer par WebSocket vers API backend lors de la mise en production.

---

## 5. ReportLab pour le PDF (pas Puppeteer ni LaTeX)

**Décision** : PDF généré en Python avec ReportLab, mockups téléphone dessinés avec les primitives canvas.

**Raisons** :
- Pas besoin de browser pour générer le PDF
- Contrôle total sur la mise en page
- Mockups dessinés = pas de dépendance aux screenshots (qui nécessitaient Chrome MCP)
- ReportLab v4.4.9 disponible sur la machine

**Difficulté** : Les apostrophes françaises dans les strings Python ont causé des SyntaxError. Solution : réécriture via `fix_pdf.py` qui écrit le contenu sous forme de raw string `r"""..."""`.

---

## 6. Tailwind v4 (pas v3)

**Décision** : Tailwind CSS v4 avec `@import "tailwindcss"` (pas de `tailwind.config.js` requis).

**Impact** : Certaines classes Tailwind v3 ne fonctionnent plus identiquement en v4. Les classes utilitaires custom sont définies dans `globals.css` via `@layer utilities`.

---

## 7. Responsive : helpers CSS plutôt que composants séparés

**Décision** : Classes helper dans `globals.css` (`map-timeline`, `search-dropdown`, `modal-sheet`, `grid-xs-1/2`).

**Raison** : Modifier des dizaines de composants pour ajouter des breakpoints aurait risqué des régressions. Les helpers CSS appliqués ciblément sur les éléments problématiques sont plus sûrs et réversibles.

---

## 8. Grid auto-fit plutôt que grid-cols-N fixes

**Pattern** :
```css
/* Avant — casse sur mobile */
grid-template-columns: repeat(4, 1fr);

/* Après — s'adapte automatiquement */
grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr));
```

**Raison** : `minmax(120px, 1fr)` déborde si le conteneur est < 4×120px. `min(100%, 120px)` force la colonne à ne jamais dépasser la largeur du conteneur.

---

## 9. Capacitor pour le mobile (pas React Native)

**Décision** : Capacitor wraps la webapp React en APK Android natif.

**Raison** : La webapp est déjà fonctionnelle. Capacitor permet d'obtenir un APK sans réécrire l'app en React Native. Acceptable pour un POC. Production : React Native ou Flutter serait préférable pour les performances.
