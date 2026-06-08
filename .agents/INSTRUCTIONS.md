# 🏔️ Guide de Développement & Cohérence du Code — Névé 🚆

Ce document centralise toutes les normes de code, les conventions de nommage, les choix d'architecture et les règles de design de l'application **Névé**. Tout agent de développement (IA) ou développeur humain doit s'y conformer strictement lors des modifications du projet.

---

## 🗺️ 1. Vision et Identité de l'Application

* **Concept** : Éco-aventures de randonnée d'exception accessibles uniquement en train de banlieue ou TER depuis les grandes gares.
* **Branding & Identité Visuelle** :
  * Un sentiment de nature, d'aventure et de premium (haut de gamme).
  * Design soigné (ombres douces, coins très arrondis `borderRadius: 20` ou `rounded-3xl`, et micro-interactions fluides).
* **Langues et Localisation** :
  * **Code source** (fichiers, variables, fonctions, hooks, types, bases de données) : **Anglais** 🇬🇧 (ex : `userLocation`, `RandoData`, `plannedAdventures`).
  * **Interface utilisateur (UI)** (boutons, titres, descriptions, placeholders, badges) et **Commentaires de code** : **Français** 🇫🇷 (ex : "Explorer les randos", "Distance à pied").

---

## 📂 2. Architecture & Organisation des Dossiers

L'application est construite sur **Expo (SDK 56)** et **Expo Router** avec un routage basé sur les fichiers.

* **`app/`** : Pages et navigation
  * `_layout.tsx` : Root layout qui enveloppe l'application dans les fournisseurs globaux (`SafeAreaProvider`, `ThemeProvider`, `AdventureProvider`, `GestureHandlerRootView`).
  * `(tabs)/` : Les onglets principaux de l'application.
    * `index.tsx` : Onglet "Explorer" (Recherche, filtres, carte interactive `ExplorerMap` et liste des randos).
    * `adventures.tsx` : Onglet "Aventures" (Suivi des randos planifiées/réservées).
    * `favorites.tsx` : Onglet "Favoris" (Randonnées épinglées).
    * `profile.tsx` : Onglet "Profil" (Préférences utilisateur et statistiques).
    * `_layout.tsx` : Configuration visuelle de la barre d'onglets (icônes `Ionicons` personnalisées).
  * `rando/[id].tsx` : Fiche détaillée d'une randonnée spécifique.
  * `modal.tsx` : Pages modales globales.
* **`components/`** : Composants graphiques et logiques réutilisables.
  * `RandoCard.tsx` : Carte premium pour afficher un résumé de randonnée.
  * `ExplorerMap.tsx` : Carte interactive affichant le tracé GPX et la position utilisateur.
  * `Button.tsx` / `Container.tsx` : Boutons et conteneurs standardisés.
* **`constants/`** : Fichiers de configuration statique et données simulées.
  * `Colors.ts` : Notre design system de couleurs (clair/sombre).
  * `RandosData.ts` : La source des données simulées et la définition des interfaces (`RandoData`, `TrainOption`).
* **`context/`** : Gestion d'état global.
  * `AdventureContext.tsx` : Centralise la géolocalisation de l'utilisateur (réelle ou simulée), le calcul dynamique de trajet (formule Haversine), et la liste des aventures réservées.

---

## 🏷️ 3. Normes de Code & Conventions de Variables

### Typage TypeScript Strict
* Interdiction stricte d'utiliser le type `any`. Tout élément doit être typé précisément.
* Déclarer les interfaces et les types dans les fichiers de contexte ou dans des fichiers de constantes dédiés, puis les importer.

