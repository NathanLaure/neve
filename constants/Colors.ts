const tintColorLight = '#C3350B'; // Orange vif sémantique (Primary-600)
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
    warning: '#BB4D00', // Statut/amber/600 (Figma)
    accentPink: '#FF2D55',
    accentGreen: '#34C759',
    card: '#FFFFFF', // neutral-0
    border: '#BDBDBD', // neutral-200
    borderLight: '#DCDCDC', // neutral-100
    borderStrong: '#989898',
    borderDisabled: '#BDBDBD',
    textMuted: '#525252', // neutral-600
    textDisabled: '#7C7C7C', // text/disabled — dates passées, libellés inactifs
    surfaceSecondary: '#DCDCDC', // bg/surface-secondary
    greenBadge: '#DCFCE7', // status-bg-success-subtle
    blueBadge: '#DFF2FE', // status-bg-info-subtle
    orangeBadge: '#FFEDD4', // status-bg-warning-subtle
    brandSubtle: '#FFFFFF', // bg/brand-subtle (Figma orange-subtle)
    brandFocus: '#EB490B', // border/focus (selected brand focus)
    brand: '#C3350B', // Couleur de marque / Trajet recommandé

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
    statusBgSuccess: '#00A63E',
    statusBgSuccessSubtle: '#DCFCE7',
    statusTextSuccess: '#0D542B',
    statusBgWarning: '#BB4D00',
    statusBgWarningSubtle: '#FFEDD4',
    statusTextWarning: '#7B3306',
    statusBgError: '#E7000B',
    statusBgErrorSubtle: '#FFE2E2',
    statusTextError: '#82181A',
    statusBgInfo: '#0084D1',
    statusBgInfoSubtle: '#DFF2FE',
    statusTextInfo: '#024A70',
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
    warning: '#E17100', // Statut/amber/500 (Figma)
    accentPink: '#FF2D55',
    accentGreen: '#34C759',
    card: '#222222', // neutral-950
    border: '#3D3D3D', // neutral-800
    borderLight: '#222222', // neutral-600
    borderStrong: '#464646',
    borderDisabled: '#3D3D3D',
    textMuted: '#BDBDBD', // neutral-300
    textDisabled: '#525252', // text/disabled (Figma) — dates passées barrées du calendrier
    surfaceSecondary: '#3D3D3D', // bg/surface-secondary (Figma)
    greenBadge: '#032E15', // status-bg-success-subtle
    blueBadge: '#052F4A', // status-bg-info-subtle
    orangeBadge: '#461901', // status-bg-warning-subtle
    brandSubtle: '#241800', // bg/brand-subtle dark
    brandFocus: '#FA6415', // border/focus dark
    brand: '#EB490B', // Couleur de marque / Trajet recommandé

    // Figma Button Color Tokens (Node 42:303)
    buttonPrimary: '#FA6415',
    buttonSecondary: '#EFEFEF',
    buttonSecondaryText: '#111111',
    buttonTertiary: '#EB490B',
    buttonDisabled: '#222222',
    buttonTextDisabled: '#7C7C7C',
    buttonTextOnBrand: '#FFFFFF',
    buttonBgIcon: '#EFEFEF',
    buttonIconColor: '#111111',

    // Figma Status Semantic Colors
    statusBgSuccess: '#00C950',
    statusBgSuccessSubtle: '#032E15',
    statusTextSuccess: '#7BF1A8',
    statusBgWarning: '#E17100',
    statusBgWarningSubtle: '#461901',
    statusTextWarning: '#FFB86A',
    statusBgError: '#FB2C36',
    statusBgErrorSubtle: '#460809',
    statusTextError: '#FFA2A2',
    statusBgInfo: '#00A6F4',
    statusBgInfoSubtle: '#052F4A',
    statusTextInfo: '#74D4FF',
  },
};
