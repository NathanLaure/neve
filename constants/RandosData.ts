export interface TrainOption {
  id: string;
  time: string;
  duration: string;
  price: number;
  trainNumber: string;
  type: string;
}

export interface GPXPoint {
  latitude: number;
  longitude: number;
}

export interface RandoData {
  id: string;
  title: string;
  imageUrl: string;
  startStation: string;
  startStationCoords: { latitude: number; longitude: number };
  endStation: string;
  endStationCoords: { latitude: number; longitude: number };
  distance: string;
  durationHours: number;
  difficulty: 'Facile' | 'Modéré' | 'Difficile';
  elevation: string;
  weatherTemp: string;
  weatherIcon: string;
  trainDurationMinutes: number; // base duration from Paris
  trainType: string;
  priceEst: number;
  gpxTrace: GPXPoint[];
  trainOptionsGo: TrainOption[];
  trainOptionsBack: TrainOption[];
  description: string;
}

export const MOCK_RANDOS: RandoData[] = [
  {
    id: '1',
    title: 'Les Balcons de la Vallée de Chevreuse',
    imageUrl:
      'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop',
    startStation: 'Gare de Rambouillet',
    startStationCoords: { latitude: 48.6468, longitude: 1.8344 },
    endStation: 'Gare de Rambouillet',
    endStationCoords: { latitude: 48.6468, longitude: 1.8344 },
    distance: '12 km',
    durationHours: 3.5,
    difficulty: 'Modéré',
    elevation: '+150m',
    weatherTemp: '19°C',
    weatherIcon: '☀️',
    trainDurationMinutes: 35,
    trainType: 'Transilien N',
    priceEst: 5.0,
    description:
      "Une superbe randonnée au cœur de la vallée de Chevreuse. Ce parcours forestier vous fait découvrir des châteaux dômes et des étangs calmes. Parfait pour s'échapper de la ville le temps d'une après-midi.",
    gpxTrace: [
      { latitude: 48.6468, longitude: 1.8344 },
      { latitude: 48.6512, longitude: 1.839 },
      { latitude: 48.658, longitude: 1.842 },
      { latitude: 48.665, longitude: 1.832 },
      { latitude: 48.662, longitude: 1.821 },
      { latitude: 48.652, longitude: 1.825 },
      { latitude: 48.6468, longitude: 1.8344 },
    ],
    trainOptionsGo: [
      {
        id: 'g1_1',
        time: '08:20',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1342',
        type: 'Transilien N',
      },
      {
        id: 'g1_2',
        time: '09:20',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1344',
        type: 'Transilien N',
      },
      {
        id: 'g1_3',
        time: '10:20',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1346',
        type: 'Transilien N',
      },
      {
        id: 'g1_4',
        time: '11:20',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1348',
        type: 'Transilien N',
      },
    ],
    trainOptionsBack: [
      {
        id: 'b1_1',
        time: '16:05',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1421',
        type: 'Transilien N',
      },
      {
        id: 'b1_2',
        time: '17:05',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1423',
        type: 'Transilien N',
      },
      {
        id: 'b1_3',
        time: '18:05',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1425',
        type: 'Transilien N',
      },
      {
        id: 'b1_4',
        time: '19:05',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1427',
        type: 'Transilien N',
      },
    ],
  },
  {
    id: '2',
    title: 'La Traversée de la Forêt de Fontainebleau',
    imageUrl:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
    startStation: 'Gare de Fontainebleau-Avon',
    startStationCoords: { latitude: 48.4217, longitude: 2.7247 },
    endStation: 'Gare de Fontainebleau-Avon',
    endStationCoords: { latitude: 48.4217, longitude: 2.7247 },
    distance: '16.5 km',
    durationHours: 5,
    difficulty: 'Difficile',
    elevation: '+280m',
    weatherTemp: '21°C',
    weatherIcon: '⛅',
    trainDurationMinutes: 40,
    trainType: 'Transilien R',
    priceEst: 6.2,
    description:
      'Une grande randonnée physique à travers les chaos rocheux célèbres de la forêt de Fontainebleau. Un dépaysement total garanti parmi les pins maritimes et les étendues de sable blanc.',
    gpxTrace: [
      { latitude: 48.4217, longitude: 2.7247 },
      { latitude: 48.428, longitude: 2.712 },
      { latitude: 48.435, longitude: 2.701 },
      { latitude: 48.441, longitude: 2.715 },
      { latitude: 48.432, longitude: 2.735 },
      { latitude: 48.424, longitude: 2.738 },
      { latitude: 48.4217, longitude: 2.7247 },
    ],
    trainOptionsGo: [
      {
        id: 'g2_1',
        time: '07:45',
        duration: '40 min',
        price: 6.2,
        trainNumber: 'TRN 2701',
        type: 'Transilien R',
      },
      {
        id: 'g2_2',
        time: '08:45',
        duration: '40 min',
        price: 6.2,
        trainNumber: 'TRN 2703',
        type: 'Transilien R',
      },
      {
        id: 'g2_3',
        time: '09:45',
        duration: '40 min',
        price: 6.2,
        trainNumber: 'TRN 2705',
        type: 'Transilien R',
      },
    ],
    trainOptionsBack: [
      {
        id: 'b2_1',
        time: '17:12',
        duration: '40 min',
        price: 6.2,
        trainNumber: 'TRN 2802',
        type: 'Transilien R',
      },
      {
        id: 'b2_2',
        time: '18:12',
        duration: '40 min',
        price: 6.2,
        trainNumber: 'TRN 2804',
        type: 'Transilien R',
      },
      {
        id: 'b2_3',
        time: '19:12',
        duration: '40 min',
        price: 6.2,
        trainNumber: 'TRN 2806',
        type: 'Transilien R',
      },
    ],
  },
  {
    id: '3',
    title: 'Le Sentier Historique des Peintres de Barbizon',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop',
    startStation: 'Gare de Melun',
    startStationCoords: { latitude: 48.5372, longitude: 2.6612 },
    endStation: 'Gare de Melun',
    endStationCoords: { latitude: 48.5372, longitude: 2.6612 },
    distance: '8.5 km',
    durationHours: 2.5,
    difficulty: 'Facile',
    elevation: '+60m',
    weatherTemp: '20°C',
    weatherIcon: '☀️',
    trainDurationMinutes: 25,
    trainType: 'TER',
    priceEst: 4.8,
    description:
      "Une balade paisible et accessible à tous sur les pas des peintres impressionnistes de l'école de Barbizon. Vous traverserez de jolis villages pavés et des sous-bois lumineux.",
    gpxTrace: [
      { latitude: 48.5372, longitude: 2.6612 },
      { latitude: 48.541, longitude: 2.651 },
      { latitude: 48.548, longitude: 2.645 },
      { latitude: 48.552, longitude: 2.655 },
      { latitude: 48.542, longitude: 2.671 },
      { latitude: 48.5372, longitude: 2.6612 },
    ],
    trainOptionsGo: [
      {
        id: 'g3_1',
        time: '09:05',
        duration: '25 min',
        price: 4.8,
        trainNumber: 'TER 84901',
        type: 'TER',
      },
      {
        id: 'g3_2',
        time: '10:05',
        duration: '25 min',
        price: 4.8,
        trainNumber: 'TER 84903',
        type: 'TER',
      },
      {
        id: 'g3_3',
        time: '11:05',
        duration: '25 min',
        price: 4.8,
        trainNumber: 'TER 84905',
        type: 'TER',
      },
    ],
    trainOptionsBack: [
      {
        id: 'b3_1',
        time: '15:45',
        duration: '25 min',
        price: 4.8,
        trainNumber: 'TER 84920',
        type: 'TER',
      },
      {
        id: 'b3_2',
        time: '16:45',
        duration: '25 min',
        price: 4.8,
        trainNumber: 'TER 84922',
        type: 'TER',
      },
      {
        id: 'b3_3',
        time: '17:45',
        duration: '25 min',
        price: 4.8,
        trainNumber: 'TER 84924',
        type: 'TER',
      },
    ],
  },
  {
    id: '4',
    title: 'La Boucle des Étangs de Hollande',
    imageUrl:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
    startStation: 'Gare de Rambouillet',
    startStationCoords: { latitude: 48.6468, longitude: 1.8344 },
    endStation: 'Gare de Rambouillet',
    endStationCoords: { latitude: 48.6468, longitude: 1.8344 },
    distance: '14 km',
    durationHours: 4,
    difficulty: 'Modéré',
    elevation: '+80m',
    weatherTemp: '18°C',
    weatherIcon: '☁️',
    trainDurationMinutes: 35,
    trainType: 'Transilien N',
    priceEst: 5.0,
    description:
      "Une magnifique boucle au bord des célèbres Étangs de Hollande créés sous Louis XIV. L'itinéraire traverse d'imposants massifs forestiers sauvages idéaux pour l'observation de la faune.",
    gpxTrace: [
      { latitude: 48.6468, longitude: 1.8344 },
      { latitude: 48.639, longitude: 1.821 },
      { latitude: 48.628, longitude: 1.825 },
      { latitude: 48.631, longitude: 1.841 },
      { latitude: 48.642, longitude: 1.848 },
      { latitude: 48.6468, longitude: 1.8344 },
    ],
    trainOptionsGo: [
      {
        id: 'g4_1',
        time: '08:50',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1343',
        type: 'Transilien N',
      },
      {
        id: 'g4_2',
        time: '09:50',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1345',
        type: 'Transilien N',
      },
      {
        id: 'g4_3',
        time: '10:50',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1347',
        type: 'Transilien N',
      },
    ],
    trainOptionsBack: [
      {
        id: 'b4_1',
        time: '16:35',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1422',
        type: 'Transilien N',
      },
      {
        id: 'b4_2',
        time: '17:35',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1424',
        type: 'Transilien N',
      },
      {
        id: 'b4_3',
        time: '18:35',
        duration: '35 min',
        price: 5.0,
        trainNumber: 'TRN 1426',
        type: 'Transilien N',
      },
    ],
  },
];
