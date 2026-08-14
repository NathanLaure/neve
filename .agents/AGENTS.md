# Instructions & Règles du Projet Névé

## 🎨 Graphisme & Identité Visuelle de la Marque

1. **Logo Officiel Obligatoire** :
   - Vous devez **TOUJOURS** utiliser l'actif graphique du logo officiel de Névé (`@/assets/icon.png` ou les fichiers SVG/PNG officiels de la marque) pour les Splash Screens, l'en-tête de connexion et tout composant d'identité visuelle.
   - **Interdiction Stricte** : Ne jamais substituer ou réinventer le logo de la marque avec des icônes génériques de bibliothèques tierces (ex: icônes Lucide `Mountain`, `Flame`, `Compass`, etc.) ou des placeholders temporaires.

2. **Respect des Jetons Figma & Design System** :
   - Utiliser systématiquement les jetons sémantiques de couleurs (`constants/Colors.ts`), les typographies officielles (`BricolageGrotesque`, `Satoshi`) et les composants UI réutilisables (`Button`, `Input`, `Checkbox`).

## 🌊 Feedback Tactile & Effet Ripple (Android & iOS)

Pour tout nouvel élément cliquable ou composant interactif (`Pressable`, bouton, carte, ligne de menu, etc.) :

1. **Jeton Sémantique Unique (`constants/Colors.ts`)** :
   - Utiliser **toujours** `theme.ripple` (`theme.rippleOnBrand` sur fond de marque orange/noir) pour la prop `android_ripple`.
   - Ne jamais coder en dur des valeurs hexadécimales ou `rgba(...)` ad-hoc pour le ripple.

2. **Règle Critique `<Pressable>` React Native / Android** :
   - **INTERDICTION** d'utiliser la syntaxe fonctionnelle `style={({ pressed }) => [...]}` sur les éléments avec `android_ripple` ou vues imbriquées (cela cause un abandon silencieux des styles Flexbox sur Android, provoquant la chute en `flexDirection: 'column'` ou perte de bordures).
   - **OBLIGATION** de pré-calculer un tableau de styles statique : `const containerStyle = [styles.base, { borderRadius: 12, overflow: 'hidden' as const }, style];` et de le passer via `style={containerStyle}`.

3. **Confinement & Rayon (`overflow: 'hidden'`)** :
   - Toujours associer `borderRadius` et `overflow: 'hidden' as const` sur le conteneur du `Pressable` pour que l'onde ne déborde pas des angles arrondis.
   - Sur iOS, ajouter si pertinent un feedback visuel natif ou opacité d'appui.

4. **Modèle de Référence Standard** :
   ```tsx
   import { Pressable, StyleSheet } from 'react-native';
   import { useColorScheme } from '@/components/useColorScheme';
   import Colors from '@/constants/Colors';

   const colorScheme = useColorScheme() ?? 'light';
   const theme = Colors[colorScheme];

   const itemStyle = [
     styles.container,
     {
       borderRadius: 12,
       overflow: 'hidden' as const,
       backgroundColor: theme.card,
     },
     style,
   ];

   return (
     <Pressable
       onPress={onPress}
       disabled={disabled}
       android_ripple={
         disabled
           ? undefined
           : {
               color: theme.ripple,
               borderless: false,
               foreground: true,
             }
       }
       style={itemStyle}>
       {children}
     </Pressable>
   );
   ```
