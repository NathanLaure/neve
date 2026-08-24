import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Footprints } from 'lucide-react-native';

import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SharedInvitationSheetProps {
  /** « Nathan t'invite à randonner », ou la formule anonyme faute de nom. */
  title: string;
  /** Date de départ en toutes lettres, « 21 mars 2026 ». */
  dateLabel: string;
  /** Reprend l'aventure à son compte : referme et emmène vers la planification. */
  onAccept: () => void;
  /** Referme la feuille et rien d'autre — l'écran reste ouvert derrière. */
  onDismiss: () => void;
  /** Appelé quelle que soit la façon dont la feuille s'est refermée. */
  onClose?: () => void;
}

/**
 * Accueil d'une invitation, à l'ouverture d'un lien de partage.
 *
 * Une invitation mérite un moment : un titre en haut d'écran ne dit pas qui
 * vous invite de la même façon.
 *
 * La seconde issue s'appelle « Voir l'aventure » et non « Plus tard », et ne
 * referme que la feuille. La différence n'est pas cosmétique : le randonneur
 * n'a encore lu ni le sentier, ni les horaires, et le geste naturel pour aller
 * regarder ne doit pas être celui qui le met dehors. « Plus tard » laissait
 * croire qu'on remet une décision alors qu'on veut simplement voir — et il
 * aurait fallu que le glissement vers le bas, lui aussi, ferme tout l'écran.
 *
 * La croix de l'écran reste la seule sortie : une chose, un geste.
 *
 * Les boutons vivent dans le corps et non dans `footer`. Le pied de page de
 * `BaseBottomSheetModal` est une vue en position absolue, superposée au
 * contenu et positionnée sur le fil UI : utile quand une liste défile en
 * dessous, inutile ici où trois lignes tiennent à l'écran, et une pièce mobile
 * de plus dans une feuille qui se mesure déjà elle-même.
 */
const SharedInvitationSheet = forwardRef<BaseBottomSheetModalRef, SharedInvitationSheetProps>(
  ({ title, dateLabel, onAccept, onDismiss, onClose }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal
        ref={ref}
        title={title}
        enableDynamicSizing
        snapPoints={[]}
        onClose={onClose}
        /* Pas de croix : « Voir l'aventure » est la sortie, et la poignée garde
           le glissement vers le bas, qui vaut la même chose. */
        showCloseButton={false}>
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: theme.orangeBadge }]}>
            <Footprints size={28} color={theme.tint} />
          </View>

          <Text style={[styles.date, { color: theme.text }]}>{dateLabel}</Text>

          <Text style={[styles.message, { color: theme.textMuted }]}>
            Prépare tes chaussures, le départ approche !
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Accepter et enregistrer" variant="primary" onPress={onAccept} />
          <Button title="Voir l’aventure" variant="secondary" onPress={onDismiss} />
        </View>
      </BaseBottomSheetModal>
    );
  }
);

SharedInvitationSheet.displayName = 'SharedInvitationSheet';

export default SharedInvitationSheet;

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  /* Empilés et non côte à côte : « Accepter et enregistrer » ne tient pas sur
     une demi-largeur, et les deux issues n'ont pas le même poids. */
  actions: {
    gap: 12,
    marginTop: 16,
  },
});
