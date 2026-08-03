import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import Chip from '@/components/Chip';
import RangeSlider from '@/components/RangeSlider';
import ToggleRow from '@/components/ToggleRow';

const ACTIVITY_TYPES = [
  'Randonnée',
  'Balade',
  'Course à pied',
  'Trail',
  'VTT',
  'Vélo de route',
  'Itinérance',
  'Camping',
  'Refuge',
  'Cyclotourisme',
  'Via ferrata',
  'Randonnée à cheval',
  'Ski de fond',
  'Ski alpin',
];

const POINTS_OF_INTEREST = [
  'Vue panoramique',
  'Forêt',
  'Fleurs',
  'Lac',
  'Rivière',
  'Cascade',
  'Faune sauvage',
  'Plage',
  'Grotte',
  'Sources chaudes',
  'Site historique',
  'Voies vertes',
  'Balade en ville',
];

const GEOGRAPHIC_ZONES = [
  { id: 'idf', label: 'Ile de France', sub: 'Pass Navigo' },
  { id: 'france', label: 'France', sub: 'Métropolitaine' },
  { id: 'monde', label: 'Monde', sub: '' },
];

export interface FiltersFormProps {
  // Local state values and setters
  difficulties: string[];
  setDifficulties: React.Dispatch<React.SetStateAction<string[]>>;
  trainRange: [number, number];
  setTrainRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  distanceRange: [number, number];
  setDistanceRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  elevationRange: [number, number];
  setElevationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  highestPointRange: [number, number];
  setHighestPointRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  geographicZone: string;
  setGeographicZone: React.Dispatch<React.SetStateAction<string>>;
  dogsAllowed: boolean;
  setDogsAllowed: React.Dispatch<React.SetStateAction<boolean>>;
  kidsFriendly: boolean;
  setKidsFriendly: React.Dispatch<React.SetStateAction<boolean>>;
  wheelchairFriendly: boolean;
  setWheelchairFriendly: React.Dispatch<React.SetStateAction<boolean>>;
  activityTypes: string[];
  setActivityTypes: React.Dispatch<React.SetStateAction<string[]>>;
  pointsOfInterest: string[];
  setPointsOfInterest: React.Dispatch<React.SetStateAction<string[]>>;
  parcoursType: string[];
  setParcoursType: React.Dispatch<React.SetStateAction<string[]>>;
  frequentation: string[];
  setFrequentation: React.Dispatch<React.SetStateAction<string[]>>;
  communityNote: number | null;
  setCommunityNote: React.Dispatch<React.SetStateAction<number | null>>;

  // Display toggles
  showDifficulties?: boolean;
  showTrainRange?: boolean;
  showDistanceRange?: boolean;
  showElevationRange?: boolean;
  showHighestPointRange?: boolean;
  showAccessibility?: boolean;
  showActivityTypes?: boolean;
  showPointsOfInterest?: boolean;
  showParcoursType?: boolean;
  showFrequentation?: boolean;
  showCommunityNote?: boolean;
}

