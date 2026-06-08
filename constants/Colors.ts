const tintColorLight = '#386641'; // Vert sapin moderne (Brand)
const tintColorDark = '#4CAF50'; // Vert forêt clair lisible

export default {
  light: {
    text: '#1A251E', // Pine Black (très foncé avec une touche de vert)
    background: '#F8FAFC', // Fond de canevas clair très doux
    tint: tintColorLight,
    tabIconDefault: '#A3B5AA', // Vert grisâtre atténué
    tabIconSelected: tintColorLight,
    primary: '#386641', // Vert sapin
    primaryLight: '#2D6A4F', // Vert forêt intermédiaire
    secondary: '#457B9D', // Bleu lac de montagne
    warning: '#B07D06', // Ocre terreux
    card: '#FFFFFF', // Cartes blanches flottant magnifiquement
    border: '#E0E6E2', // Bordure très douce
    textMuted: '#62756A', // Texte secondaire doux
    greenBadge: '#F2F6F3', // Fond badge vert sapin subtil (succès)
    blueBadge: '#F1F5F7', // Fond badge bleu lac (info)
    orangeBadge: '#FDFAF2', // Fond badge ocre (attention)
  },
  dark: {
    text: '#F4F6F3', // Blanc cassé
    background: '#070A08', // Vert-noir ultra profond
    tint: tintColorDark,
    tabIconDefault: '#55685C',
    tabIconSelected: tintColorDark,
    primary: '#4CAF50', // Vert forêt vif lisible
    primaryLight: '#81C784',
    secondary: '#98C1D9', // Bleu brumeux adapté au mode sombre
    warning: '#E9C46A', // Jaune moutarde doux
    card: '#16221A', // Vert pin profond légèrement plus clair pour faire ressortir les cartes
    border: '#16221A',
    textMuted: '#A3B5AA',
    greenBadge: '#0D1F11', // Vert sapin sombre
    blueBadge: '#0A192F', // Bleu sombre
    orangeBadge: '#241800', // Ocre sombre
  },
};
