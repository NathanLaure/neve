// Proxy vers le calculateur d'itinéraires PRIM (Île-de-France Mobilités / Navitia).
//
// Pourquoi passer par une Edge Function plutôt qu'appeler PRIM depuis l'app :
//   1. La clé API ne peut pas vivre dans le bundle mobile. Le dépôt est public et
//      un bundle React Native se décompile — une clé extraite, c'est le quota
//      quotidien brûlé par un tiers.
//   2. Le palier gratuit plafonne à 1 000 requêtes/jour tous utilisateurs
//      confondus. Le cache partagé (table `transit_cache`) n'est possible que
//      côté serveur.
//
// La fonction renvoie toujours du 200 sur le chemin nominal, y compris quand PRIM
// est indisponible ou pas encore configuré : le client reçoit alors
// `{ options: [], reason: 'unavailable' }` et sait qu'il doit basculer sur son
// estimation locale, au lieu de traiter ça comme une panne réseau.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PRIM_JOURNEYS_URL =
  'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys';

// Décrit la couverture : c'est `end_production_date` qui dit jusqu'où les
// horaires existent, et donc jusqu'où le calendrier doit laisser choisir.
const PRIM_COVERAGE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/coverage';

// Fenêtre de recherche : Navitia cherche les trajets sur cette durée à partir de
// (ou jusqu'à) l'heure demandée. Sans elle, `count=5` renvoyait cinq variantes du
// MÊME départ — cinq propositions tenant dans dix minutes, ce qui ne laissait
// aucun choix d'horaire à l'utilisateur.
const TIMEFRAME_SECONDS = 3 * 3600;

// Bornes du nombre de trajets renvoyés. `count` est volontairement absent de la
// requête : il fige le nombre de résultats et neutralise min/max_nb_journeys.
const MIN_JOURNEYS = 5;
const MAX_JOURNEYS = 8;

// Durée de validité d'une entrée de cache. Les horaires théoriques d'une journée
// ne bougent pas ; 6 h laisse quand même passer les mises à jour de desserte.
const CACHE_TTL_HOURS = 6;

// Les entrées plus vieilles que ça ne resserviront jamais (on ne planifie pas
// dans le passé) : purge opportuniste à chaque écriture, pas de cron à maintenir.
const CACHE_PURGE_HOURS = 24;

// Boîte englobante large autour de l'Île-de-France. Sert uniquement de garde-fou
// contre des coordonnées aberrantes qui gaspilleraient du quota — pas à définir
// finement la zone de couverture, dont PRIM reste seul juge.
const IDF_BOUNDS = { minLat: 47.0, maxLat: 50.0, minLng: 0.5, maxLng: 5.0 };

// Tarification Île-de-France 2026 (ticket à l'unité).
const FARE_RAIL_EUR = 2.55; // Métro / Train / RER / funiculaire
const FARE_BUS_EUR = 2.05; // Bus / Tram

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Coords {
  lat: number;
  lng: number;
}

interface IntermediateStop {
  name: string;
  time?: string;
}

interface Disruption {
  id: string;
  severity: 'blocking' | 'warning' | 'info';
  title: string;
  message: string;
  period?: string;
  lineName?: string;
  mode?: TransitLeg['mode'];
}

interface TransitLeg {
  mode: 'train' | 'rer' | 'metro' | 'tram' | 'bus' | 'walk';
  lineName?: string;
  lineColor?: string;
  fromName: string;
  toName: string;
  durationMinutes: number;
  /**
   * Nature d'un tronçon à pied : rejoindre le réseau depuis le point de départ
   * (`access`), changer de quai (`transfer`), rejoindre la destination (`egress`).
   */
  walkType?: 'access' | 'transfer' | 'egress';
  direction?: string;
  intermediateStopsCount?: number;
  intermediateStops?: IntermediateStop[];
}

