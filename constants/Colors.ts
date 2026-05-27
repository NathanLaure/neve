const tintColorLight = '#1F5F3E'; // Vert forêt profond / moderne
const tintColorDark = '#4CAF50'; // Vert forêt clair pour le mode sombre

export default {
  light: {
    text: '#1A251E', // Pine Black (très foncé avec une touche de vert)
    background: '#E3EAE4', // Eco grey-green, slightly darker to let white cards pop beautifully
    tint: tintColorLight,
    tabIconDefault: '#A3B5AA', // Vert grisâtre atténué
    tabIconSelected: tintColorLight,
    primary: '#1B4332', // Vert forêt profond
    primaryLight: '#2D6A4F', // Vert forêt intermédiaire
    secondary: '#00507B', // Bleu SNCF pour les transports
    warning: '#E65100', // Orange doux pour alertes météo/train
    card: '#FFFFFF', // Pure white cards float beautifully on light background
    border: '#E0E6E2', // Bordure très douce
    textMuted: '#62756A', // Texte secondaire doux
    greenBadge: '#E8F5E9', // Fond badge vert
    blueBadge: '#E3EFFA', // Fond badge bleu
    orangeBadge: '#FFF3E0', // Fond badge orange
  },
  dark: {
    text: '#F4F6F3', // Blanc cassé
    background: '#070A08', // Deeper, ultra-dark green-black background
    tint: tintColorDark,
    tabIconDefault: '#55685C',
    tabIconSelected: tintColorDark,
    primary: '#4CAF50', // Vert forêt vif lisible
    primaryLight: '#81C784',
    secondary: '#3399FF', // Bleu SNCF adapté au sombre
    warning: '#FF9800', // Orange doux adapté
    card: '#16221A', // Lighter deep pine green to pop beautifully against background
    border: '#16221A',
    textMuted: '#A3B5AA',
    greenBadge: '#1A2F22',
    blueBadge: '#11273C',
    orangeBadge: '#3C2411',
  },
};