export default function FiltersForm({
  difficulties,
  setDifficulties,
  trainRange,
  setTrainRange,
  distanceRange,
  setDistanceRange,
  elevationRange,
  setElevationRange,
  highestPointRange,
  setHighestPointRange,
  geographicZone,
  setGeographicZone,
  dogsAllowed,
  setDogsAllowed,
  kidsFriendly,
  setKidsFriendly,
  wheelchairFriendly,
  setWheelchairFriendly,
  activityTypes,
  setActivityTypes,
  pointsOfInterest,
  setPointsOfInterest,
  parcoursType,
  setParcoursType,
  frequentation,
  setFrequentation,
  communityNote,
  setCommunityNote,

  // Default display values
  showDifficulties = true,
  showTrainRange = true,
  showDistanceRange = true,
  showElevationRange = true,
  showHighestPointRange = true,
  showAccessibility = true,
  showActivityTypes = true,
  showPointsOfInterest = true,
  showParcoursType = true,
  showFrequentation = true,
  showCommunityNote = true,
}: FiltersFormProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { userLocationName } = useAdventure();

  const toggleDifficulty = (diff: string) => {
    setDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  const toggleActivity = (act: string) => {
    setActivityTypes((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  const togglePOI = (poi: string) => {
    setPointsOfInterest((prev) =>
      prev.includes(poi) ? prev.filter((p) => p !== poi) : [...prev, poi]
    );
  };

  const toggleParcoursType = (type: string) => {
    setParcoursType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleFrequentation = (freq: string) => {
    setFrequentation((prev) =>
      prev.includes(freq) ? prev.filter((f) => f !== freq) : [...prev, freq]
    );
  };

  const formatTrainLabel = (val: number) => {
    if (val >= 180) return 'Toutes';
    if (val >= 60) {
      const h = Math.floor(val / 60);
      const m = val % 60;
      return m > 0 ? `${h}h${m}` : `${h}h`;
    }
    return `${val} min`;
  };

  return (
    <View style={styles.container}>
      {/* Difficulty */}
      {showDifficulties && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>Difficulté</Text>
          <View style={styles.chipsRow}>
            {['Facile', 'Modéré', 'Difficile'].map((diff) => {
              const isSelected = difficulties.includes(diff);
              let diffStyle = {};
              let diffTextStyle = {};

              if (diff === 'Facile') {
                diffStyle = isSelected
                  ? { backgroundColor: theme.statusBgSuccess, borderColor: theme.statusBgSuccess }
                  : { backgroundColor: theme.statusBgSuccessSubtle, borderColor: theme.statusBgSuccess, borderWidth: 1 };
                diffTextStyle = { color: isSelected ? '#FFFFFF' : theme.statusTextSuccess };
              } else if (diff === 'Modéré') {
                diffStyle = isSelected
                  ? { backgroundColor: theme.statusBgWarning, borderColor: theme.statusBgWarning }
                  : { backgroundColor: theme.statusBgWarningSubtle, borderColor: theme.statusBgWarning, borderWidth: 1 };
                diffTextStyle = { color: isSelected ? '#FFFFFF' : theme.statusTextWarning };
              } else {
                diffStyle = isSelected
                  ? { backgroundColor: theme.statusBgError, borderColor: theme.statusBgError }
                  : { backgroundColor: theme.statusBgErrorSubtle, borderColor: theme.statusBgError, borderWidth: 1 };
                diffTextStyle = { color: isSelected ? '#FFFFFF' : theme.statusTextError };
              }

              return (
                <Chip
                  key={diff}
                  text={diff}
                  selected={isSelected}
                  onPress={() => toggleDifficulty(diff)}
                  style={diffStyle}
                  textStyle={diffTextStyle}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Train Duration Slider */}
      {showTrainRange && (
        <RangeSlider
          title="Temps de transport"
          subtitle={
            <Text style={[styles.filterOriginText, { color: theme.textMuted }]}>
              Depuis <Text style={{ color: theme.text }}>{userLocationName}</Text>
            </Text>
          }
          min={0}
          max={180}
          values={trainRange}
          onChange={setTrainRange}
          valueFormatter={(minVal, maxVal) => `${minVal}-${formatTrainLabel(maxVal)}`}
        />
      )}

      {/* Distance Slider */}
      {showDistanceRange && (
        <RangeSlider
          title="Distance du parcours"
          min={0}
          max={34}
          values={distanceRange}
          onChange={setDistanceRange}
          valueFormatter={(minVal, maxVal) =>
            `${minVal}-${maxVal === 34 ? 'Toutes' : `${maxVal} km`}`
          }
        />
      )}

      {/* Elevation Slider */}
      {showElevationRange && (
        <RangeSlider
          title="Dénivelé positif"
          min={0}
          max={4500}
          values={elevationRange}
          onChange={setElevationRange}
          valueFormatter={(minVal, maxVal) =>
            `${minVal}-${maxVal === 4500 ? 'Tous' : `${maxVal} m+`}`
          }
        />
      )}

      {/* Highest Point Slider */}
      {showHighestPointRange && (
        <RangeSlider
          title="Point le plus élevé"
          min={0}
          max={4500}
          values={highestPointRange}
          onChange={setHighestPointRange}
          valueFormatter={(minVal, maxVal) =>
            `${minVal}-${maxVal === 4500 ? 'Tous' : `${maxVal} m`}`
          }
        />
      )}

      {/* Accessibility */}
      {showAccessibility && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>Accessibilité</Text>
          <Text style={[styles.filterSubText, { color: theme.textMuted }]}>
            Zone géographique pour limiter vos résultats en priorité
          </Text>

          {/* Segment Selector for Zone */}
          <View style={[styles.segmentContainer, { borderColor: theme.border }]}>
            {GEOGRAPHIC_ZONES.map((zone, idx) => {
              const isSelected = geographicZone === zone.id;
              const isLast = idx === GEOGRAPHIC_ZONES.length - 1;
              return (
                <Pressable
                  key={zone.id}
                  onPress={() => setGeographicZone(zone.id)}
                  style={[
                    styles.segmentButton,
                    isSelected
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: theme.background },
                    !isLast && { borderRightWidth: 1, borderRightColor: theme.border },
                  ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isSelected && <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />}
                    <Text
                      style={[
                        styles.segmentLabel,
                        isSelected ? { color: '#FFFFFF' } : { color: theme.text },
                      ]}>
                      {zone.label}
                    </Text>
                  </View>
                  {zone.sub ? (
                    <Text
                      style={[
                        styles.segmentSub,
                        isSelected ? { color: 'rgba(255,255,255,0.85)' } : { color: theme.textMuted },
                      ]}>
                      {zone.sub}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Toggles */}
          <ToggleRow
            title="Accessible aux chiens"
            value={dogsAllowed}
            onValueChange={setDogsAllowed}
          />
          <ToggleRow
            title="Convient aux enfants"
            value={kidsFriendly}
            onValueChange={setKidsFriendly}
            style={{ marginTop: 12 }}
          />
          <ToggleRow
            title="Convient aux fauteuils roulants"
            value={wheelchairFriendly}
            onValueChange={setWheelchairFriendly}
            style={{ marginTop: 12 }}
          />
        </View>
      )}

      {/* Activity Types Grid */}
      {showActivityTypes && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
            Type d’activité
          </Text>
          <View style={styles.chipsWrapRow}>
            {ACTIVITY_TYPES.map((act) => {
              const isSelected = activityTypes.includes(act);
              return (
                <Chip
                  key={act}
                  text={act}
                  selected={isSelected}
                  onPress={() => toggleActivity(act)}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Points of interest Grid */}
      {showPointsOfInterest && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
            Points d’intérêts
          </Text>
          <View style={styles.chipsWrapRow}>
            {POINTS_OF_INTEREST.map((poi) => {
              const isSelected = pointsOfInterest.includes(poi);
              return (
                <Chip
                  key={poi}
                  text={poi}
                  selected={isSelected}
                  onPress={() => togglePOI(poi)}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Route Type */}
      {showParcoursType && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
            Type de parcours
          </Text>
          <View style={styles.chipsWrapRow}>
            {['Point A → point B', 'Aller-retour', 'Boucle'].map((type) => {
              const isSelected = parcoursType.includes(type);
              return (
                <Chip
                  key={type}
                  text={type}
                  selected={isSelected}
                  onPress={() => toggleParcoursType(type)}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Frequentation */}
      {showFrequentation && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
            Fréquentation
          </Text>
          <View style={styles.chipsWrapRow}>
            {['Calme', 'Fréquenté', 'Très fréquenté'].map((freq) => {
              const isSelected = frequentation.includes(freq);
              return (
                <Chip
                  key={freq}
                  text={freq}
                  selected={isSelected}
                  onPress={() => toggleFrequentation(freq)}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Community Note */}
      {showCommunityNote && (
        <View style={styles.filterGroup}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
            Note de la communauté
          </Text>
          <View style={styles.chipsWrapRow}>
            {[4, 3, 2].map((note) => {
              const isSelected = communityNote === note;
              return (
                <Chip
                  key={note}
                  text={`${note}★ et plus`}
                  selected={isSelected}
                  onPress={() => setCommunityNote(isSelected ? null : note)}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  filterGroup: {
    marginBottom: 28,
    width: '100%',
  },
  filterGroupTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    marginBottom: 12,
  },
  filterOriginText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
  },
  filterSubText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 44,
  },
  segmentLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
  segmentSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 9,
    marginTop: 1,
  },
});