interface TransitOption {
  id: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  durationFormatted: string;
  transfers: number;
  lineName: string;
  lineType: string;
  priceEstimate: number;
  co2Grams?: number;
  hasPerturbations?: boolean;
  perturbationsCount?: number;
  disruptionLabel?: string;
  disruptionSeverity?: Disruption['severity'];
  disruptions?: Disruption[];
  legs: TransitLeg[];
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** `20260807T081500` -> `08:15` */
function navitiaTimeToHHMM(value: string): string {
  const timePart = value.split('T')[1] ?? '';
  return `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
}

/**
 * Empreinte d'une requête. Les coordonnées sont arrondies à 3 décimales (~110 m,
 * bien en deçà de la taille d'une gare) et l'heure ramenée au créneau de 30 min :
 * deux utilisateurs partant du même quartier à quelques minutes d'écart tapent
 * ainsi la même entrée de cache.
 */
function buildCacheKey(
  from: Coords,
  to: Coords,
  date: string,
  time: string,
  direction: string
): string {
  const r = (n: number) => n.toFixed(3);
  const [hourStr, minuteStr] = time.split(':');
  const bucketMinute = Number(minuteStr) < 30 ? '00' : '30';
  return [
    direction,
    date,
    `${hourStr}:${bucketMinute}`,
    `${r(from.lat)},${r(from.lng)}`,
    `${r(to.lat)},${r(to.lng)}`,
  ].join('|');
}

function isValidCoords(c: unknown): c is Coords {
  if (typeof c !== 'object' || c === null) return false;
  const { lat, lng } = c as Coords;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= IDF_BOUNDS.minLat &&
    lat <= IDF_BOUNDS.maxLat &&
    lng >= IDF_BOUNDS.minLng &&
    lng <= IDF_BOUNDS.maxLng
  );
}

/**
 * Refuse le passé et l'au-delà de l'horizon de production PRIM.
 *
 * `horizon` vient de `end_production_date` sur la couverture Navitia : la borne
 * de validité du jeu de données, au-delà de laquelle il n'existe simplement aucun
 * horaire. Elle bouge à chaque publication de service, d'où la lecture dynamique
 * plutôt qu'une constante en dur.
 */
function isValidDate(date: string, horizon: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = new Date();
  const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  if (date < todayIso) return false;
  // Repli prudent quand la couverture n'a pas pu être lue : un an, le maximum
  // qu'une période de production Navitia puisse couvrir.
  const ceiling = horizon ?? `${today.getUTCFullYear() + 1}-12-31`;
  return date <= ceiling;
}

/**
 * Dernière date pour laquelle PRIM a des horaires, mise en cache un jour dans
 * `transit_cache` (elle ne change qu'aux publications de service). Un appel par
 * jour tous utilisateurs confondus : négligeable sur le quota de 1 000.
 */
async function getProductionHorizon(
  supabase: any,
  apiKey: string
): Promise<string | null> {
  const cacheKey = 'coverage-horizon';
  const freshSince = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data: cached } = await supabase
    .from('transit_cache')
    .select('payload')
    .eq('cache_key', cacheKey)
    .gte('created_at', freshSince)
    .maybeSingle();

  if (cached?.payload?.endProductionDate) {
    return cached.payload.endProductionDate as string;
  }

  try {
    const response = await fetch(PRIM_COVERAGE_URL, { headers: { apiKey } });
    if (!response.ok) return null;

    const body = await response.json();
    // Navitia renvoie `YYYYMMDD` sur les dates de production.
    const raw: string | undefined = body?.regions?.[0]?.end_production_date;
    if (!raw || !/^\d{8}$/.test(raw)) return null;

    const endProductionDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    await supabase
      .from('transit_cache')
      .upsert({
        cache_key: cacheKey,
        payload: { endProductionDate },
        created_at: new Date().toISOString(),
      });

    return endProductionDate;
  } catch (error) {
    console.warn('Could not read the PRIM production horizon:', error);
    return null;
  }
}

// --------------------------------------------------------------------------
// Normalisation Navitia -> TransitOption
// --------------------------------------------------------------------------

/** Traduit le mode commercial Navitia (libellés FR) vers notre nomenclature interne. */
function toLegMode(commercialMode: string): TransitLeg['mode'] {
  const m = commercialMode.toLowerCase();
  if (m.includes('rer')) return 'rer';
  if (m.includes('métro') || m.includes('metro')) return 'metro';
  if (m.includes('tram')) return 'tram';
  if (m.includes('bus') || m.includes('noctilien')) return 'bus';
  return 'train'; // Transilien, TER, Intercités, funiculaire…
}

/**
 * Tarif à l'unité. Navitia ne renseigne pas `fare` de façon fiable sur le
 * périmètre IDF, on applique donc directement la grille 2026 : le ticket
 * Métro-Train-RER et le ticket Bus-Tram sont deux titres distincts, un trajet
 * combinant les deux en consomme un de chaque.
 */
function estimateFare(legs: TransitLeg[]): number {
  const usesRail = legs.some((l) => l.mode === 'train' || l.mode === 'rer' || l.mode === 'metro');
  const usesRoad = legs.some((l) => l.mode === 'bus' || l.mode === 'tram');
  let total = 0;
  if (usesRail) total += FARE_RAIL_EUR;
  if (usesRoad) total += FARE_BUS_EUR;
  return Number(total.toFixed(2));
}

// --------------------------------------------------------------------------
// Perturbations
// --------------------------------------------------------------------------

// `severity.effect` suit la nomenclature GTFS-RT. Seul NO_SERVICE veut dire
// « le trajet ne peut pas se faire » ; les autres dégradent sans bloquer, et tout
// le reste (ADDITIONAL_SERVICE, OTHER_EFFECT, travaux annoncés…) est informatif.
const BLOCKING_EFFECTS = new Set(['NO_SERVICE']);
const WARNING_EFFECTS = new Set([
  'REDUCED_SERVICE',
  'SIGNIFICANT_DELAYS',
  'DETOUR',
  'MODIFIED_SERVICE',
  'STOP_MOVED',
]);

const SEVERITY_RANK: Record<Disruption['severity'], number> = {
  blocking: 0,
  warning: 1,
  info: 2,
};

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function toDisruptionSeverity(raw: any): Disruption['severity'] {
  const effect = String(raw?.severity?.effect ?? raw?.status ?? '').toUpperCase();
  if (BLOCKING_EFFECTS.has(effect)) return 'blocking';
  if (WARNING_EFFECTS.has(effect)) return 'warning';
  return 'info';
}

// Entités nommées rencontrées dans les messages IDFM. Le français en produit
// beaucoup (`&eacute;`, `&agrave;`…) et un message non décodé se lit très mal.
const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  agrave: 'à', acirc: 'â', ccedil: 'ç', eacute: 'é', egrave: 'è', ecirc: 'ê',
  euml: 'ë', icirc: 'î', iuml: 'ï', ocirc: 'ô', oelig: 'œ', ugrave: 'ù',
  ucirc: 'û', uuml: 'ü', Agrave: 'À', Eacute: 'É', Egrave: 'È', Ccedil: 'Ç',
  laquo: '«', raquo: '»', rsquo: '’', hellip: '…', deg: '°', euro: '€',
  times: '×', ndash: '–', mdash: '—',
};

/** Décode entités nommées et numériques (`&#233;`, `&#xE9;`) en une seule passe. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] !== '#') return HTML_ENTITIES[entity] ?? match;
    const hex = entity[1] === 'x' || entity[1] === 'X';
    const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
  });
}

