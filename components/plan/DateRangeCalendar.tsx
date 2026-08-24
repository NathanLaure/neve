import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/** Lundi en tête, comme sur les maquettes (L M M J V S D). */
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export interface DateRangeCalendarProps {
  /** `YYYY-MM-DD` — début de la plage, ou date unique en aller simple (`null` si aucune date sélectionnée). */
  startDate: string | null;
  /** `YYYY-MM-DD` — fin de la plage. `null` en aller simple. */
  endDate: string | null;
  /** Première date sélectionnable (incluse). Par défaut : aujourd'hui. */
  minDate?: string;
  /**
   * Dernière date sélectionnable (incluse). Si omise, toutes les dates futures sont sélectionnables.
   */
  maxDate?: string;
  onSelectDate: (date: string) => void;
  /** Nombre de mois affichés à partir du mois de `minDate`. */
  monthsToShow?: number;
  /** Si true, masque la ligne d'initiales (ex: si placée en en-tête fixe externe). */
  hideWeekdayRow?: boolean;
}

export function DateRangeCalendarHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.weekdayRow}>
      {WEEKDAY_LABELS.map((label, index) => (
        <Text
          key={`${label}-${index}`}
          style={[styles.weekdayLabel, { color: theme.textDisabled }]}>
          {label}
        </Text>
      ))}
    </View>
  );
}

/** `Date` -> `YYYY-MM-DD`, en heure locale (toISOString décalerait d'un jour). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` -> `Date` à minuit local. */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Nombre de jours entre deux dates ISO (b - a). */
export function daysBetween(a: string, b: string): number {
  const diffMs = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(diffMs / 86400000);
}

/** « 20 → 22 mars » ou « 20 mars » — le résumé affiché quand la carte est repliée. */
/** « 20 mars 2027 » — la date pleine, année comprise : une aventure se planifie loin. */
export function formatFullDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** « 20/03 » — le repère porté par les traits de la frise d'aventure. */
export function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/**
 * Étendue du séjour en une ligne : « 20-22 mars 2027 ». Le mois et l'année ne se
 * répètent que s'ils changent en cours de route.
 */
export function formatAdventureRange(startDate: string, endDate: string | null): string {
  if (!endDate || endDate === startDate) return formatFullDate(startDate);

  const start = fromISODate(startDate);
  const end = fromISODate(endDate);

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = end.toLocaleDateString('fr-FR', { month: 'long' });
    return `${start.getDate()}-${end.getDate()} ${month} ${end.getFullYear()}`;
  }

  const startLabel = start.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    ...(start.getFullYear() === end.getFullYear() ? {} : { year: 'numeric' }),
  });
  return `${startLabel} - ${formatFullDate(endDate)}`;
}

