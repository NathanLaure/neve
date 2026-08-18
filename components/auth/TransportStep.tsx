import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Button } from '@/components/Button';
import TransportPassPicker from '@/components/TransportPassPicker';
import { TransportPassId } from '@/types/passenger';

interface TransportStepProps {
  passes: TransportPassId[];
  setPasses: (passes: TransportPassId[]) => void;
  onContinue: () => void;
  isLoading?: boolean;
}

/**
 * Abonnements de transport détenus, demandés une fois à l'inscription (Navigo,
 * cartes SNCF, TER) et modifiables ensuite depuis le profil.
 *
 * Une seule question, pas de « oui/non » préalable : la liste porte elle-même sa
 * réponse négative. Contrairement aux étapes de permission encadrantes, il n'y a
 * donc pas de lien « Plus tard » — il ferait doublon avec « Je n'en ai pas
 * encore », qui est déjà coché par défaut.
 *
 * Le titre reste en haut au lieu d'être centré comme dans les autres étapes : la
 * liste occupe trop de hauteur pour qu'un bloc centré tienne sur un petit écran.
 */
export function TransportStep({
  passes,
  setPasses,
  onContinue,
  isLoading = false,
}: TransportStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.contentFlex}>
      <View style={styles.headerGroup}>
        <View style={[styles.iconBadge, { backgroundColor: theme.card }]}>
          <CreditCard size={40} color={theme.primary} />
        </View>

        <View style={styles.headerTextGroup}>
          <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
            Un abonnement de transport ?
          </Text>
          <Text style={[styles.headingSubtitle, { color: theme.textMuted, textAlign: 'center' }]}>
            Cochez ceux que vous possédez : Névé n’affichera que les billets qu’il vous reste
            réellement à acheter pour rejoindre vos sentiers.
          </Text>
        </View>
      </View>

      <TransportPassPicker value={passes} onChange={setPasses} showNoneOption />

      <Button title="Continuer" onPress={onContinue} loading={isLoading} style={styles.actionBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 24,
  },
  headerGroup: {
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    gap: 10,
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
  // Poussé en bas de l'étape, comme le CTA des autres écrans du parcours.
  actionBtn: {
    marginTop: 'auto',
  },
});
