import React, { forwardRef, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
  useSheetScrollBottomPadding,
} from '@/components/BaseBottomSheetModal';
import ChoiceChip from '@/components/ChoiceChip';
import { Button } from '@/components/Button';
import Animated, { SlideInDown } from 'react-native-reanimated';

/**
 * Créneaux proposés, à l'heure pleine.
 *
 * Descendre en dessous de l'heure serait une précision illusoire : la clé de
 * cache de l'Edge Function arrondit l'heure demandée au créneau de 30 minutes, et
 * la recherche balaie de toute façon une fenêtre de 3 h. Deux choix dans la même
 * demi-heure renvoient exactement la même liste de trajets.
 */
export const SELECTABLE_TIMES = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

/** Hauteur d'une ligne, marge comprise — sert à viser la valeur courante à l'ouverture. */
const ROW_HEIGHT = 58;

export interface TimePickerSheetProps {
  /** Texte précédant la pastille, ex. « Aller à partir de ». */
  label: string;
  /** `HH:MM` actuellement retenu. */
  value: string;
  /** Durée de la randonnée en heures, pour prévenir d'une arrivée tardive. */
  durationHours?: number;
  onSelect: (time: string) => void;
  onClose?: () => void;
}

/**
 * Choix de l'heure de départ, ouvert depuis la modale des dates ou depuis la
 * carte de résultats. Une tape choisit et referme : la valeur est unique, un
 * bouton de validation ferait un geste de plus pour rien.
 */
export const TimePickerSheet = forwardRef<BaseBottomSheetModalRef, TimePickerSheetProps>(
  ({ label, value, durationHours, onSelect, onClose }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const scrollBottomPadding = useSheetScrollBottomPadding();
    const scrollRef = useRef<React.ComponentRef<typeof BottomSheetScrollView>>(null);

    // Sans ça, la liste s'ouvre sur 06:00 et il faut défiler jusqu'à sa propre
    // heure à chaque ouverture.
    useEffect(() => {
      const index = SELECTABLE_TIMES.indexOf(value);
      if (index <= 0) return;
      scrollRef.current?.scrollTo({ y: index * ROW_HEIGHT, animated: false });
    }, [value]);

    const handleSelectTime = (selectedTime: string) => {
      onSelect(selectedTime);

      const startHour = parseInt(selectedTime.split(':')[0], 10);
      const estimatedArrivalHour = durationHours ? startHour + Math.ceil(durationHours) : 0;
      const timeIsLate = durationHours ? estimatedArrivalHour >= 19 : false;

      // Si l'horaire sélectionné n'est pas tardif, fermeture automatique.
      // Si l'horaire est tardif, la feuille reste ouverte pour afficher l'alerte et le bouton « J'ai compris ».
      if (!timeIsLate) {
        (ref as any)?.current?.dismiss();
      }
    };

    const startHour = parseInt(value.split(':')[0], 10);
    const estimatedArrivalHour = durationHours ? startHour + Math.ceil(durationHours) : 0;
    const isLate = durationHours ? estimatedArrivalHour >= 19 : false;
    const estimatedArrivalTime = `${Math.min(23, estimatedArrivalHour).toString().padStart(2, '0')}:00`;

    return (
      <BaseBottomSheetModal
        ref={ref}
        title={label}
        titleAccessory={
          /* Même pilule que sur la ligne « Aller à partir de » de l'écran des
             dates, donc même orange : c'est la valeur qu'on règle. */
          <View style={[styles.valuePill, { backgroundColor: theme.tint }]}>
            <Text style={[styles.valuePillText, { color: theme.buttonTextOnBrand }]}>
              {value}
            </Text>
          </View>
        }
        onClose={onClose}
        snapPoints={isLate ? ['100%'] : ['70%']}
        stackBehavior="push"
        scrollableBody
        footerShadow={false}
        footer={
          isLate ? (
            <Animated.View
              key="late-footer"
              entering={SlideInDown.duration(250)}
              style={[
                styles.sheetFooter,
                { backgroundColor: theme.card, borderTopColor: theme.borderLight },
              ]}>
              <View
                style={[
                  styles.infoBanner,
                  { borderColor: theme.statusBgInfo, backgroundColor: theme.blueBadge },
                ]}>
                <View style={styles.infoBannerHeader}>
                  <Info size={18} color={theme.statusBgInfo} />
                  <Text style={[styles.infoBannerTitle, { color: theme.text }]}>
                    Arrivée estimée vers {estimatedArrivalTime}
                  </Text>
                </View>
                <Text style={[styles.infoBannerBody, { color: theme.textMuted }]}>
                  Avec un départ à {value} et {durationHours}h de marche, la fin de rando est prévue en soirée. Attention au coucher du soleil et aux derniers transports.
                </Text>
              </View>

              <Button
                title="J'ai compris"
                variant="secondary"
                onPress={() => {
                  (ref as any)?.current?.dismiss();
                }}
              />
            </Animated.View>
          ) : undefined
        }>
        <View style={styles.listWrapper}>
          <BottomSheetScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: scrollBottomPadding },
            ]}>
            {SELECTABLE_TIMES.map((time) => (
              <ChoiceChip
                key={time}
                label={time}
                selected={time === value}
                onPress={() => handleSelectTime(time)}
              />
            ))}
          </BottomSheetScrollView>
        </View>
      </BaseBottomSheetModal>
    );
  }
);

TimePickerSheet.displayName = 'TimePickerSheet';

export default TimePickerSheet;

const styles = StyleSheet.create({
  valuePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  valuePillText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  listWrapper: {
    flex: 1,
  },
  sheetFooter: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBannerTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  infoBannerBody: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
});
