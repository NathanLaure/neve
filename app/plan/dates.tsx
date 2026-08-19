import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Check, ChevronRight, Info, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/Button';
import ScreenFooter from '@/components/ScreenFooter';
import { useAdventure } from '@/context/AdventureContext';
import { usePlanDraft, TripType, computeAutoReturnDate, computeHikeDays } from '@/context/PlanDraftContext';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import AutoReturnInfoSheet from '@/components/plan/AutoReturnInfoSheet';
import TimePickerSheet from '@/components/plan/TimePickerSheet';
import { IconButton } from '@/components/IconButton';
import DateRangeCalendar, {
  DateRangeCalendarHeader,
  fromISODate,
  toISODate,
} from '@/components/plan/DateRangeCalendar';

// Durée fixe, pas de ressort : un fondu net plutôt qu'un rebond sur le bandeau
// qui apparaît ou disparaît selon la date de retour posée.
const ENTER = FadeIn.duration(180);
const EXIT = FadeOut.duration(140);
const REFLOW = LinearTransition.duration(200);
/** Un contrôle qu'on tape doit répondre vite : plus court que les fondus d'apparition. */
const SEGMENTED_DURATION = 120;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Item du contrôle segmenté « Aller/Retour » / « Aller simple ».
 *
 * Extrait pour animer sa propre transition de couleur : `useAnimatedStyle` ne
 * peut pas s'appeler à l'intérieur d'un `.map()`, le nombre d'appels de Hooks
 * doit rester fixe d'un rendu à l'autre.
 */
function SegmentedItem({
  label,
  isSelected,
  onPress,
  theme,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  theme: (typeof Colors)['light'];
}) {
  const progress = useDerivedValue(() =>
    withTiming(isSelected ? 1 : 0, { duration: SEGMENTED_DURATION })
  );

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.card, theme.tint]),
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [theme.text, theme.buttonTextOnBrand]),
  }));
  // La coche reste montée en permanence, seule son opacité varie : la monter/
  // démonter ajoutait un enfant au `row` et poussait le texte au moment même où
  // le fondu commençait, avant que l'œil n'ait rien à suivre.
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <AnimatedPressable onPress={onPress} style={[styles.segmentedItem, containerStyle]}>
      <Animated.View style={[styles.segmentedCheckSlot, checkStyle]}>
        <Check size={16} color={theme.buttonTextOnBrand} />
      </Animated.View>
      <Animated.Text style={[styles.segmentedText, textStyle]}>{label}</Animated.Text>
      {/* Espaceur invisible, de la même largeur que le logement de la coche : sans
          lui le texte se centre avec elle dans un même bloc et se retrouve décalé
          d'une demi-icône. Symétrique, il ramène le texte au vrai centre du
          segment, coche visible ou non. */}
      <View style={styles.segmentedCheckSlot} />
    </AnimatedPressable>
  );
}

/**
 * Choix des dates, présenté en modale plein écran.
 *
 * Le calendrier vivait auparavant déplié dans le corps de l'écran de
 * planification : trois mois de grille rendus d'un bloc, sans défileur propre,
 * qui noyaient la carte d'itinéraire et rendaient la page interminable.
 *
 * La grille est ici la SEULE zone défilante. Tout le reste — segmenté, ligne de
 * jours, bandeau, heure de départ, validation — est fixe : les mois vont
 * désormais jusqu'à l'horizon PRIM, donc tout ce qui serait placé sous la grille
 * deviendrait inatteignable.
 */
