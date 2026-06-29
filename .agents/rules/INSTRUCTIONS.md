# Instructions de Développement & Guide de Style - Neve

Ce document contient les instructions impératives pour tout agent ou développeur travaillant sur la base de code Neve. Veuillez respecter scrupuleusement ces règles pour garantir la cohérence, l'ergonomie et la maintenabilité du projet.

---

## 🎨 1. Utilisation Impérative des Jetons de Couleur (Tokens)

* **RÈGLE D'OR** : **Ne JAMAIS utiliser de couleurs hexadécimales brutes** (`#FFFFFF`, `#1B1B1B`, `#000000`, etc.) pour le style des composants.
* Utilisez toujours les jetons sémantiques définis dans le thème via `constants/Colors.ts` (ex. `theme.background`, `theme.card`, `theme.text`, `theme.textMuted`, `theme.border`, etc.).
* Pour les boutons ou composants personnalisés devant s'adapter au thème (mode clair ou sombre) :
  * Si vous avez besoin d'un fond blanc en mode clair et noir/charbon en mode sombre, utilisez **`theme.card`**.
  * Si vous avez besoin de texte noir en mode clair et blanc en mode sombre, utilisez **`theme.text`**.
  * Pour les états d'alerte, de succès ou d'avertissement, utilisez toujours la gamme sémantique `theme.statusBg...` et `theme.statusText...`.

---

## 📱 2. Bonnes Pratiques React Native & Expo

### A. Propriétés de Scroll & Défilement
* **`nestedScrollEnabled={true}`** : N'utilisez cette propriété que si le `ScrollView` ou la `FlatList` est **réellement** imbriqué à l'intérieur d'un autre conteneur défilant. Si le parent est une vue simple, activer cette propriété bloque le défilement natif car le composant attend des gestes propagés depuis un parent inexistant.
* **`showsVerticalScrollIndicator`** : Cachez l'indicateur vertical (`showsVerticalScrollIndicator={false}`) sur les cartes, suggestions et filtres pour maintenir une esthétique minimaliste et premium conforme aux maquettes Figma.

### B. Animations & Propriétés Raccourcies (Shorthands)
* **Pas d'animation sur les propriétés raccourcies** : Si vous animez une propriété raccourcie telle que `padding` ou `margin` via `Animated.Value` ou `reanimated`, vous **ne pouvez pas** la surcharger avec une propriété individuelle (comme `paddingBottom: 0`) dans le même tableau de styles. L'animation écrasera silencieusement la valeur statique à chaque frame.
* **Solution** : Animez explicitement les composants individuels concernés (ex. `paddingTop`, `paddingLeft`, `paddingRight`) et définissez la propriété fixe (`paddingBottom`) de manière statique.

---

## 📐 3. Typographie & Polices
* Spécifiez toujours la variante de police directement dans la propriété `fontFamily` (ex. `Satoshi-Medium`, `Satoshi-Bold`, `BricolageGrotesque-SemiBold`, etc.).
* **Ne pas utiliser** la propriété `fontWeight` avec des polices personnalisées en React Native, car cela provoque des bugs de rendu et des substitutions incorrectes sur Android.

---

## 📦 4. Dépendances & Composants Communs
* **Boutons** : Utilisez le composant réutilisable `<Button>` (depuis `@/components/Button`) avec ses variants (`primary`, `secondary`, `text`). Ne recréez pas de boutons personnalisés avec des `Pressable` ou `TouchableOpacity`.
* **Chips** : Utilisez le composant `<Chip>` (depuis `@/components/Chip`) pour toutes les sélections sous forme de tags (difficultés, activités, etc.).
* **Icônes** : Utilisez exclusivement la bibliothèque `lucide-react-native` pour toutes les icônes de l'application afin de préserver l'identité visuelle de Neve.
