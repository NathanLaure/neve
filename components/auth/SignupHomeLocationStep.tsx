import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Button } from '@/components/Button';
import HomeAddressPicker from '@/components/profile/HomeAddressPicker';
import { GeocodedPlace } from '@/services/geocodingService';

interface SignupHomeLocationStepProps {
  place: GeocodedPlace | null;
  setPlace: (place: GeocodedPlace | null) => void;
  onContinue: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

/**
 * Adresse de domicile, demandée après l'autorisation de localisation GPS et
 * avant le choix des abonnements de transport.
 *
 * Si la permission GPS a été accordée à l'étape précédente, le bouton trailer
 * GPS dans l'input permet de renseigner automatiquement la position en 1 tap.
 */
export function SignupHomeLocationStep({
  place,
  setPlace,
  onContinue,
  onSkip,
  isLoading = false,
}: SignupHomeLocationStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.contentFlex}>
      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>D{'’'}où partez-vous ?</Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          Votre quartier nous sert à trier les randonnées par temps de trajet réel — et c{'’'}est
          ce qui s{'’'}affichera sous votre nom.
        </Text>
      </View>

      <HomeAddressPicker value={place} onChange={setPlace} />

      {/* Bottom Sticky Action Block */}
      <View style={styles.bottomStickyBlock}>
        <Button
          variant="primary"
          title="Continuer"
          onPress={onContinue}
          loading={isLoading}
          disabled={!place}
        />

        <Pressable
          onPress={onSkip || onContinue}
          disabled={isLoading}
          style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.textMuted }]}>
            Je préfère ne pas le préciser
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 20,
  },
  headerTextGroup: {
    gap: 10,
    marginVertical: 8,
  },
  headingTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 26,
    lineHeight: 32,
  },
  headingSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  bottomStickyBlock: {
    marginTop: 'auto',
    gap: 8,
    paddingTop: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
});