export default function PlanDatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /*
   * `next: 'return'` : le calendrier est ouvert pour dater un retour qu'on
   * ajoute à un voyage déjà planifié. Tous les autres paramètres reçus sont
   * repassés tels quels à l'écran suivant — ce sont ceux dont il a besoin pour
   * viser le bon lieu, que cette modale ne fait que traverser.
   */
  const params = useLocalSearchParams<{
    randoId?: string;
    next?: string;
    /** Heure de départ du retour suggérée par l'appelant — voir `suggestReturnTime`. */
    returnTime?: string;
  }>();
  const isAddingReturn = params.next === 'return';

  const { hikes } = useAdventure();
  const { draft, commitDates, addReturnTrip, horizon } = usePlanDraft();

  const autoReturnSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const timeSheetRef = useRef<BaseBottomSheetModalRef>(null);

  const rando = useMemo(
    () => hikes.find((r) => r.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  // Nombre de jours de marche, d'où découle la date de retour pré-remplie.
  const hikeDays = computeHikeDays(rando?.durationHours);

  /*
   * Le brouillon partagé n'est touché qu'à la validation. Refermer la modale sans
   * valider — croix, geste, retour Android — doit laisser les choix précédents
   * exactement où ils étaient.
   */
  const [startDate, setStartDate] = useState<string | null>(draft.startDate);
  /* En mode « ajouter un retour », on repart de zéro côté retour : la date que
     porte le brouillon est celle de l'aller, recopiée à l'enregistrement d'un
     aller simple. La reprendre proposerait un retour le jour du départ. */
  const [endDate, setEndDate] = useState<string | null>(isAddingReturn ? null : draft.endDate);
  // Ajouter un retour, c'est déjà avoir répondu à la question du type de trajet.
  const [tripType, setTripType] = useState<TripType>(
    isAddingReturn ? 'round' : draft.tripType
  );
  const [hasCustomReturn, setHasCustomReturn] = useState(
    isAddingReturn ? false : draft.hasCustomReturn
  );
  /* Une seule heure dans cet écran, dont le libellé change : « Aller à partir
     de », ou « Retour à partir de » quand on vient en ajouter un. Dans ce second
     cas elle part de l'heure suggérée par l'appelant — la fin de la marche — et
     non de l'heure d'aller du brouillon, qui n'a rien à voir. */
  const [outwardTime, setOutwardTime] = useState(
    isAddingReturn ? params.returnTime || draft.outwardTime : draft.outwardTime
  );
  /* Un départ vient d'être posé, la prochaine tape désigne donc le retour.
     En mode « ajouter un retour », le départ est déjà fixé de longue date : la
     toute première tape vise le retour, sans quoi elle déplacerait le départ et
     enverrait replanifier l'aller pour rien. */
  const [isPickingReturn, setIsPickingReturn] = useState(isAddingReturn);

  const today = useMemo(() => toISODate(new Date()), []);

  const autoReturnDate = useMemo(
    () => computeAutoReturnDate(startDate, rando?.durationHours),
    [startDate, rando?.durationHours]
  );
  const effectiveEndDate = tripType === 'oneway' ? null : (endDate ?? autoReturnDate);

  // Toute la période couverte par PRIM, puisque la modale a la place de défiler.
  // Dans la page, le calendrier était borné à trois mois faute de hauteur.
  const monthsToShow = useMemo(() => {
    const from = fromISODate(today);
    const to = fromISODate(horizon);
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    return Math.max(12, months + 1);
  }, [today, horizon]);

  const handleSelectDate = (date: string) => {
    // Seconde tape, postérieure au départ qu'on vient de poser : c'est le retour.
    if (startDate && tripType === 'round' && isPickingReturn && date > startDate) {
      setEndDate(date);
      setHasCustomReturn(true);
      /* En mode « ajouter un retour », on reste sur le retour : corriger sa date
         d'une seconde tape ne doit pas se mettre à déplacer le départ. */
      setIsPickingReturn(isAddingReturn);
      return;
    }
    setStartDate(date);
    setEndDate(null);
    setHasCustomReturn(false);
    setIsPickingReturn(true);
  };

  const handleValidate = () => {
    if (!startDate) return;

    if (isAddingReturn) {
      /* Le jour du départ a bougé : l'aller retenu portait les horaires de
         l'ancienne date, il ne veut plus rien dire. `commitDates` l'efface — ce
         qui est ici la bonne réponse — et le parcours reprend au choix de
         l'aller, qui enchaînera de lui-même sur le retour puisqu'on est passé en
         aller-retour. */
      const departureMoved = startDate !== draft.startDate;

      if (departureMoved) {
        commitDates({ startDate, endDate, tripType, hasCustomReturn, outwardTime });
        router.replace({
          pathname: '/plan/outward',
          params: {
            ...params,
            next: undefined,
            outwardDate: startDate,
            outwardTime,
            returnDate: effectiveEndDate ?? undefined,
          },
        });
        return;
      }

      /* Départ inchangé : `addReturnTrip` et non `commitDates`, celui-ci
         effacerait l'aller alors qu'on ne vient dater que le retour. `replace`
         retire le calendrier de la pile — revenir en arrière depuis les
         résultats doit ramener au récapitulatif. */
      addReturnTrip(effectiveEndDate);
      router.replace({
        pathname: '/plan/return',
        params: {
          ...params,
          next: undefined,
          outwardDate: startDate,
          returnDate: effectiveEndDate ?? undefined,
          /* L'heure réglée ici est celle du retour : sans elle, l'écran de
             résultats repartait de la valeur d'origine et le réglage était perdu. */
          returnTime: outwardTime,
        },
      });
      return;
    }

    commitDates({ startDate, endDate, tripType, hasCustomReturn, outwardTime });
    router.back();
  };

  const handleDepartNow = () => {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    commitDates({
      startDate: today,
      endDate: null,
      tripType,
      hasCustomReturn: false,
      outwardTime: currentHHMM,
    });
    router.back();
  };

  const showAutoReturnBanner =
    startDate !== null && tripType === 'round' && !hasCustomReturn && hikeDays > 1;

  return (
    /*
     * Fournisseur local : les feuilles gorhom sortent dans un portail rattaché au
     * fournisseur le plus proche. Sans celui-ci, elles viseraient celui de la
     * racine, qui se trouve sous cette modale native — la feuille s'ouvrirait
     * derrière l'écran, donc invisible.
     */
    <BottomSheetModalProvider>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isAddingReturn ? 'Quand rentres-tu ?' : 'Quand partir à l’aventure ?'}
          </Text>
            <IconButton
              variant="circle"
              icon={<X size={20} color={theme.buttonIconColor} />}
              style={{ backgroundColor: theme.buttonBgIcon }}
              onPress={() => router.back()}
            />
        </View>

        <View style={styles.fixedTop}>
          {/* Le choix aller simple / aller-retour n'a plus lieu d'être quand on
              vient précisément ajouter un retour. */}
          {!isAddingReturn && (
            <View style={[styles.segmented]}>
              {(
                [
                  { value: 'round', label: 'Aller / Retour' },
                  { value: 'oneway', label: 'Aller simple' },
                ] as { value: TripType; label: string }[]
              ).map((item) => (
                <SegmentedItem
                  key={item.value}
                  label={item.label}
                  isSelected={tripType === item.value}
                  theme={theme}
                  onPress={() => {
                    setTripType(item.value);
                    setEndDate(null);
                    setHasCustomReturn(false);
                    setIsPickingReturn(false);
                  }}
                />
              ))}
            </View>
          )}

          {/* Épinglée : dans l'ancienne version elle défilait avec la grille et on
              perdait de vue à quel jour correspond chaque colonne. */}
          <DateRangeCalendarHeader />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}>
          <DateRangeCalendar
            hideWeekdayRow
            startDate={startDate}
            endDate={effectiveEndDate}
            minDate={today}
            maxDate={horizon}
            monthsToShow={monthsToShow}
            onSelectDate={handleSelectDate}
          />
        </ScrollView>

        <ScreenFooter variant="inline" surface="card">

          {/* Uniquement sur les randos qui débordent d'une journée : sur une
              sortie à la journée, un retour le soir même est évident et le
              bandeau n'apprendrait rien. */}
          {showAutoReturnBanner && (
            <Animated.View layout={REFLOW} entering={ENTER} exiting={EXIT}>
              <Pressable onPress={() => autoReturnSheetRef.current?.present()}>
                <View
                  style={[
                    styles.autoReturnBanner,
                    { borderColor: theme.statusBgInfo, backgroundColor: theme.blueBadge },
                  ]}>
                  <View style={styles.autoReturnHeader}>
                    <Info size={18} color={theme.statusBgInfo} />
                    <Text style={[styles.autoReturnTitle, { color: theme.text }]}>
                      Retour calculé automatiquement !
                    </Text>
                  </View>
                  <Text style={[styles.autoReturnBody, { color: theme.textMuted }]}>
                    Nous avons calé le retour sur les {hikeDays} jours de marche de la rando. Tu peux le
                    modifier si tu le souhaites.
                  </Text>
                  <Text style={[styles.autoReturnLink, { color: theme.text }]}>
                    Comment ça marche ?
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          )}

          <Animated.View layout={REFLOW}>
          <Pressable
            onPress={() => timeSheetRef.current?.present()}
            android_ripple={{
              color: theme.ripple,
              borderless: false,
              foreground: true,
            }}
            style={[
              styles.timeRow,
              {
                borderRadius: 8,
                overflow: 'hidden' as const,
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}>
            <View style={styles.timeRowLabel}>
              <Text style={[styles.timeRowText, { color: theme.text }]}>{isAddingReturn ? 'Retour à partir de' : 'Aller à partir de'}</Text>
              <View style={[styles.timePill, { backgroundColor: theme.tint }]}>
                <Text style={[styles.timePillText, { color: theme.buttonTextOnBrand }]}>
                  {outwardTime}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.text} />
          </Pressable>
          </Animated.View>

          <View style={styles.footerRow}>
            <Button
              title="Maintenant"
              variant="transparent"
              style={styles.nowBtn}
              onPress={handleDepartNow}
            />
            <Button
              title="Valider"
              variant="primary"
              disabled={!startDate}
              style={styles.validateBtn}
              onPress={handleValidate}
            />
          </View>
        </ScreenFooter>
      </View>

      <AutoReturnInfoSheet ref={autoReturnSheetRef} />

      <TimePickerSheet
        ref={timeSheetRef}
        label="Aller à partir de"
        value={outwardTime}
        durationHours={rando?.durationHours}
        onSelect={(time) => {
          setOutwardTime(time);
        }}
      />
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedTop: {
    paddingHorizontal: 20,
    gap: 16,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentedItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  segmentedText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  /* Toujours montée, opacité seule animée : occuper cette place en permanence
     évite que le texte se décale au moment où la coche apparaît. */
  segmentedCheckSlot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  autoReturnBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  autoReturnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoReturnTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  autoReturnBody: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  autoReturnLink: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  timeRowLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeRowText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  timePill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timePillText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  nowBtn: {
    flex: 0,
  },
  validateBtn: {
    flex: 1,
  },
});
