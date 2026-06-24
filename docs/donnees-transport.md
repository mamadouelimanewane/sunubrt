# Données transport — SunuBRT

Source : `src/data/transportData.ts`

---

## Opérateurs

| ID | Nom complet | Couleur | Tarif | Climatisé |
|---|---|---|---|---|
| `BRT` | SunuBRT | `#00b450` | 300 F | Oui |
| `DDD` | Dakar Dem Dikk | `#1a56db` | 200 F | Non |
| `YANGO` | Yango VTC | `#ff3d00` | Variable | — |

---

## Gares BRT (23 gares — corridor Petersen → Guédiawaye)

| ID | Nom | Pôle d'échange |
|---|---|---|
| b01 | Petersen | Oui (Pôle 1) |
| b02 | Colobane | — |
| b03 | Place de l'Indépendance | — |
| b04 | HLM Grand Yoff | — |
| b05 | Liberté 6 | — |
| b06 | Castor | — |
| b07 | Ouest Foire | — |
| b08 | Patte d'Oie | Oui (Pôle 2) |
| b09 | Camberène | — |
| b10 | Pikine Icotaf | — |
| b11 | Guinaw Rails | — |
| b12 | Sam Notaire | — |
| b13 | Thiaroye Gare | — |
| b14 | Thiaroye Azur | — |
| b15 | Guédiawaye HCW | Oui (Pôle 3) |
| b16 | Guédiawaye Marché | Oui (Pôle 4) |
| b17 | Médina Gounass | — |
| b18 | Nimzatt | — |
| b19 | Wakhinane Nimzatt | — |
| b20 | Golf Sud | — |
| b21 | Darou Salam | — |
| b22 | Keur Massar Est | — |
| b23 | Guédiawaye Terminus | Oui (Pôle 5) |

---

## Lignes BRT (4 lignes)

| ID | Nom | Type | Fréquence | Gares desservies |
|---|---|---|---|---|
| `BRT-B1` | B1 Omnibus | Toutes gares | 6 min | Toutes (b01→b23) |
| `BRT-B2` | B2 Semi-Express | Semi-rapide | 10 min | Gares principales |
| `BRT-B3` | B3 Semi-Express Pointe | Heures de pointe | 8 min | Gares intermédiaires |
| `BRT-B4` | B4 Express | Express | 15 min | Terminus + pôles |

---

## Lignes DDD de rabattement (10 lignes feeder)

| ID | Nom | Zone desservie |
|---|---|---|
| `DDD-F1` | F1 Parcelles Assainies | Parcelles Assainies |
| `DDD-F2` | F2 Pikine Centre | Pikine Centre |
| `DDD-F3` | F3 Keur Massar | Keur Massar |
| `DDD-F4` | F4 Ouakam | Ouakam |
| `DDD-F5` | F5 Yoff | Yoff / Aéroport |
| `DDD-F6` | F6 Thiaroye | Thiaroye |
| `DDD-F7` | F7 Rufisque | Rufisque |
| `DDD-F8` | F8 Malika | Malika |
| `DDD-F9` | F9 Grand Dakar | Grand Dakar / Fann |
| `DDD-F10` | F10 Médina | Médina / Rebeuss |

---

## Pôles d'échange Yango (5 pôles)

| Gare | Stop ID | Zone Yango | Attente estimée |
|---|---|---|---|
| Petersen | b01 | Zone Centre | 2 min |
| Patte d'Oie | b08 | Zone Ouest | 3 min |
| Guédiawaye HCW | b15 | Zone Nord | 4 min |
| Guédiawaye Marché | b16 | Zone Marché | 3 min |
| Terminus | b23 | Zone Terminus | 5 min |

### Deeplink Yango

```typescript
const url = `yango://route?pickup_lat=${zone.lat}&pickup_lng=${zone.lng}&pickup_name=${zone.pickupLabel}`
// Fallback après 1200ms → Play Store
```

---

## Gares DDD hub (12 gares)

| ID | Nom |
|---|---|
| d01 | Parcelles Assainies Terminus |
| d02 | Pikine Gare |
| d03 | Keur Massar Centre |
| d04 | Ouakam Village |
| d05 | Yoff Village |
| d06 | Thiaroye Gare |
| d07 | Rufisque Centre |
| d08 | Malika |
| d09 | Grand Dakar |
| d10 | Médina |
| d11 | Rebeuss |
| d12 | Fann Résidence |
