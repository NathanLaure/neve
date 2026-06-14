import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { TrainOption } from '@/constants/RandosData';

// Generate dynamic dates (next 7 days starting tomorrow)
const generateDates = () => {
  const dates = [];
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    // Format YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const isoString = `${yyyy}-${mm}-${dd}`;

    dates.push({
      isoString,
      displayString: date.toLocaleDateString('fr-FR', options),
      dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNum: date.getDate(),
    });
  }
  return dates;
};

export default function PlanScreen() {
  const { randoId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { addAdventure, userLocationName, hikes } = useAdventure();

  // Find the hike
  const rando = hikes.find((r) => r.id === randoId);

  // Flow State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const availableDates = useMemo(() => generateDates(), []);

  // Step 1 State: Dates
  const [selectedOutwardDate, setSelectedOutwardDate] = useState<string>(
    availableDates[0].isoString
  );
  const [selectedReturnDate, setSelectedReturnDate] = useState<string>(availableDates[0].isoString); // Default same day

  // Step 2 State: Outward Train & Departure Station
  const [departureStation, setDepartureStation] = useState<string>(userLocationName);
  const [selectedOutwardTrain, setSelectedOutwardTrain] = useState<TrainOption | null>(null);

  // Step 3 State: Return Train
  const [selectedReturnTrain, setSelectedReturnTrain] = useState<TrainOption | null>(null);

  if (!rando) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Aventure introuvable</Text>
        <Pressable onPress={() => router.back()}>
          <View style={[styles.backBtn, { backgroundColor: theme.tint }]}>
            <Text style={styles.backBtnText}>Retour</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // Handle collapsible toggle
  const toggleStep = (step: 1 | 2 | 3) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveStep(step);
  };

  const handleConfirmDates = () => {
    toggleStep(2);
  };

  const handleConfirmOutward = () => {
    if (selectedOutwardTrain) {
      toggleStep(3);
    }
  };

  const handleFinalize = () => {
    if (selectedOutwardTrain && selectedReturnTrain) {
      const advId = addAdventure({
        randoId: rando.id,
        outwardDate: selectedOutwardDate,
        returnDate: selectedReturnDate,
        outwardTrain: selectedOutwardTrain,
        returnTrain: selectedReturnTrain,
        departureStationName: departureStation,
        isBooked: false,
      });

      // Navigate to Recap screen
      router.replace(`/recap?adventureId=${advId}`);
    }
  };

  // Helper date labels
  const outwardDateLabel =
    availableDates.find((d) => d.isoString === selectedOutwardDate)?.displayString ||
    selectedOutwardDate;
  const returnDateLabel =
    availableDates.find((d) => d.isoString === selectedReturnDate)?.displayString ||
    selectedReturnDate;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Planification',
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
        {/* Hike Header Summary */}
        <View
          style={[
            styles.hikeSummaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <Text style={[styles.hikeSummaryLabel, { color: theme.textMuted }]}>
            {"Planification de l'éco-rando"}
          </Text>
          <Text style={[styles.hikeSummaryTitle, { color: theme.text }]}>{rando.title}</Text>
          <Text style={[styles.hikeSummarySpecs, { color: theme.tint }]}>
            🚆 {departureStation} → {rando.startStation} • 🥾 {rando.distance} (
            {rando.durationHours}h)
          </Text>
        </View>

        {/* STEP 1: DATES */}
        <View
          style={[
            styles.stepContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          {activeStep !== 1 ? (
            // Collapsed Step 1
            <Pressable onPress={() => toggleStep(1)} style={styles.collapsedHeader}>
              <View style={styles.stepNumLabelWrapper}>
                <View style={[styles.stepDoneBadge, { backgroundColor: theme.tint }]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <Text style={[styles.stepTitleCollapsed, { color: theme.text }]}>
                  Dates du voyage
                </Text>
              </View>
              <Text style={[styles.collapsedSummaryText, { color: theme.tint }]}>
                {selectedOutwardDate === selectedReturnDate
                  ? outwardDateLabel
                  : `Du ${outwardDateLabel} au ${returnDateLabel}`}
              </Text>
            </Pressable>
          ) : (
            // Expanded Step 1
            <View style={styles.expandedContent}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepTitleExpanded, { color: theme.text }]}>
                  Sélectionner les dates
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 14 }]}>
                Date Aller :
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateSelectorRow}>
                {availableDates.map((date) => {
                  const isSelected = selectedOutwardDate === date.isoString;
                  return (
                    <Pressable
                      key={date.isoString}
                      onPress={() => {
                        setSelectedOutwardDate(date.isoString);
                        // Enforce return date >= outward date
                        if (new Date(selectedReturnDate) < new Date(date.isoString)) {
                          setSelectedReturnDate(date.isoString);
                        }
                      }}
                      style={[
                        styles.dateCard,
                        {
                          backgroundColor: isSelected ? theme.tint : theme.background,
                          borderColor: isSelected ? theme.tint : theme.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.dateCardDay,
                          { color: isSelected ? '#FFFFFF' : theme.textMuted },
                        ]}>
                        {date.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardNum,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}>
                        {date.dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 16 }]}>
                Date Retour :
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateSelectorRow}>
                {availableDates.map((date) => {
                  // Must not be before outward date
                  const isDisabled = new Date(date.isoString) < new Date(selectedOutwardDate);
                  const isSelected = selectedReturnDate === date.isoString;

                  return (
                    <Pressable
                      key={date.isoString}
                      disabled={isDisabled}
                      onPress={() => setSelectedReturnDate(date.isoString)}
                      style={[
                        styles.dateCard,
                        {
                          backgroundColor: isSelected ? theme.tint : theme.background,
                          borderColor: isSelected ? theme.tint : theme.border,
                          opacity: isDisabled ? 0.3 : 1,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.dateCardDay,
                          { color: isSelected ? '#FFFFFF' : theme.textMuted },
                        ]}>
                        {date.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardNum,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}>
                        {date.dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                onPress={handleConfirmDates}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, width: '100%' })}>
                <View style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.confirmBtnText}>Valider les dates</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* STEP 2: OUTWARD JOURNEY */}
        <View
          style={[
            styles.stepContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          {activeStep !== 2 ? (
            // Collapsed Step 2
            <Pressable
              disabled={activeStep < 2}
              onPress={() => toggleStep(2)}
              style={[styles.collapsedHeader, { opacity: activeStep < 2 ? 0.5 : 1 }]}>
              <View style={styles.stepNumLabelWrapper}>
                <View
                  style={[
                    styles.stepDoneBadge,
                    { backgroundColor: selectedOutwardTrain ? theme.tint : theme.border },
                  ]}>
                  {selectedOutwardTrain ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumberTextCollapsed, { color: theme.textMuted }]}>
                      2
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepTitleCollapsed, { color: theme.text }]}>Train aller</Text>
              </View>
              {selectedOutwardTrain && (
                <Text style={[styles.collapsedSummaryText, { color: theme.tint }]}>
                  {selectedOutwardTrain.time} ({selectedOutwardTrain.price.toFixed(2)}€)
                </Text>
              )}
            </Pressable>
          ) : (
            // Expanded Step 2
            <View style={styles.expandedContent}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepTitleExpanded, { color: theme.text }]}>
                  Choisir le train aller
                </Text>
              </View>

              <Text style={[styles.stepHelperText, { color: theme.textMuted }]}>
                Trajet de {departureStation} vers {rando.startStation} le {outwardDateLabel}.
              </Text>

              {/* Station Changer */}
              <View
                style={[
                  styles.stationSelector,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}>
                <Text style={[styles.stationSelectorText, { color: theme.text }]}>
                  Gare de départ :
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}>
                  {['Paris Gare de Lyon', 'Paris Montparnasse', 'Paris Est'].map((st) => {
                    const isSel = departureStation === st;
                    return (
                      <Pressable
                        key={st}
                        onPress={() => setDepartureStation(st)}
                        style={[
                          styles.stationPill,
                          {
                            backgroundColor: isSel ? theme.tint : theme.card,
                            borderColor: isSel ? theme.tint : theme.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.stationPillText,
                            { color: isSel ? '#FFFFFF' : theme.text },
                          ]}>
                          {st.replace('Paris ', '')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* List of Train Options */}
              <View style={styles.trainOptionsList}>
                {rando.trainOptionsGo.map((train) => {
                  const isSelected = selectedOutwardTrain?.id === train.id;
                  return (
                    <Pressable
                      key={train.id}
                      onPress={() => setSelectedOutwardTrain(train)}
                      style={[
                        styles.trainCard,
                        {
                          backgroundColor: isSelected ? theme.blueBadge : theme.background,
                          borderColor: isSelected ? theme.secondary : theme.border,
                        },
                      ]}>
                      <View style={styles.trainCardHeader}>
                        <Text style={[styles.trainCardTime, { color: theme.text }]}>
                          {train.time}
                        </Text>
                        <Text style={[styles.trainCardPrice, { color: theme.secondary }]}>
                          {train.price.toFixed(2)}€
                        </Text>
                      </View>
                      <View style={styles.trainCardFooter}>
                        <Text style={[styles.trainCardMeta, { color: theme.textMuted }]}>
                          🚆 {train.type} • {train.trainNumber}
                        </Text>
                        <Text style={[styles.trainCardDuration, { color: theme.textMuted }]}>
                          Durée : {train.duration}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                disabled={!selectedOutwardTrain}
                onPress={handleConfirmOutward}
                style={({ pressed }) => ({
                  opacity: selectedOutwardTrain ? (pressed ? 0.85 : 1) : 0.5,
                  width: '100%',
                })}>
                <View style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.confirmBtnText}>Valider le train aller</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* STEP 3: RETURN JOURNEY */}
        <View
          style={[
            styles.stepContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          {activeStep !== 3 ? (
            // Collapsed Step 3
            <Pressable
              disabled={activeStep < 3}
              onPress={() => toggleStep(3)}
              style={[styles.collapsedHeader, { opacity: activeStep < 3 ? 0.5 : 1 }]}>
              <View style={styles.stepNumLabelWrapper}>
                <View
                  style={[
                    styles.stepDoneBadge,
                    { backgroundColor: selectedReturnTrain ? theme.tint : theme.border },
                  ]}>
                  {selectedReturnTrain ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumberTextCollapsed, { color: theme.textMuted }]}>
                      3
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepTitleCollapsed, { color: theme.text }]}>Train retour</Text>
              </View>
              {selectedReturnTrain && (
                <Text style={[styles.collapsedSummaryText, { color: theme.tint }]}>
                  {selectedReturnTrain.time} ({selectedReturnTrain.price.toFixed(2)}€)
                </Text>
              )}
            </Pressable>
          ) : (
            // Expanded Step 3
            <View style={styles.expandedContent}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepTitleExpanded, { color: theme.text }]}>
                  Choisir le train retour
                </Text>
              </View>

              <Text style={[styles.stepHelperText, { color: theme.textMuted }]}>
                Trajet de {rando.endStation} vers {departureStation} le {returnDateLabel}.
              </Text>

              {/* List of Train Options */}
              <View style={styles.trainOptionsList}>
                {rando.trainOptionsBack.map((train) => {
                  const isSelected = selectedReturnTrain?.id === train.id;
                  return (
                    <Pressable
                      key={train.id}
                      onPress={() => setSelectedReturnTrain(train)}
                      style={[
                        styles.trainCard,
                        {
                          backgroundColor: isSelected ? theme.blueBadge : theme.background,
                          borderColor: isSelected ? theme.secondary : theme.border,
                        },
                      ]}>
                      <View style={styles.trainCardHeader}>
                        <Text style={[styles.trainCardTime, { color: theme.text }]}>
                          {train.time}
                        </Text>
                        <Text style={[styles.trainCardPrice, { color: theme.secondary }]}>
                          {train.price.toFixed(2)}€
                        </Text>
                      </View>
                      <View style={styles.trainCardFooter}>
                        <Text style={[styles.trainCardMeta, { color: theme.textMuted }]}>
                          🚆 {train.type} • {train.trainNumber}
                        </Text>
                        <Text style={[styles.trainCardDuration, { color: theme.textMuted }]}>
                          Durée : {train.duration}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                disabled={!selectedReturnTrain}
                onPress={handleFinalize}
                style={({ pressed }) => ({
                  opacity: selectedReturnTrain ? (pressed ? 0.85 : 1) : 0.5,
                  width: '100%',
                })}>
                <View style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.confirmBtnText}>Finaliser ma planification</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </>
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
    paddingHorizontal: 16,
  },
  hikeSummaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
  },
  hikeSummaryLabel: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hikeSummaryTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 6,
  },
  hikeSummarySpecs: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '700',
  },
  stepContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNumLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumberTextCollapsed: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
  stepDoneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepTitleCollapsed: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 15,
    fontWeight: '700',
  },
  collapsedSummaryText: {
    fontFamily: 'Satoshi',
    fontSize: 13,
    fontWeight: '800',
  },
  expandedContent: {
    width: '100%',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitleExpanded: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 16,
    fontWeight: '800',
  },
  stepHelperText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  customDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  customDateInputText: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dateSelectorRow: {
    gap: 8,
    paddingVertical: 4,
  },
  dateCard: {
    width: 58,
    height: 68,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dateCardDay: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateCardNum: {
    fontFamily: 'Satoshi',
    fontSize: 18,
    fontWeight: '850',
  },
  stationSelector: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  stationSelectorText: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  stationPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  stationPillText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
  trainOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  trainCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
  },
  trainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainCardTime: {
    fontFamily: 'Satoshi',
    fontSize: 16,
    fontWeight: '800',
  },
  trainCardPrice: {
    fontFamily: 'Satoshi',
    fontSize: 15,
    fontWeight: '850',
  },
  trainCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainCardMeta: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '600',
  },
  trainCardDuration: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '500',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#1F5F3E',
  },
  confirmBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