export function formatDateRangeSummary(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'Choisir une date';
  const start = fromISODate(startDate);
  const startMonth = MONTH_NAMES[start.getMonth()].toLowerCase();

  if (!endDate || endDate === startDate) {
    return `${start.getDate()} ${startMonth}`;
  }

  const end = fromISODate(endDate);
  const endMonth = MONTH_NAMES[end.getMonth()].toLowerCase();

  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} → ${end.getDate()} ${endMonth}`
    : `${start.getDate()} ${startMonth} → ${end.getDate()} ${endMonth}`;
}

interface MonthGrid {
  key: string;
  label: string;
  /** Semaines de 7 cases ; `null` = case vide de début/fin de mois. */
  weeks: (string | null)[][];
}

/**
 * Construit la grille d'un mois, alignée sur une semaine commençant le lundi.
 * `getDay()` renvoie 0 pour dimanche, d'où le décalage.
 */
function buildMonthGrid(year: number, month: number): MonthGrid {
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(toISODate(new Date(year, month, day)));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return {
    key: `${year}-${month}`,
    label: `${MONTH_NAMES[month]} ${year}`,
    weeks,
  };
}

/**
 * Calendrier à sélection de plage, sur plusieurs mois.
 *
 * Les jours hors de [minDate, maxDate] sont désactivés : au-delà de l'horizon de
 * production PRIM il n'existe aucun horaire, mieux vaut l'interdire que laisser
 * l'utilisateur découvrir une liste vide après coup.
 */
export default function DateRangeCalendar({
  startDate,
  endDate,
  minDate,
  maxDate,
  onSelectDate,
  monthsToShow = 3,
  hideWeekdayRow = false,
}: DateRangeCalendarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const floor = minDate ?? toISODate(new Date());

  const months = useMemo(() => {
    const first = fromISODate(floor);
    return Array.from({ length: monthsToShow }, (_, offset) => {
      const cursor = new Date(first.getFullYear(), first.getMonth() + offset, 1);
      return buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
    });
  }, [floor, monthsToShow]);

  const todayIso = useMemo(() => toISODate(new Date()), []);

  return (
    <View style={styles.container}>
      {!hideWeekdayRow && <DateRangeCalendarHeader />}

      {months.map((month) => (
        <View key={month.key} style={styles.month}>
          <Text style={[styles.monthLabel, { color: theme.text }]}>{month.label}</Text>

          {month.weeks.map((week, weekIndex) => (
            <View key={`${month.key}-week-${weekIndex}`} style={styles.weekRow}>
              {week.map((iso, dayIndex) => {
                if (!iso) {
                  return (
                    <View
                      key={`blank-${month.key}-${weekIndex}-${dayIndex}`}
                      style={styles.cell}
                    />
                  );
                }

                const isBeforeFloor = iso < floor;
                const isAfterHorizon = !!maxDate && iso > maxDate;
                const isDisabled = isBeforeFloor || isAfterHorizon;
                const isToday = iso === todayIso;

                const isStart = startDate !== null && iso === startDate;
                const isEnd = endDate !== null && iso === endDate;
                const isBetween =
                  startDate !== null && endDate !== null && iso > startDate && iso < endDate;
                const isRangeActive =
                  startDate !== null && endDate !== null && endDate > startDate;

                const dayNumber = Number(iso.split('-')[2]);

                return (
                  <Pressable
                    key={iso}
                    disabled={isDisabled}
                    onPress={() => onSelectDate(iso)}
                    android_ripple={
                      isDisabled
                        ? undefined
                        : {
                            color: theme.ripple,
                            borderless: true,
                          }
                    }
                    style={styles.cell}>
                    {({ pressed }) => (
                      <>
                        {/* Liseré continu entre les deux bornes de la plage. */}
                        {isRangeActive && isStart && (
                          <View
                            style={[
                              styles.rangeFill,
                              { left: '50%', right: 0, backgroundColor: theme.surfaceSecondary },
                            ]}
                          />
                        )}
                        {isRangeActive && isEnd && (
                          <View
                            style={[
                              styles.rangeFill,
                              { left: 0, right: '50%', backgroundColor: theme.surfaceSecondary },
                            ]}
                          />
                        )}
                        {isBetween && (
                          <View
                            style={[
                              styles.rangeFill,
                              { left: 0, right: 0, backgroundColor: theme.surfaceSecondary },
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.dayCircle,
                            /* Style du bouton secondaire : une borne de plage
                               marque une sélection, elle n'appelle pas à agir.
                               L'orange reste au bouton de validation. */
                            (isStart || isEnd) && { backgroundColor: theme.buttonSecondary },
                            pressed && !isStart && !isEnd && { backgroundColor: theme.borderLight },
                            pressed && (isStart || isEnd) && { opacity: 0.8 },
                          ]}>
                          <Text
                            style={[
                              styles.dayLabel,
                              {
                                color: isDisabled
                                  ? theme.textDisabled
                                  : isStart || isEnd
                                    ? theme.buttonSecondaryText
                                    : theme.text,
                              },
                              isBeforeFloor && styles.dayStruck,
                            ]}>
                            {dayNumber}
                          </Text>
                          {isToday && (
                            <View
                              style={[
                                styles.todayIndicator,
                                {
                                  backgroundColor:
                                    isStart || isEnd ? theme.buttonSecondaryText : theme.text,
                                },
                              ]}
                            />
                          )}
                        </View>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const CELL_HEIGHT = 52;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  month: {
    marginTop: 12,
  },
  monthLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 2,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 4,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 16,
    height: 2,
    borderRadius: 2,
  },
  dayStruck: {
    textDecorationLine: 'line-through',
  },
});
