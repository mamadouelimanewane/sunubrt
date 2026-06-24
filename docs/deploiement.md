# Déploiement — SunuBRT

---

## Démarrage local

```bash
cd C:/gravity/brt

# Installer les dépendances (première fois)
npm install

# Lancer le serveur de développement
npm run dev
# → http://localhost:5173

# Build de production
npm run build
# → dist/

# Preview du build de production
npm run preview
```

---

## Variables d'environnement

Aucune variable requise pour le POC (tout est simulé côté client).

Pour une version production avec API backend :

```bash
# .env.local (ne pas committer)
VITE_API_BASE_URL=https://api.sunubrt.sn
VITE_LOCATIONIQ_KEY=votre_cle
VITE_YANGO_PARTNER_ID=votre_id
```

---

## GitHub

```bash
# Dépôt
https://github.com/mamadouelimanewane/sunubrt

# Cloner
git clone https://github.com/mamadouelimanewane/sunubrt.git

# Remote configuré dans le projet
git remote -v
# origin  https://github.com/mamadouelimanewane/sunubrt.git (fetch)
# origin  https://github.com/mamadouelimanewane/sunubrt.git (push)

# Pousser des changements
git add -A
git commit -m "description du changement"
git push origin main
```

### Branches
| Branche | Usage |
|---|---|
| `main` | Production — déployée automatiquement sur Vercel |

---

## Vercel

Le projet est configuré pour Vercel via `vercel.json` :

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Déployer

```bash
# Via CLI Vercel
npx vercel --prod

# Ou pousser sur main (si Vercel GitHub intégration activée)
git push origin main
```

### URL de production attendue
`https://sunubrt.vercel.app` ou `https://sunubrt-[hash].vercel.app`

---

## Android (Capacitor)

```bash
# Sync Capacitor après build
npm run build
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android

# Build APK depuis Android Studio :
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

**Fichier APK** : `android/app/build/outputs/apk/debug/app-debug.apk`

**Config Capacitor** : `capacitor.config.ts`

---

## Génération du PDF propositions

```bash
cd C:/gravity

# Version de base (34 KB)
python sunubrt_propositions_pdf.py

# Version avec mockups téléphone (66 KB)
python sunubrt_pdf_v2.py

# Script helper (réécriture safe sans apostrophes)
python fix_pdf.py
```

**Prérequis Python** :
```bash
pip install reportlab==4.4.9
```

**Output** : `C:/gravity/SunuBRT_Propositions_Digitales_2025.pdf`

---

## Commandes utiles

```bash
# TypeScript check (non-bloquant pour Vite)
npx tsc --noEmit

# Tailwind purge vérification
npm run build -- --mode production

# Lint
npx eslint src/ --ext .ts,.tsx

# Git log condensé
git log --oneline -10
```

---

## Historique des commits

```
044d3d4  fix: responsive design complet mobile 320px a desktop
f16f6ec  feat: specialisation BRT Dakar — 23 gares, 4 lignes, Yango, passes, gamification
```
