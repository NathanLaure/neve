import type { PlannedAdventure } from '@/context/AdventureContext';
import type { RandoData } from '@/constants/RandosData';

export type AdventureNotificationKind = 'booking' | 'departure';

export interface AdventureNotification {
  id: string;
  kind: AdventureNotificationKind;
  title: string;
  message: string;
  /** Aventure concernée, pour ouvrir la bonne fiche au tap. */
  adventureId: string;
  /** Date de départ au format ISO, qui sert aussi de clé de tri. */
  outwardDate: string;
  /** Horodatage affiché pour la notification. */
  timestamp: string;
  createdAt?: string;
  /** Indique si la notification est récente. */
  isNew?: boolean;
}

/** Nombre de jours entiers entre deux dates ISO (`YYYY-MM-DD`). */
function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** « aujourd'hui », « demain », « dans 4 jours », « le 12 septembre ». */
function formatCountdown(days: number, outwardDate: string): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days <= 7) return `dans ${days} jours`;
  return `le ${new Date(`${outwardDate}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })}`;
}

/** Formate l'horodatage relatif ou contextuel de la notification. */
export function formatNotificationTimestamp(
  createdAt?: string,
  outwardDate?: string,
  todayISO?: string
): string {
  if (createdAt) {
    const created = new Date(createdAt);
    if (!isNaN(created.getTime())) {
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffMinutes = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (3600 * 1000));
      const diffDays = Math.floor(diffMs / (86400 * 1000));

      if (diffMinutes < 1) return "À l'instant";
      if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
      if (diffHours < 24 && created.getDate() === now.getDate()) {
        return `Aujourd'hui, ${created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diffDays === 1 || (diffHours < 48 && now.getDate() - created.getDate() === 1)) {
        return `Hier, ${created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diffDays < 7) {
        return `Il y a ${diffDays} j`;
      }
      return created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  }

  if (outwardDate && todayISO) {
    const days = daysBetween(todayISO, outwardDate);
    if (days <= 0) return "Aujourd'hui";
    if (days === 1) return 'J-1';
    if (days <= 7) return `J-${days}`;
    return `Dans ${days} j`;
  }

  return "Aujourd'hui";
}

/**
 * Fil de notifications de l'application.
 *
 * Névé n'envoie rien : il n'y a ni serveur de notifications ni historique en
 * base. Ce fil est donc dérivé des aventures déjà planifiées — c'est la seule
 * matière réelle dont on dispose, et la seule qui mérite d'être remontée : un
 * départ qui approche, des billets qui ne sont toujours pas réservés.
 *
 * Les aventures passées en sont exclues : une notification qui arrive après
 * coup n'est plus une notification.
 */
export function buildAdventureNotifications(
  adventures: PlannedAdventure[],
  hikes: RandoData[],
  todayISO: string
): AdventureNotification[] {
  return adventures
    .filter((adventure) => adventure.outwardDate >= todayISO)
    .sort((a, b) => (a.outwardDate < b.outwardDate ? -1 : 1))
    .map((adventure) => {
      const hike = hikes.find((item) => item.id === adventure.randoId);
      const title = hike?.title ?? adventure.hikeSnapshot?.title ?? 'votre randonnée';
      const days = daysBetween(todayISO, adventure.outwardDate);
      const countdown = formatCountdown(days, adventure.outwardDate);
      const timestamp = formatNotificationTimestamp(
        adventure.createdAt,
        adventure.outwardDate,
        todayISO
      );
      const isNew = (() => {
        if (adventure.createdAt) {
          const created = new Date(adventure.createdAt);
          if (!isNaN(created.getTime())) {
            return Date.now() - created.getTime() < 24 * 3600 * 1000;
          }
        }
        return days <= 1;
      })();

      if (!adventure.isBooked) {
        return {
          id: `booking-${adventure.id}`,
          kind: 'booking' as const,
          title: 'Billets à réserver',
          message: `Vous partez ${countdown} pour ${title}, et vos billets ne sont pas encore réservés.`,
          adventureId: adventure.id,
          outwardDate: adventure.outwardDate,
          timestamp,
          createdAt: adventure.createdAt,
          isNew,
        };
      }

      return {
        id: `departure-${adventure.id}`,
        kind: 'departure' as const,
        title: `Départ ${countdown}`,
        message: `${title} — ${adventure.outwardTrain?.time ?? 'horaire à confirmer'} depuis ${adventure.departureStationName}.`,
        adventureId: adventure.id,
        outwardDate: adventure.outwardDate,
        timestamp,
        createdAt: adventure.createdAt,
        isNew,
      };
    });
}
