import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';

export default function RandoDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { getTransitInfo, userLocationName, hikes } = useAdventure();

  // Find the hike
  const rando = hikes.find((r) => r.id === id);

  if (!rando) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Randonnée introuvable</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.tint }]}>
          <Text style={styles.backBtnText}>{"Retourner à l'accueil"}</Text>
        </Pressable>
      </View>
    );
  }

  const transit = getTransitInfo(rando);

  // Map difficulty to color
  const getDifficultyColor = () => {
    switch (rando.difficulty) {
      case 'Facile':
        return '#2E7D32';
      case 'Difficile':
        return '#C62828';
      case 'Modéré':
      default:
        return '#EF6C00';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: rando.title,
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.card },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: rando.imageUrl }} style={styles.image} />
          <View style={styles.difficultyBadgeOverlay}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() }]}>
              <Text style={styles.difficultyText}>{rando.difficulty}</Text>
            </View>
          </View>
        </View>

        {/* Title and Base Info */}
        <View
          style={[
            styles.section,
            styles.headerSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <Text style={[styles.title, { color: theme.text }]}>{rando.title}</Text>
          <Text style={[styles.description, { color: theme.textMuted }]}>{rando.description}</Text>

          {/* Key Specs */}
          <View style={styles.specsRow}>
            <View style={[styles.specItem, { backgroundColor: theme.greenBadge }]}>
              <Text style={[styles.specEmoji, { color: theme.tint }]}>🥾</Text>
              <View>
                <Text style={[styles.specLabel, { color: theme.textMuted }]}>Distance</Text>
                <Text style={[styles.specVal, { color: theme.text }]}>{rando.distance}</Text>
              </View>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.greenBadge }]}>
              <Text style={[styles.specEmoji, { color: theme.tint }]}>📈</Text>
              <View>
                <Text style={[styles.specLabel, { color: theme.textMuted }]}>Dénivelé</Text>
                <Text style={[styles.specVal, { color: theme.text }]}>{rando.elevation}</Text>
              </View>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.greenBadge }]}>
              <Text style={[styles.specEmoji, { color: theme.tint }]}>⏱️</Text>
              <View>
                <Text style={[styles.specLabel, { color: theme.textMuted }]}>Durée</Text>
                <Text style={[styles.specVal, { color: theme.text }]}>{rando.durationHours}h</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Train Transport Segment */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="train" size={20} color={theme.secondary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transport Éco-Responsable
            </Text>
          </View>

          <View style={[styles.transitCard, { backgroundColor: theme.blueBadge }]}>
            <View style={styles.stationRow}>
              <View style={styles.stationNodeWrapper}>
                <View style={[styles.stationDot, { backgroundColor: theme.secondary }]} />
                <View style={[styles.stationLine, { backgroundColor: theme.secondary }]} />
                <View style={[styles.stationDot, { backgroundColor: theme.tint }]} />
              </View>
              <View style={styles.stationLabelWrapper}>
                <View>
                  <Text style={[styles.stationType, { color: theme.textMuted }]}>
                    Départ ({userLocationName})
                  </Text>
                  <Text style={[styles.stationName, { color: theme.text }]}>
                    {rando.startStation}
                  </Text>
                </View>
                <View style={{ marginTop: 24 }}>
                  <Text style={[styles.stationType, { color: theme.textMuted }]}>
                    Arrivée randonnée
                  </Text>
                  <Text style={[styles.stationName, { color: theme.text }]}>
                    {rando.endStation}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.transitMetaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>
                  Trajet : <Text style={{ fontWeight: '800' }}>{transit.durationText}</Text>
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🎫</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>
                  Est. : <Text style={{ fontWeight: '800' }}>{rando.priceEst.toFixed(2)}€</Text>
                </Text>
              </View>
              <View style={[styles.trainBadge, { backgroundColor: theme.secondary }]}>
                <Text style={styles.trainBadgeText}>{rando.trainType}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* GPX Map Trace */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="map" size={20} color={theme.tint} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {"Tracé GPX de l'Aventure"}
            </Text>
          </View>

          <View style={[styles.gpxMap, { backgroundColor: theme.greenBadge }]}>
            {/* Draw a stylized line using views to represent the GPX trace */}
            <View style={styles.topoGrid}>
              <View
                style={[
                  styles.topoLine,
                  { borderStyle: 'dashed', borderColor: theme.border, width: '100%', top: '30%' },
                ]}
              />
              <View
                style={[
                  styles.topoLine,
                  { borderStyle: 'dashed', borderColor: theme.border, width: '100%', top: '60%' },
                ]}
              />
              <View
                style={[
                  styles.topoLineVertical,
                  { borderStyle: 'dashed', borderColor: theme.border, height: '100%', left: '30%' },
                ]}
              />
              <View
                style={[
                  styles.topoLineVertical,
                  { borderStyle: 'dashed', borderColor: theme.border, height: '100%', left: '70%' },
                ]}
              />
            </View>

            {/* Custom GPX path drawn visually */}
            <View style={styles.gpxTraceContainer}>
              <SvgMockTrace />
            </View>

            {/* Pin elements */}
            <View style={[styles.mapMarker, { left: '15%', top: '45%' }]}>
              <View style={[styles.markerPin, { backgroundColor: theme.secondary }]}>
                <Text style={styles.markerPinText}>🚆</Text>
              </View>
              <Text style={[styles.markerLabel, { color: theme.text }]}>Départ</Text>
            </View>

            <View style={[styles.mapMarker, { right: '15%', bottom: '25%' }]}>
              <View style={[styles.markerPin, { backgroundColor: theme.tint }]}>
                <Text style={styles.markerPinText}>🌲</Text>
              </View>
              <Text style={[styles.markerLabel, { color: theme.text }]}>Arrivée</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Bottom Booking Section */}
      <View
        style={[
          styles.floatingBottom,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <Pressable
          onPress={() => router.push(`/plan?randoId=${rando.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, width: '100%' })}>
          <View style={[styles.planBtn, { backgroundColor: theme.tint }]}>
            <Ionicons name="calendar" size={20} color="#FFFFFF" />
            <Text style={styles.planBtnText}>Planifier cette aventure</Text>
          </View>
        </Pressable>
      </View>
    </>
  );
}

// Simple vector representation of a GPX trace for high reliability on web and native
function SvgMockTrace() {
  return (
    <View style={styles.svgMockContainer}>
      <View
        style={[
          styles.svgSegment,
          {
            width: 60,
            height: 4,
            transform: [{ rotate: '20deg' }],
            left: 40,
            top: 90,
            backgroundColor: '#4CAF50',
          },
        ]}
      />
      <View
        style={[
          styles.svgSegment,
          {
            width: 80,
            height: 4,
            transform: [{ rotate: '-45deg' }],
            left: 95,
            top: 75,
            backgroundColor: '#4CAF50',
          },
        ]}
      />
      <View
        style={[
          styles.svgSegment,
          {
            width: 50,
            height: 4,
            transform: [{ rotate: '60deg' }],
            left: 150,
            top: 70,
            backgroundColor: '#4CAF50',
          },
        ]}
      />
      <View
        style={[
          styles.svgSegment,
          {
            width: 70,
            height: 4,
            transform: [{ rotate: '-10deg' }],
            left: 180,
            top: 105,
            backgroundColor: '#4CAF50',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Satoshi',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerBack: {
    padding: 8,
    marginRight: 8,
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    height: 230,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  difficultyBadgeOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  difficultyBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  difficultyText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  headerSection: {
    marginTop: 16,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  description: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 16,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  specItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  specEmoji: {
    fontSize: 18,
  },
  specLabel: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  specVal: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  transitCard: {
    borderRadius: 16,
    padding: 14,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  stationNodeWrapper: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stationLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stationLabelWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stationType: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stationName: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  transitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '600',
  },
  trainBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trainBadgeText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  gpxMap: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  topoGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  topoLine: {
    position: 'absolute',
    borderTopWidth: 1,
  },
  topoLineVertical: {
    position: 'absolute',
    borderLeftWidth: 1,
  },
  gpxTraceContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  svgMockContainer: {
    flex: 1,
    position: 'relative',
  },
  svgSegment: {
    position: 'absolute',
    borderRadius: 2,
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  markerPinText: {
    fontSize: 11,
  },
  markerLabel: {
    fontFamily: 'Satoshi',
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  floatingBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1F5F3E',
  },
  planBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
