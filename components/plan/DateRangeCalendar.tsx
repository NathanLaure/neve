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
  /** `YYYY-MM-DD` — début de la plage, ou date unique en aller simple. */
  startDate: string;
  /** `YYYY-MM-DD` — fin de la plage. `null` en aller simple. */
  endDate: string | null;
  /** Première date sélectionnable (incluse). Par défaut : aujourd'hui. */
  minDate?: string;
  /**
   * Dernière date sélectionnable (incluse). Au-delà, PRIM n'a pas d'horaire :
   * les jours sont grisés plutôt que de mener à une recherche vide.
   */
  maxDate: string;
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
export function formatDateRangeSummary(startDate: string, endDate: string | null): string {
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
  /** 42 cases max ; `null` = case vide de début de mois. */
  days: (string | null)[];
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

  return {
    key: `${year}-${month}`,
    label: `${MONTH_NAMES[month]} ${year}`,
    days,
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

  return (
    <View style={styles.container}>
      {!hideWeekdayRow && <DateRangeCalendarHeader />}

      {months.map((month) => (
        <View key={month.key} style={styles.month}>
          <Text style={[styles.monthLabel, { color: theme.text }]}>{month.label}</Text>

          <View style={styles.grid}>
            {month.days.map((iso, index) => {
              if (!iso) {
                return <View key={`blank-${month.key}-${index}`} style={styles.cell} />;
              }

              const isBeforeFloor = iso < floor;
              const isAfterHorizon = iso > maxDate;
              const isDisabled = isBeforeFloor || isAfterHorizon;

              const isStart = iso === startDate;
              const isEnd = endDate !== null && iso === endDate;
              const isBetween =
                endDate !== null && iso > startDate && iso < endDate;

              const dayNumber = Number(iso.split('-')[2]);

              return (
                <Pressable
                  key={iso}
                  disabled={isDisabled}
                  onPress={() => onSelectDate(iso)}
                  style={styles.cell}>
                  {/* Liseré continu entre les deux bornes de la plage. */}
                  {isBetween && (
                    <View
                      style={[styles.rangeFill, { backgroundColor: theme.surfaceSecondary }]}
                    />
                  )}
                  <View
                    style={[
                      styles.dayCircle,
                      (isStart || isEnd) && { backgroundColor: theme.tint },
                    ]}>
                    <Text
                      style={[
                        styles.dayLabel,
                        {
                          color: isDisabled
                            ? theme.textDisabled
                            : isStart || isEnd
                              ? theme.buttonTextOnBrand
                              : theme.text,
                        },
                        // Les jours révolus sont barrés, comme sur les maquettes.
                        isBeforeFloor && styles.dayStruck,
                      ]}>
                      {dayNumber}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const CELL_HEIGHT = 44;

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
    fontSize: 14,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `StyleSheet.absoluteFillObject` n'est pas typé dans RN 0.85 (cf. les erreurs
  // existantes sur (tabs)/index.tsx et results.tsx) : on pose les bords à la main.
  rangeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 1,
    bottom: 1,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  dayStruck: {
    textDecorationLine: 'line-through',
  },
});