/**
 * Les messages IDFM arrivent en HTML (`<p>`, `<br>`, liens). L'app les rend dans
 * un `<Text>` : on aplatit en texte brut plutôt que d'embarquer un moteur de rendu
 * HTML dans une bottom sheet.
 */
function htmlToText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const stripped = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(stripped)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** `20260807T081500` -> `7 août 2026`, ou `7 août` sans l'année. */
function navitiaDateToLabel(value: unknown, withYear = true): string {
  if (typeof value !== 'string') return '';
  const day = Number(value.slice(6, 8));
  const month = Number(value.slice(4, 6)) - 1;
  const year = Number(value.slice(0, 4));
  if (!Number.isFinite(day) || !MONTHS_FR[month] || !Number.isFinite(year)) return '';
  const dayLabel = `${day === 1 ? '1er' : day} ${MONTHS_FR[month]}`;
  return withYear ? `${dayLabel} ${year}` : dayLabel;
}

/**
 * Période de validité lisible. Navitia peut en renvoyer plusieurs (une par jour
 * d'application, typiquement) : on borne de la première à la dernière plutôt que
 * d'égrener la liste.
 */
function formatApplicationPeriod(periods: unknown): string | undefined {
  if (!Array.isArray(periods) || periods.length === 0) return undefined;

  const begin = periods[0]?.begin;
  const end = periods[periods.length - 1]?.end;
  const beginLabel = navitiaDateToLabel(begin);
  if (!beginLabel) return undefined;

  const beginDay = String(begin).split('T')[0];
  const endDay = typeof end === 'string' ? end.split('T')[0] : '';

  if (!endDay) return `À partir du ${beginLabel}`;

  if (endDay === beginDay) {
    const from = navitiaTimeToHHMM(String(begin));
    const to = navitiaTimeToHHMM(String(end));
    const allDay = from === '00:00' && (to === '23:59' || to === '00:00');
    return allDay ? `Le ${beginLabel}, toute la journée` : `Le ${beginLabel}, de ${from} à ${to}`;
  }

  const endLabel = navitiaDateToLabel(end);
  if (!endLabel) return `À partir du ${beginLabel}`;

  // L'année ne se répète pas quand les deux bornes tombent dessus.
  const sameYear = beginDay.slice(0, 4) === endDay.slice(0, 4);
  return `Du ${navitiaDateToLabel(begin, !sameYear)} au ${endLabel}`;
}

