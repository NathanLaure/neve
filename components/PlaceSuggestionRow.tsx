import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Building2, Home, MapPin, MountainSnow, RotateCcw, TrainFront, TreePine, Waves } from 'lucide-react-native';
import Colors from '@/constants/Colors';

/**
 * Ligne de suggestion de lieu, partagée par l'écran de recherche et la feuille de
 * saisie du point de départ (écran de planification).
 *
 * Extrait de app/search.tsx : les deux écrans doivent proposer exactement la même
 * présentation, sans quoi la même adresse s'afficherait de deux façons.
 */

export type PlaceKind =
  | 'nearby'
  | 'water'
  | 'mountain'
  | 'forest'
  | 'village'
  | 'city'
  | 'station'
  | 'recent';

// Icône + couleur par nature de lieu. Les fonds discrets reprennent les jetons de
// statut du design system pour rester dans la palette dans les deux thèmes.
export const PLACE_KINDS: Record<
  PlaceKind,
  { icon: any; light: { fg: string; bg: string }; dark: { fg: string; bg: string } }
> = {
  nearby: {
    icon: MapPin,
    light: { fg: '#EB490B', bg: '#FDEFE9' }, // primary / brand subtle
    dark: { fg: '#FA6415', bg: '#2A1206' },
  },
  mountain: {
    icon: MountainSnow,
    light: { fg: '#457B9D', bg: '#F1F5F7' }, // statusBgInfo / Subtle
    dark: { fg: '#98C1D9', bg: '#0A192F' },
  },
  water: {
    icon: Waves,
    light: { fg: '#2A7F86', bg: '#EFF6F6' },
    dark: { fg: '#7FC6CC', bg: '#08221F' },
  },
  forest: {
    icon: TreePine,
    light: { fg: '#386641', bg: '#F2F6F3' }, // statusBgSuccess / Subtle
    dark: { fg: '#6A994E', bg: '#0D1F11' },
  },
  village: {
    icon: Home,
    light: { fg: '#B07D06', bg: '#FDFAF2' }, // statusBgWarning / Subtle
    dark: { fg: '#E9C46A', bg: '#241800' },
  },
  city: {
    icon: Building2,
    light: { fg: '#525252', bg: '#FFFFFF' },
    dark: { fg: '#BDBDBD', bg: '#111111' },
  },
  // Gares et stations : la couleur de marque, parce que c'est le point d'entrée
  // du réseau et le cœur de ce que l'app fait chercher.
  station: {
    icon: TrainFront,
    light: { fg: '#EB490B', bg: '#FDEFE9' },
    dark: { fg: '#FA6415', bg: '#2A1206' },
  },
  recent: {
    icon: RotateCcw,
    light: { fg: '#525252', bg: '#FFFFFF' },
    dark: { fg: '#BDBDBD', bg: '#111111' },
  },
};

const ACCENT_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ä: 'a', è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i', ò: 'o', ó: 'o', ô: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ç: 'c', ÿ: 'y', ñ: 'n',
};

const deaccent = (value: string) =>
  value.toLowerCase().replace(/[àáâäèéêëìíîïòóôöùúûüçÿñ]/g, (c) => ACCENT_MAP[c] ?? c);

// Correspondance sur mot entier. La recherche par sous-chaîne était la principale
// source d'icônes fausses : « mont » se déclenchait sur Montpellier/Montreuil,
// « bois » sur Boissy, « mer » sur Merville.
const words = (...list: string[]) =>
  new RegExp(`(^|[\\s'’\\-])(${list.join('|')})([\\s'’\\-]|$)`);

/* Un POI Mapbox peut être une gare comme une boulangerie : seul son intitulé
   permet de trancher. */
const TRANSIT_NAME = words('gare', 'gares', 'station', 'metro', 'rer', 'tramway', 'halte');

