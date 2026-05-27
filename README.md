# 🏔️ Névé | Éco-Aventures en train 🚆

> **Partenaire de vos randonnées écoresponsables.**

Névé est une application mobile haut de gamme développée avec **Expo (SDK 56) & React Native**. Elle permet aux amateurs de grand air d'explorer et de filtrer des itinéraires de randonnée d'exception accessibles directement et uniquement en transports en commun.


## ⚙️ Guide d'Installation Rapide

> [!IMPORTANT]
> Ce projet utilise **Bun** pour une rapidité d'exécution optimale, mais reste compatible avec **npm** ou **yarn**.

### 1. Cloner le projet
```bash
git clone https://github.com/NathanLaure/neve.git
cd neve
```

### 2. Installer les dépendances
```bash
bun install
```
*(Ou `npm install` si vous préférez).*

### 3. Lancer le serveur de développement
```bash
bun run start
```

> [!TIP]
> En cas de mise à jour des constantes de couleur ou si le cache Metro est persistant, videz le cache avec :
> ```bash
> npx expo start --clear
> ```

### 4. Vérification qualité (Lint & Format)
Le projet est configuré avec un linter strict (ESLint) et un formateur (Prettier) pour assurer la propreté du code :
```bash
# Vérifier la qualité et le style du code
bun run lint

# Appliquer le formatage automatique
bun run format
```

---

## 🛠️ Architecture du Projet

* **`app/`** : Routage basé sur les fichiers avec Expo Router.
  * **`app/(drawer)/_layout.tsx`** : Barre latérale personnalisée (Safe-Area insets, filtre anti-interférence NativeWind, sélecteur de thème segmenté).
  * **`app/(drawer)/index.tsx`** : Page principale de recherche et de liste des randonnées.
* **`components/`** :
  * **`RandoCard.tsx`** : Composant de carte de randonnée premium (ombres fines, badges SNCF et indicateurs météo).
  * **`useColorScheme.ts`** : Hook de gestion globale de thème avec support de forçage manuel (Clair, Sombre, Système).
* **`constants/Colors.ts`** : Palette chromatique haute fidélité inspirée de la nature (Vert forêt profond, Éco gris-vert).

---

Développé avec 🍃 par **Nathan (& gémini aussi, un peu ;)**