/**
 * Pannes d'équipement de station (ascenseurs, escaliers mécaniques). IDFM en
 * publie en continu et elles noient l'info trafic utile au randonneur, qui n'a
 * pas de correspondance à revoir pour autant.
 *
 * NOTE ACCESSIBILITÉ : c'est précisément l'information dont un voyageur à
 * mobilité réduite a besoin. Si l'app expose un jour un filtre d'accessibilité,
 * c'est ce test qu'il faudra conditionner plutôt que supprimer.
 */
const EQUIPMENT_PATTERN =
  /\b(ascenseur|escalier m[ée]canique|escalator|trottoir roulant|[ée]l[ée]vateur)/i;

function isEquipmentOnly(disruption: Disruption): boolean {
  // Une interruption de trafic reste affichée même si son texte cite un
  // ascenseur : seul le bruit d'équipement est écarté.
  if (disruption.severity === 'blocking') return false;
  return EQUIPMENT_PATTERN.test(`${disruption.title} ${disruption.message}`);
}

/**
 * Un message peut porter le titre plutôt que le corps : IDFM le signale par le
 * canal (`titre`) et non par sa position dans le tableau.
 */
function isTitleChannel(message: any): boolean {
  const name = String(message?.channel?.name ?? '').toLowerCase();
  const types: unknown[] = Array.isArray(message?.channel?.types) ? message.channel.types : [];
  return name.includes('titre') || name.includes('title') || types.includes('title');
}

/**
 * Perturbations de la réponse, indexées par identifiant. Navitia les publie une
 * seule fois à la racine ; les sections ne portent que des liens vers elles.
 */
function indexDisruptions(payload: any): Map<string, any> {
  const byId = new Map<string, any>();
  const raws: any[] = Array.isArray(payload?.disruptions) ? payload.disruptions : [];
  for (const raw of raws) {
    if (typeof raw?.id === 'string') byId.set(raw.id, raw);
    // `disruption_id` regroupe les impacts d'une même perturbation : les liens de
    // section pointent tantôt sur l'un, tantôt sur l'autre.
    if (typeof raw?.disruption_id === 'string' && !byId.has(raw.disruption_id)) {
      byId.set(raw.disruption_id, raw);
    }
  }
  return byId;
}