const WATER_NAME = words(
  'mer', 'mers', 'plage', 'plages', 'lac', 'lacs', 'etang', 'etangs', 'bains',
  'golfe', 'baie', 'ile', 'iles', 'port', 'riviere', 'cascade', 'cote', 'sables'
);
const MOUNTAIN_NAME = words(
  'mont', 'monts', 'montagne', 'montagnes', 'alpe', 'alpes', 'pic', 'col', 'cols',
  'aiguille', 'aiguilles', 'massif', 'pyrenees', 'cime', 'crete', 'glacier', 'vallon', 'puy'
);
const FOREST_NAME = words(
  'foret', 'forets', 'bois', 'parc', 'vallee', 'sylve', 'chene', 'chenes', 'pins',
  'clairiere', 'futaie', 'nature'
);
// Les départements côtiers sont testés avant les massifs pour qu'Alpes-Maritimes
// donne la mer plutôt que les sommets.
const WATER_DEPT = words('maritime', 'maritimes', 'atlantique', 'mediterranee', 'manche', 'finistere', 'morbihan', 'vendee');
const MOUNTAIN_DEPT = words('savoie', 'isere', 'alpes', 'pyrenees', 'jura', 'vosges', 'cantal', 'ardeche', 'drome', 'corse', 'ariege');

// Quelques lieux que les règles ci-dessus ne peuvent honnêtement pas deviner : une
// ville de lac dans un département de montagne, un village connu pour sa forêt.
// Cette liste doit rester courte.
const NOTABLE_PLACES: Record<string, PlaceKind> = {
  annecy: 'water',
  evian: 'water',
  thonon: 'water',
  biarritz: 'water',
  chamonix: 'mountain',
  fontainebleau: 'forest',
  rambouillet: 'forest',
  barbizon: 'forest',
};

/**
 * Classe un lieu d'après son nom, son département et — quand la suggestion vient
 * de Mapbox — son place_type, seul signal fiable pour distinguer ville et village.
 */
export function getPlaceKind(name: string, dept: string, placeType?: string): PlaceKind {
  const n = deaccent(name);
  const d = deaccent(dept);

  /* Testé avant tout le reste : une gare porte le nom de sa commune, et
     « Gare de Fontainebleau-Avon » repartirait en forêt sur la règle du nom. */
  if (placeType === 'station') return 'station';
  if (placeType === 'poi' && TRANSIT_NAME.test(n)) return 'station';

  for (const [key, kind] of Object.entries(NOTABLE_PLACES)) {
    if (n.includes(key)) return kind;
  }

  if (WATER_NAME.test(n)) return 'water';
  if (MOUNTAIN_NAME.test(n)) return 'mountain';
  if (FOREST_NAME.test(n)) return 'forest';
  if (WATER_DEPT.test(d)) return 'water';
  if (MOUNTAIN_DEPT.test(d)) return 'mountain';

  // Mapbox classe « locality » et « neighborhood » en dessous de « place », ce qui
  // recoupe assez bien village vs ville. Les communes en Saint-* sont très
  // majoritairement petites.
  if (placeType === 'locality' || placeType === 'neighborhood') return 'village';
  if (/^sainte?[\s-]/.test(n)) return 'village';

  return 'city';
}

export interface PlaceSuggestionRowProps {
  kind: PlaceKind;
  name: string;
  dept?: string;
  scheme: 'light' | 'dark';
  textColor: string;
  mutedColor: string;
  onPress: () => void;
}

export default function PlaceSuggestionRow({
  kind,
  name,
  dept,
  scheme,
  textColor,
  mutedColor,
  onPress,
}: PlaceSuggestionRowProps) {
  const palette = PLACE_KINDS[kind][scheme];
  const Icon = PLACE_KINDS[kind].icon;
  const theme = Colors[scheme];
  const rowStyle = [
    styles.suggestionRow,
    {
      borderRadius: 12,
      overflow: 'hidden' as const,
      paddingHorizontal: 8,
    },
  ];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={rowStyle}>
      <View style={[styles.suggestionIconWrapper, { backgroundColor: palette.bg }]}>
        <Icon size={18} color={palette.fg} />
      </View>
      <View style={styles.suggestionTextRow}>
        <Text style={[styles.suggestionName, { color: textColor }]}>{name}</Text>
        {dept ? (
          <>
            <Text style={styles.suggestionSeparator}>·</Text>
            <Text style={[styles.suggestionDept, { color: mutedColor }]}>{dept}</Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  suggestionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  suggestionName: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 14,
  },
  suggestionSeparator: {
    marginHorizontal: 4,
    color: '#7c7c7c',
  },
  suggestionDept: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
});
