const tintColorLight = '#EB490B'; // Orange vif sémantique (Primary-600)
// Les maquettes Figma en thème sombre utilisent bg/brand = #EB490B, la même valeur
// qu'en thème clair. On s'aligne dessus : Figma fait foi sur la couleur de marque.
const tintColorDark = '#EB490B'; // bg/brand (Figma, sombre)

export default {
  light: {
    text: '#292929', // neutral-900
    background: '#EFEFEF', // neutral-50
    tint: tintColorLight,
    tabIconDefault: '#7C7C7C', // neutral-400
    tabIconSelected: tintColorLight,
    primary: '#EB490B', // Primary-600
    primaryLight: '#C3350B', // Primary-700
    secondary: '#457B9D', // blue-600
    warning: '#B07D06', // amber-600
    card: '#FFFFFF', // neutral-0
    border: '#BDBDBD', // neutral-200
    borderLight: '#DCDCDC', // neutral-100
    borderStrong: '#989898',
    borderDisabled: '#BDBDBD',
    textMuted: '#525252', // neutral-600
    textDisabled: '#7C7C7C', // text/disabled — dates passées, libellés inactifs
    surfaceSecondary: '#DCDCDC', // bg/surface-secondary
    greenBadge: '#F2F6F3', // status-bg-success-subtle
    blueBadge: '#F1F5F7', // status-bg-info-subtle
    orangeBadge: '#FDFAF2', // status-bg-warning-subtle
    brandSubtle: '#FFFFFF', // bg/brand-subtle (Figma orange-subtle)
    brandFocus: '#EB490B', // border/focus (selected brand focus)

    // Figma Button Color Tokens (Node 42:303)
    buttonPrimary: '#EB490B',
    buttonSecondary: '#111111',
    buttonSecondaryText: '#EFEFEF',
    buttonTertiary: '#C3350B',
    buttonDisabled: '#DCDCDC',
    buttonTextDisabled: '#7C7C7C',
    buttonTextOnBrand: '#FFFFFF',
    buttonBgIcon: '#FFFFFF',
    buttonIconColor: '#111111',

    // Figma Status Semantic Colors
    statusBgSuccess: '#386641',
    statusBgSuccessSubtle: '#F2F6F3',
    statusTextSuccess: '#1E3522',
    statusBgWarning: '#B07D06',
    statusBgWarningSubtle: '#FDFAF2',
    statusTextWarning: '#664600',
    statusBgError: '#BC4749',
    statusBgErrorSubtle: '#FDF4F4',
    statusTextError: '#6F2022',
    statusBgInfo: '#457B9D',
    statusBgInfoSubtle: '#F1F5F7',
    statusTextInfo: '#1D3557',
  },
  dark: {
    text: '#EFEFEF', // neutral-50
    background: '#111111', // neutral-900
    tint: tintColorDark,
    tabIconDefault: '#989898', // neutral-300
    tabIconSelected: tintColorDark,
    primary: '#FA6415', // Primary-500
    primaryLight: '#FC863B', // Primary-400
    secondary: '#98C1D9', // blue-500
    warning: '#E9C46A', // amber-500
    card: '#222222', // neutral-950
    border: '#3D3D3D', // neutral-800
    borderLight: '#222222', // neutral-600
    borderStrong: '#464646',
    borderDisabled: '#3D3D3D',
    textMuted: '#BDBDBD', // neutral-300
    textDisabled: '#525252', // text/disabled (Figma) — dates passées barrées du calendrier
    surfaceSecondary: '#3D3D3D', // bg/surface-secondary (Figma)
    greenBadge: '#0D1F11', // status-bg-success-subtle
    blueBadge: '#0A192F', // status-bg-info-subtle
    orangeBadge: '#241800', // status-bg-warning-subtle
    brandSubtle: '#241800', // bg/brand-subtle dark
    brandFocus: '#FA6415', // border/focus dark

    // Figma Button Color Tokens (Node 42:303)
    buttonPrimary: '#FA6415',
    buttonSecondary: '#EFEFEF',
    buttonSecondaryText: '#111111',
    buttonTertiary: '#EB490B',
    buttonDisabled: '#222222',
    buttonTextDisabled: '#7C7C7C',
    buttonTextOnBrand: '#FFFFFF',
    // buttons/bg-btn-icon vaut #EFEFEF chez Figma : le bouton icône rond est clair
    // sur fond sombre. La valeur précédente (#111111) le rendait invisible sur
    // bg/background, lui aussi #111111.
    buttonBgIcon: '#EFEFEF',
    // Couleur de l'icône POSÉE SUR buttonBgIcon, qui est clair dans les deux
    // thèmes : l'icône doit donc être sombre des deux côtés.
    buttonIconColor: '#111111',

    // Figma Status Semantic Colors
    statusBgSuccess: '#6A994E',
    statusBgSuccessSubtle: '#0D1F11',
    statusTextSuccess: '#C8DBC5',
    statusBgWarning: '#E9C46A',
    statusBgWarningSubtle: '#241800',
    statusTextWarning: '#F4E2B0',
    statusBgError: '#E07A5F',
    statusBgErrorSubtle: '#260B0C',
    statusTextError: '#F3C6C6',
    statusBgInfo: '#98C1D9',
    statusBgInfoSubtle: '#0A192F',
    statusTextInfo: '#D0E1EC',
  },
};