/** Identifiants de perturbation référencés par une section. */
function sectionDisruptionIds(section: any): string[] {
  const links: any[] = [
    ...(Array.isArray(section?.links) ? section.links : []),
    ...(Array.isArray(section?.display_informations?.links)
      ? section.display_informations.links
      : []),
  ];
  return links
    .filter((link) => link?.type === 'disruption' || link?.rel === 'disruptions')
    .map((link) => link?.id)
    .filter((id: unknown): id is string => typeof id === 'string');
}

function buildDisruption(
  raw: any,
  lineName?: string,
  mode?: TransitLeg['mode']
): Disruption | null {
  const id = typeof raw?.id === 'string' ? raw.id : raw?.disruption_id;
  if (typeof id !== 'string') return null;

  const messages: any[] = Array.isArray(raw?.messages) ? raw.messages : [];
  const titleMessage = messages.find(isTitleChannel);
  const bodyMessage = messages.find((m) => m !== titleMessage);

  const cause = htmlToText(raw?.cause);
  const severityName = typeof raw?.severity?.name === 'string' ? raw.severity.name : '';

  const title =
    htmlToText(titleMessage?.text) || cause || severityName || 'Perturbation en cours';
  // `cause` ne sert de corps que s'il n'a pas déjà été promu en titre.
  const message = htmlToText(bodyMessage?.text) || (cause === title ? '' : cause);

  // Une perturbation sans texte exploitable n'apprend rien : mieux vaut ne pas la
  // compter que d'afficher une carte vide.
  if (!message && !titleMessage) return null;

  const disruption: Disruption = {
    id,
    severity: toDisruptionSeverity(raw),
    title,
    message,
    period: formatApplicationPeriod(raw?.application_periods),
    lineName,
    mode,
  };

  return isEquipmentOnly(disruption) ? null : disruption;
}

// Sous ce seuil, un tronçon à pied alourdit l'affichage sans rien apprendre.
const WALK_MIN_MINUTES = 3;

/** Vrai quand le lieu est un arrêt du réseau, et non une adresse, un POI ou des coordonnées. */
function isStopPlace(place: any): boolean {
  const type = place?.embedded_type;
  return type === 'stop_point' || type === 'stop_area';
}