### Règles de Nommage
| Type d'Élément | Style | Exemple |
| :--- | :--- | :--- |
| **Composants React** | PascalCase | `RandoCard`, `ExplorerMap` |
| **Fichiers de Composants** | PascalCase | `RandoCard.tsx`, `Button.tsx` |
| **Interfaces et Types TS** | PascalCase | `RandoData`, `TrainOption`, `PlannedAdventure` |
| **Variables / State / Hooks** | camelCase | `userLocation`, `isLocating`, `useAdventure` |
| **Fonctions et Méthodes** | camelCase | `refreshUserLocation()`, `calculateDistanceKm()` |
| **Constantes Statiques Globale**| UPPER_SNAKE_CASE | `DEFAULT_COORDS`, `MOCK_RANDOS` |
| **Fichiers de Page/Route** | minuscules / kebab-case | `adventures.tsx`, `[id].tsx`, `+not-found.tsx` |

---

## 🎨 4. Design System & Règles de Style

### Palette de Couleurs (`constants/Colors.ts`)
Nous disposons d'un thème clair (`light`) et d'un thème sombre (`dark`).
* **Vert Forêt** (`primary` / `tint`) : Représente la nature et le voyage.
* **Bleu SNCF** (`secondary`) : Représente la connectivité ferroviaire et les transports publics.
* **Eco Grey-Green** (`background`) : Teinte de fond douce qui fait ressortir les cartes blanches.
* **Orange doux** (`warning`) : Pour les alertes météo ou horaires.
* **Badges** (`greenBadge`, `blueBadge`, `orangeBadge`) : Fonds de couleur ultra-clairs (light mode) ou ultra-foncés (dark mode) pour y apposer des textes contrastés.

### Choix de la Méthode de Style (Tailwind CSS vs React Native StyleSheet)
L'application utilise à la fois **NativeWind (Tailwind)** et le système **StyleSheet** de React Native. Pour maintenir la cohérence, appliquez la règle suivante :

1. **NativeWind (Tailwind CSS / `className`)** :
   * À privilégier pour les composants structurels simples (ex: `Container.tsx`, `Button.tsx`).
   * Idéal pour les configurations de Flexbox, paddings, margins, bordures et arrondis standards.
   * Exemple : `<View className="flex-1 items-center p-4" />`.
2. **React Native `StyleSheet.create` ou Inline Styles** :
   * À utiliser dès que le style dépend dynamiquement du thème actuel (`Colors[colorScheme]`).
   * À utiliser pour des ombres complexes (`shadowColor`, `shadowOffset`, `shadowOpacity`, `elevation` sous Android) nécessitant des ajustements fins selon la plateforme (`Platform.select`).
   * À utiliser pour des animations avancées (avec `react-native-reanimated`).
   * Exemple :
     ```tsx
     const colorScheme = useColorScheme() ?? 'light';
     const theme = Colors[colorScheme];
     return (
       <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} />
     );
     ```

---

## 🧠 5. Gestion de la Logique Métier & Calculs

* **Position Utilisateur** : Gérée via `AdventureContext`. L'utilisateur peut utiliser sa position GPS réelle ou simuler un départ depuis une grande gare parisienne (Montparnasse, Gare de Lyon, Gare de l'Est).
* **Calcul des distances** : Utiliser exclusivement la formule Haversine (`calculateDistanceKm`) implémentée dans `AdventureContext.tsx` pour obtenir des distances physiques (en kilomètres) à vol d'oiseau.
* **Temps de transport dynamic (`getTransitInfo`)** :
  * Si l'utilisateur est détecté à Paris (dans un rayon de 15km), utiliser la valeur de base de la base de données (`rando.trainDurationMinutes`).
  * Sinon, simuler dynamiquement un temps de trajet basé sur `distance * 1.4 + 12 minutes` (avec un minimum de 15 minutes et un maximum de 180 minutes) pour refléter l'éloignement.

---

## ⚙️ 6. Processus de Qualité et Outils

Avant de finaliser une tâche ou de proposer des modifications de code à l'utilisateur :

1. **Pas d'erreurs de type** : S'assurer que le projet compile sans avertissement TypeScript.
2. **Lint & Formater** : Exécuter systématiquement la commande suivante pour maintenir la structure du code propre :
   ```bash
   bun run format
   ```
3. **Tester sur les Plateformes** : Vérifier que les changements visuels s'adaptent bien au mode clair et au mode sombre, ainsi qu'aux différences d'affichage iOS, Android et Web.
