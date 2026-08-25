# Développer sur Névé

Guide de mise en route et conventions du dépôt de l'application mobile.
La présentation du produit est dans le [README](README.md).

---

## Mise en route

Le projet utilise **Bun**, mais reste compatible avec `npm` et `yarn`.

```bash
git clone https://github.com/NathanLaure/neve.git
cd neve
bun install
bun run start
```

Le serveur Expo démarre et propose d'ouvrir l'application sur simulateur, sur
appareil via Expo Go, ou dans le navigateur.

```bash
bun run ios       # build natif iOS
bun run android   # build natif Android
bun run web       # version web (support partiel)
```

> Si le cache Metro persiste après une modification des constantes de thème :
> `npx expo start --clear`

### Variables d'environnement

À placer dans un fichier `.env` à la racine, **jamais versionné**. Un
`.env.example` liste les clés attendues.

| Variable | Usage |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Point d'entrée du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, soumise au RLS |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Rendu cartographique |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | Téléchargement du SDK Mapbox natif au build |
| `SUPABASE_SERVICE_ROLE_KEY` | **Scripts d'ingestion uniquement.** Contourne le RLS : ne doit jamais être exposée côté client |

---

## Organisation du code

```
app/            routage par fichiers (Expo Router)
  (auth)/         connexion, inscription, réinitialisation
  (tabs)/         accueil, résultats, aventures, favoris, profil
  plan/           planificateur : aller, dates, retour, récapitulatif
  rando/[id]/     fiche de randonnée
  settings/       réglages, abonnements de transport, hors-ligne, Névé+
  share/[token]/  ouverture d'un itinéraire partagé
components/     composants d'interface
services/       accès aux domaines métier (transit, tracés, réservation, partage…)
utils/          Supabase, notifications, préférences, formatage
constants/      palette, typographies, thèmes
supabase/       migrations SQL, edge functions, gabarits d'e-mail
scripts/        ingestion et administration des données
plugins/        plugins de configuration Expo
```

---

## Qualité

Linter strict et formateur configurés. À lancer avant toute proposition de
modification :

```bash
bun run lint      # vérifie
bun run format    # corrige
```

---

## Données

Le catalogue d'itinéraires est alimenté par des scripts d'ingestion. Ils
écrivent directement en base et requièrent `SUPABASE_SERVICE_ROLE_KEY`.

```bash
bun run seed:hikes        # source principale
bun run seed:csv          # import CSV générique
bun run seed:csv:idf      # import CSV Île-de-France
bun run seed:geotrek      # API Geotrek
bun run seed:osm:idf      # Overpass / OpenStreetMap, Île-de-France
```

---

## Points d'attention

**Le natif est jetable.** Les dossiers `android/` et `ios/` sont générés par
`expo prebuild` et ne sont pas versionnés. Toute configuration native doit
passer par un plugin dans `plugins/` ou par `app.json`, sinon elle disparaît à
la prochaine régénération.

**Les migrations vivent dans `supabase/migrations/`.** Aucune modification de
schéma ne se fait directement depuis la console : elle serait perdue au
prochain déploiement et invisible pour les autres environnements.

**Le RLS est la ligne de défense.** La clé publique est exposée dans
l'application ; c'est le Row Level Security qui protège les données. Toute
nouvelle table doit avoir ses politiques avant d'être utilisée côté client.
