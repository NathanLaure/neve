import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BellOff,
  Check,
  Eye,
  Ticket,
  TrainFront,
  Trash2,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import SettingsPage from '@/components/profile/SettingsPage';
import { toISODate } from '@/components/plan/DateRangeCalendar';
import { AdventureNotification, buildAdventureNotifications } from '@/utils/notifications';
import { showToast } from '@/utils/toast';
import Collapsible from '@/components/Collapsible';
import AnimatedChevron from '@/components/AnimatedChevron';

interface NotificationItemRowProps {
  notification: AdventureNotification;
  index: number;
  isExpanded: boolean;
  isRead: boolean;
  onToggleExpand: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
  onView: () => void;
}

function NotificationItemRow({
  notification,
  index,
  isExpanded,
  isRead,
  onToggleExpand,
  onToggleRead,
  onDelete,
  onView,
}: NotificationItemRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const translateX = useSharedValue(0);
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    expandProgress.value = withTiming(isExpanded ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [isExpanded, expandProgress]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          // Swipe vers la droite -> Supprimer
          if (e.translationX > 110 || e.velocityX > 600) {
            translateX.value = withTiming(500, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(onDelete)();
              }
            });
          }
          // Swipe vers la gauche -> Lu / Non lu
          else if (e.translationX < -90 || e.velocityX < -500) {
            runOnJS(onToggleRead)();
            translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
          }
          // Seuil non atteint -> Retour
          else {
            translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
          }
        }),
    [translateX, onDelete, onToggleRead]
  );

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: interpolateColor(
      expandProgress.value,
      [0, 1],
      [theme.background, theme.card]
    ),
  }));

  const iconBgAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      expandProgress.value,
      [0, 1],
      [theme.card, theme.background]
    ),
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => {
    const isSwipingRight = translateX.value > 0;
    return {
      opacity: interpolate(
        Math.abs(translateX.value),
        [0, 20, 80],
        [0, 0.5, 1],
        Extrapolation.CLAMP
      ),
      backgroundColor: isSwipingRight ? theme.statusBgError : theme.statusBgSuccess,
    };
  });

  const leftIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(translateX.value, [0, 40, 100], [0.6, 0.9, 1.15], Extrapolation.CLAMP),
      },
    ],
    opacity: translateX.value > 10 ? 1 : 0,
  }));

  const rightIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(translateX.value, [-100, -40, 0], [1.15, 0.9, 0.6], Extrapolation.CLAMP),
      },
    ],
    opacity: translateX.value < -10 ? 1 : 0,
  }));

  const Icon = notification.kind === 'booking' ? Ticket : TrainFront;

  const itemStyle = [
    styles.card,
    {
      borderRadius: 12,
      overflow: 'hidden' as const,
      backgroundColor: 'transparent',
    },
  ];

  const actionBtnStyle = [
    styles.actionBtn,
    {
      borderRadius: 8,
      overflow: 'hidden' as const,
    },
  ];

  return (
    <React.Fragment>
      {index > 0 && !isExpanded && (
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      )}
      <View style={styles.itemWrapper}>
        {/* Fond sous-jacent dynamique (rouge à droite pour supprimer, bleu/vert à gauche pour marquer lu) */}
        <Animated.View style={[styles.swipeActionBg, bgAnimatedStyle]}>
          <Animated.View style={[styles.swipeActionIconLeft, leftIconStyle]}>
            <Trash2 size={22} color="#FFFFFF" />
          </Animated.View>
          <Animated.View style={[styles.swipeActionIconRight, rightIconStyle]}>
            <Check size={22} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={rowAnimatedStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${notification.title}. ${notification.message}. ${notification.timestamp}`}
              onPress={onToggleExpand}
              android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
              style={itemStyle}>
              <Animated.View style={[styles.cardIcon, iconBgAnimatedStyle]}>
                <Icon size={18} color={theme.text} />
              </Animated.View>
              <View style={styles.cardText}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    {!isRead ? (
                      <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                    ) : null}
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: theme.text, opacity: isRead ? 0.75 : 1 },
                      ]}
                      numberOfLines={1}>
                      {notification.title}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={[styles.cardTimestamp, { color: theme.textMuted }]}>
                      {notification.timestamp}
                    </Text>
                    <AnimatedChevron expanded={isExpanded} color={theme.textMuted} size={16} />
                  </View>
                </View>

                <Text
                  style={[
                    styles.cardMessage,
                    { color: theme.textMuted, opacity: isRead ? 0.75 : 1 },
                  ]}
                  numberOfLines={isExpanded ? undefined : 2}>
                  {notification.message}
                </Text>

                <Collapsible expanded={isExpanded}>
                  <View style={styles.collapsibleInner}>
                    <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Voir l'aventure"
                        onPress={onView}
                        android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
                        style={actionBtnStyle}>
                        <Eye size={20} color={theme.text} />
                        <Text style={[styles.actionBtnText, { color: theme.text }]}>Voir</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
                        onPress={onToggleRead}
                        android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
                        style={actionBtnStyle}>
                        <Check size={20} color={isRead ? theme.textMuted : theme.primary} />
                        <Text
                          style={[
                            styles.actionBtnText,
                            { color: isRead ? theme.textMuted : theme.text },
                          ]}>
                          {isRead ? 'Non lu' : 'Lu'}
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer la notification"
                        onPress={onDelete}
                        android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
                        style={actionBtnStyle}>
                        <Trash2 size={20} color={theme.statusBgError} />
                        <Text style={[styles.actionBtnText, { color: theme.statusBgError }]}>
                          Supprimer
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Collapsible>
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </React.Fragment>
  );
}

/**
 * Fil des dernières notifications.
 *
 * Névé n'en envoie aucune pour l'instant : ce que la page liste est dérivé des
 * aventures planifiées (voir `buildAdventureNotifications`). C'est de la vraie
 * matière — un départ qui approche, des billets non réservés — et non un
 * historique inventé en attendant qu'un serveur de notifications existe.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { plannedAdventures, hikes } = useAdventure();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const rawNotifications = useMemo(
    () => buildAdventureNotifications(plannedAdventures, hikes, toISODate(new Date())),
    [plannedAdventures, hikes]
  );

  const notifications = useMemo(
    () => rawNotifications.filter((n) => !dismissedIds.has(n.id)),
    [rawNotifications, dismissedIds]
  );

  const { newNotifications, olderNotifications } = useMemo(() => {
    const fresh: AdventureNotification[] = [];
    const past: AdventureNotification[] = [];

    for (const notif of notifications) {
      const isRead = readIds.has(notif.id);
      if (!isRead && notif.isNew) {
        fresh.push(notif);
      } else {
        past.push(notif);
      }
    }

    // Si toutes les notifications sont tombées du même côté mais qu'il y en a plusieurs,
    // on scinde la plus récente en « Nouvelles » et le reste en « Anciennes »
    if (fresh.length === 0 && past.length > 1 && readIds.size === 0) {
      return { newNotifications: [past[0]], olderNotifications: past.slice(1) };
    }

    return { newNotifications: fresh, olderNotifications: past };
  }, [notifications, readIds]);

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleToggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      const willBeRead = !next.has(id);
      if (willBeRead) {
        next.add(id);
        showToast.info('Marquée comme lue');
      } else {
        next.delete(id);
        showToast.info('Marquée comme non lue');
      }
      return next;
    });
  };

  const handleDelete = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    if (expandedId === id) setExpandedId(null);
    showToast.info('Notification supprimée');
  };

  const handleView = (notification: AdventureNotification) => {
    setReadIds((prev) => new Set(prev).add(notification.id));
    router.push('/(tabs)/adventures');
  };

  if (notifications.length === 0) {
    return (
      <SettingsPage title="Notifications" fill contentContainerStyle={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.blueBadge }]}>
          <BellOff size={32} color={theme.text} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Rien de neuf</Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Les rappels de départ et de réservation de vos prochaines aventures s{'’'}afficheront
          ici.
        </Text>
      </SettingsPage>
    );
  }

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
    </View>
  );

  return (
    <SettingsPage title="Notifications" contentContainerStyle={styles.list}>
      {newNotifications.length > 0 && (
        <View style={styles.sectionBlock}>
          {renderSectionHeader('Nouvelles')}
          {newNotifications.map((notif, index) => (
            <NotificationItemRow
              key={notif.id}
              notification={notif}
              index={index}
              isExpanded={expandedId === notif.id}
              isRead={readIds.has(notif.id)}
              onToggleExpand={() => handleToggleExpand(notif.id)}
              onToggleRead={() => handleToggleRead(notif.id)}
              onDelete={() => handleDelete(notif.id)}
              onView={() => handleView(notif)}
            />
          ))}
        </View>
      )}

      {olderNotifications.length > 0 && (
        <View style={styles.sectionBlock}>
          {renderSectionHeader('Anciennes')}
          {olderNotifications.map((notif, index) => (
            <NotificationItemRow
              key={notif.id}
              notification={notif}
              index={index}
              isExpanded={expandedId === notif.id}
              isRead={readIds.has(notif.id)}
              onToggleExpand={() => handleToggleExpand(notif.id)}
              onToggleRead={() => handleToggleRead(notif.id)}
              onDelete={() => handleDelete(notif.id)}
              onView={() => handleView(notif)}
            />
          ))}
        </View>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  sectionBlock: {
    gap: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
  },
  divider: {
    height: 1,
    opacity: 0.6,
  },
  itemWrapper: {
    position: 'relative',
    marginVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeActionBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  swipeActionIconLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionIconRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  cardTimestamp: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  cardMessage: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  collapsibleInner: {
    paddingTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  emptyText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