function normalizeJourney(
  journey: any,
  index: number,
  disruptionIndex: Map<string, any>
): TransitOption | null {
  const sections: any[] = Array.isArray(journey?.sections) ? journey.sections : [];

  const legs: TransitLeg[] = [];
  // Une même perturbation peut être référencée par plusieurs sections : on garde
  // la première rencontrée, dont on connaît la ligne et le mode.
  const disruptions = new Map<string, Disruption>();

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const durationMinutes = Math.round((section?.duration ?? 0) / 60);

    if (section?.type === 'public_transport') {
      const info = section.display_informations ?? {};
      const commercialMode: string = info.commercial_mode ?? info.physical_mode ?? '';

      // Extraction des arrêts intermédiaires depuis Navitia stop_date_times
      const stopDateTimes: any[] = Array.isArray(section?.stop_date_times) ? section.stop_date_times : [];
      const intermediateStops = stopDateTimes.length > 2
        ? stopDateTimes.slice(1, -1).map((s: any) => ({
            name: s.stop_point?.name ?? s.stop_area?.name ?? '',
            time: s.departure_date_time ? navitiaTimeToHHMM(s.departure_date_time) : (s.arrival_date_time ? navitiaTimeToHHMM(s.arrival_date_time) : undefined),
          })).filter((s: any) => Boolean(s.name))
        : [];

      const mode = toLegMode(commercialMode);
      const lineName = info.code || info.label || commercialMode || undefined;

      // La ligne et le mode viennent de la section qui référence la perturbation,
      // pas de ses `impacted_objects` : c'est ce que l'utilisateur emprunte.
      for (const id of sectionDisruptionIds(section)) {
        if (disruptions.has(id)) continue;
        const raw = disruptionIndex.get(id);
        if (!raw) continue;
        const disruption = buildDisruption(raw, lineName, mode);
        if (disruption) disruptions.set(id, disruption);
      }

      legs.push({
        mode,
        lineName,
        lineColor: info.color ? `#${info.color}` : undefined,
        fromName: section.from?.name ?? '',
        toName: section.to?.name ?? '',
        direction: info.direction ?? undefined,
        durationMinutes,
        intermediateStopsCount: stopDateTimes.length > 1 ? stopDateTimes.length - 2 : 0,
        intermediateStops: intermediateStops.length > 0 ? intermediateStops : undefined,
      });
      continue;
    }

    // Tronçon à pied. `crow_fly` est la variante à vol d'oiseau que Navitia
    // produit quand il ne détaille pas le cheminement rue par rue — c'est très
    // souvent la forme que prend justement l'accès depuis une adresse.
    const isWalk =
      ((section?.type === 'street_network' || section?.type === 'crow_fly') &&
        section?.mode === 'walking') ||
      section?.type === 'transfer';
    if (!isWalk) continue;

    const isAccess = sectionIndex === 0;
    const walkType: TransitLeg['walkType'] = isAccess
      ? 'access'
      : sectionIndex === sections.length - 1
      ? 'egress'
      : 'transfer';

    // L'accès depuis une adresse ou une position GPS est conservé quelle que soit
    // sa durée : sans lui la timeline démarre sur un quai sans dire comment on y
    // arrive. Partir d'une gare ne pose pas ce problème, le seuil s'y applique.
    const startsFromPlace = isAccess && !isStopPlace(section?.from);
    if (durationMinutes < WALK_MIN_MINUTES && !startsFromPlace) continue;

    legs.push({
      mode: 'walk',
      walkType,
      fromName: section.from?.name ?? '',
      toName: section.to?.name ?? '',
      durationMinutes,
    });
  }

  // Un itinéraire 100 % à pied n'a pas sa place dans une liste de trains.
  const transitLegs = legs.filter((l) => l.mode !== 'walk');
  if (transitLegs.length === 0) return null;

  const departure = journey?.departure_date_time;
  const arrival = journey?.arrival_date_time;
  if (typeof departure !== 'string' || typeof arrival !== 'string') return null;

  const durationMinutes = Math.round((journey?.duration ?? 0) / 60);
  const headLeg = transitLegs[0];

  // Le plus grave en tête : c'est lui que la carte résume avant ouverture de la
  // bottom sheet.
  const journeyDisruptions = [...disruptions.values()].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );

  return {
    id: `prim-${departure}-${index}`,
    departureTime: navitiaTimeToHHMM(departure),
    arrivalTime: navitiaTimeToHHMM(arrival),
    durationMinutes,
    durationFormatted: formatDuration(durationMinutes),
    transfers: journey?.nb_transfers ?? Math.max(0, transitLegs.length - 1),
    lineName: headLeg.lineName ?? '',
    lineType: headLeg.mode,
    priceEstimate: estimateFare(legs),
    co2Grams:
      typeof journey?.co2_emission?.value === 'number'
        ? Math.round(journey.co2_emission.value)
        : undefined,
    hasPerturbations: journeyDisruptions.length > 0,
    perturbationsCount: journeyDisruptions.length || undefined,
    disruptionLabel: journeyDisruptions[0]?.title,
    disruptionSeverity: journeyDisruptions[0]?.severity,
    disruptions: journeyDisruptions.length > 0 ? journeyDisruptions : undefined,
    legs,
  };
}

function normalizeJourneys(payload: any): TransitOption[] {
  const journeys: any[] = Array.isArray(payload?.journeys) ? payload.journeys : [];
  const disruptionIndex = indexDisruptions(payload);

  const options: TransitOption[] = [];
  const seen = new Set<string>();

  journeys.forEach((journey, index) => {
    const option = normalizeJourney(journey, index, disruptionIndex);
    if (!option) return;
    // PRIM renvoie plusieurs variantes (`best`, `rapid`, `comfort`…) qui se
    // recoupent souvent sur le même train : on ne garde qu'une entrée par
    // couple départ/arrivée.
    const signature = `${option.departureTime}-${option.arrivalTime}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    options.push(option);
  });

  return options.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

// --------------------------------------------------------------------------
// Handler
// --------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { mode, from, to, date, time, direction, timeMode } = body ?? {};

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const apiKey = Deno.env.get('PRIM_API_KEY');

  // Mode « horizon » : le client demande seulement jusqu'à quelle date le
  // calendrier doit laisser choisir. Pas de trajet calculé, pas de coordonnées
  // requises.
  if (mode === 'horizon') {
    const horizon = apiKey ? await getProductionHorizon(supabase, apiKey) : null;
    return json({ horizon });
  }

  const horizon = apiKey ? await getProductionHorizon(supabase, apiKey) : null;

  // Validation avant toute dépense de quota.
  if (!isValidCoords(from) || !isValidCoords(to)) {
    return json({ error: 'from/to must be coordinates within the Île-de-France area' }, 400);
  }
  if (typeof date !== 'string' || !isValidDate(date, horizon)) {
    return json(
      { error: `date must be YYYY-MM-DD, between today and ${horizon ?? 'the production horizon'}` },
      400
    );
  }
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
    return json({ error: 'time must be HH:MM' }, 400);
  }
  const dir = direction === 'back' ? 'back' : 'go';
  // `arrival` = « je veux être arrivé avant cette heure », `departure` = « je pars
  // après ». Navitia gère nativement les deux via datetime_represents.
  const represents = timeMode === 'arrival' ? 'arrival' : 'departure';

  const cacheKey = buildCacheKey(from, to, date, time, `${dir}:${represents}`);
  const freshSince = new Date(Date.now() - CACHE_TTL_HOURS * 3600 * 1000).toISOString();

  const { data: cached } = await supabase
    .from('transit_cache')
    .select('payload')
    .eq('cache_key', cacheKey)
    .gte('created_at', freshSince)
    .maybeSingle();

  if (cached?.payload) {
    return json({ options: cached.payload, source: 'cache' });
  }

  if (!apiKey) {
    // Pas encore configuré : le client basculera sur son estimation locale.
    return json({ options: [], reason: 'unavailable' });
  }

  // Navitia attend `longitude;latitude` et un datetime compact sans séparateurs.
  const params = new URLSearchParams({
    from: `${from.lng};${from.lat}`,
    to: `${to.lng};${to.lat}`,
    datetime: `${date.replace(/-/g, '')}T${time.replace(':', '')}00`,
    datetime_represents: represents,
    timeframe_duration: String(TIMEFRAME_SECONDS),
    min_nb_journeys: String(MIN_JOURNEYS),
    max_nb_journeys: String(MAX_JOURNEYS),
  });

  let options: TransitOption[];
  try {
    const response = await fetch(`${PRIM_JOURNEYS_URL}?${params.toString()}`, {
      headers: { apiKey },
    });

    if (!response.ok) {
      console.error('PRIM responded with', response.status, await response.text());
      return json({ options: [], reason: 'unavailable' });
    }

    options = normalizeJourneys(await response.json());
  } catch (error) {
    console.error('PRIM request failed:', error);
    return json({ options: [], reason: 'unavailable' });
  }

  // Un résultat vide est une réponse valide (dernier train passé, desserte
  // inexistante) : on le met en cache pour ne pas re-payer l'appel.
  const { error: cacheError } = await supabase
    .from('transit_cache')
    .upsert({ cache_key: cacheKey, payload: options, created_at: new Date().toISOString() });

  if (cacheError) {
    // Le cache est une optimisation : son échec ne doit pas priver l'utilisateur
    // d'un résultat qu'on a déjà payé.
    console.warn('Could not write to transit_cache:', cacheError.message);
  } else {
    await supabase
      .from('transit_cache')
      .delete()
      .lt('created_at', new Date(Date.now() - CACHE_PURGE_HOURS * 3600 * 1000).toISOString());
  }

  return json({ options, source: 'live' });
});
