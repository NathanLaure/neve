export const Neutral = {
  white: '#FFFFFF', // Figma: Neutral/0
  50: '#FBFAF7',    // Figma: Neutral/50 (canvas-bg-blur light, text.primary dark)
  100: '#F5F3EC',   // Figma: Neutral/100 (bg.background light, surface-secondary light)
  200: '#EAE6DC',   // Figma: Neutral/200 (border.light light, text.secondary dark)
  300: '#D6D0C2',   // Figma: Neutral/300 (border.default light, text.tertiary dark)
  400: '#A8A190',   // Figma: Neutral/400 (border.strong light, text.tertiary light)
  500: '#7A7363',   // Figma: Neutral/500
  600: '#575246',   // Figma: Neutral/600 (text.secondary light, border.strong dark, text.disabled dark)
  700: '#3D3930',   // Figma: Neutral/700 (border.default dark)
  800: '#29251E',   // Figma: Neutral/800 (surface-secondary dark, border.light dark, border.disabled dark)
  900: '#1C1914',   // Figma: Neutral/900 (text.primary light, bg.background dark, buttons.disabled dark)
  950: '#12100C',   // Figma: Neutral/950 (buttons.secondary light, bg.card dark, text-on-black dark)
};

export const Primary = {
  50: '#FFF7F2',    // Figma: Primary/50 (bg.brand-subtle light)
  100: '#FFEAD5',   // Figma: Primary/100
  200: '#FED2AA',   // Figma: Primary/200
  300: '#FEBF8C',   // Figma: Primary/300
  400: '#FC863B',   // Figma: Primary/400
  500: '#FA6415',   // Figma: Primary/500 (buttons.primary dark, bg.brand-hover dark)
  600: '#EB490B',   // Figma: Primary/600 (buttons.primary light, bg.brand dark, border.focus dark)
  700: '#C3350B',   // Figma: Primary/700 (bg.brand light, text.brand light, buttons.tertiary light)
  800: '#9B2B11',   // Figma: Primary/800 (bg.brand-hover light)
  900: '#7D2611',   // Figma: Primary/900
  950: '#200803',   // Figma: Primary/950 (bg.brand-subtle dark)
};

const tintColorLight = Primary[600]; // Figma: buttons.primary (Primary/600 #EB490B)
const tintColorDark = Primary[500];  // Figma: buttons.primary dark (Primary/500 #FA6415)

export default {
  light: {
    // =========================================================================
    // 1. BG & SURFACES (Figma: bg.*)
    // =========================================================================
    // Figma: bg.background (Neutral/100 #F5F3EC) — Fond principal de l'application
    background: Neutral[100],

    // Figma: bg.card (Neutral/0 #FFFFFF) — Cartes, fenêtres modales, feuilles bas d'écran
    card: Neutral.white,

    // Figma: bg.surface-secondary (Neutral/100 #F5F3EC) — Champs de recherche, entrées de texte
    surfaceSecondary: Neutral[300],

    // Figma: bg.canvas-bg-blur (Neutral/50 #FBFAF7) — Fond canvas flouté / en-têtes
    canvasBgBlur: Neutral[50],

    // Figma: bg.surface 0 opacity (Neutral/0 alpha 0)
    transparent: 'rgba(255, 255, 255, 0)',

    // Figma: bg.brand / Primary/700 (#C3350B) — Fond de marque / trajets recommandés
    brand: Primary[700],

    // Figma: bg.brand-hover / Primary/800 (#9B2B11) — État pressé / survolé
    brandHover: Primary[800],

    // Figma: bg.brand-subtle (Primary/50 #FFF7F2) — Badges légers ou bannières de marque
    brandSubtle: Primary[50],

    // =========================================================================
    // 2. TEXT (Figma: text.*)
    // =========================================================================
    // Figma: text.primary (Neutral/900 #1C1914) — Titres principaux et textes importants
    text: Neutral[900],

    // Figma: text.secondary (Neutral/600 #575246) — Sous-titres, légendes, texte secondaire
    textMuted: Neutral[600],

    // Figma: text.tertiary (Neutral/400 #A8A190) — Mentions très secondaires (heures, dates)
    textTertiary: Neutral[400],

    // Figma: text.disabled (Neutral/400 #A8A190) — Dates passées, libellés inactifs
    textDisabled: Neutral[400],

    // Figma: text.brand (Primary/700 #C3350B) — Liens cliquables, titres accentués
    textBrand: Primary[700],

    // Figma: text.on-brand (Neutral/0 #FFFFFF) — Texte écrit sur fond de marque
    textOnBrand: Neutral.white,

    // =========================================================================
    // 3. BORDER (Figma: border.*)
    // =========================================================================
    // Figma: border.default (Neutral/300 #D6D0C2) — Séparateurs et contours de cartes
    border: Neutral[300],

    // Figma: border.light (Neutral/200 #EAE6DC) — Séparateurs légers
    borderLight: Neutral[200],

    // Figma: border.strong (Neutral/400 #A8A190) — Bordure par défaut des inputs
    borderStrong: Neutral[400],

    // Figma: border.focus (Primary/700 #C3350B) — Bordure input actif / sélectionné
    borderFocus: Primary[700],

    // Figma: border.disabled (Neutral/200 #EAE6DC) — Bordure élément désactivé
    borderDisabled: Neutral[200],

    // =========================================================================
    // 4. BUTTONS (Figma: buttons.*)
    // =========================================================================
    // Figma: buttons.primary (Primary/600 #EB490B)
    buttonPrimary: Primary[600],

    // Figma: buttons.secondary (Neutral/950 #12100C)
    buttonSecondary: Primary[950],

    // Figma: buttons.text-on-black (Neutral/0 #FFFFFF)
    buttonSecondaryText: Neutral.white,

    // Figma: buttons.tertiary
    buttonTertiary: Primary[950],

    // Figma: buttons.tertiary-text
    buttonTertiaryText: Neutral.white,

    // Figma: buttons.disabled (Neutral/200 #EAE6DC)
    buttonDisabled: Neutral[200],

    // Figma: text.disabled (Neutral/400 #A8A190)
    buttonTextDisabled: Neutral[400],

    // Figma: text.on-brand (Neutral/0 #FFFFFF)
    buttonTextOnBrand: Neutral.white,

    // Figma: bg.card (Neutral/0 #FFFFFF).
    //
    // Et non `buttons.bg-btn-icon`, qui est aliasé sur `bg.background` : le
    // bouton d'icône se pose précisément sur ce fond-là, il y disparaissait et
    // ne laissait voir que son ombre. C'est une pastille de surface, comme une
    // carte posée sur la page.
    buttonBgIcon: Neutral.white,

    // Figma: text.primary (Neutral/900 #1C1914)
    buttonIconColor: Neutral[900],

    // =========================================================================
    // 5. STATUS (Figma: status.*)
    // =========================================================================
    // Success (Vert)
    // Figma: status.bg-success (Statut/green/600 #00A63E)
    statusBgSuccess: '#00A63E',
    // Figma: status.bg-success-subtle (Statut/green/50 #DCFCE7)
    statusBgSuccessSubtle: '#DCFCE7',
    // Figma: status.text-success (Statut/green/800 #0D542B)
    statusTextSuccess: '#0D542B',

    // Warning (Ambre)
    // Figma: status.bg-warning (Statut/amber/600 #BB4D00)
    statusBgWarning: '#BB4D00',
    // Figma: status.bg-warning-subtle (Statut/amber/50 #FFEDD4)
    statusBgWarningSubtle: '#FFEDD4',
    // Figma: status.text-warning (Statut/amber/800 #7B3306)
    statusTextWarning: '#7B3306',

    // Error (Rouge)
    // Figma: status.bg-error (Statut/red/600 #E7000B)
    statusBgError: '#E7000B',
    // Figma: status.bg-error-subtle (Statut/red/50 #FFE2E2)
    statusBgErrorSubtle: '#FFE2E2',
    // Figma: status.text-error (Statut/red/800 #82181A)
    statusTextError: '#82181A',

    // Info / Transport (Bleu)
    // Figma: status.bg-info (Statut/blue/600 #0084D1)
    statusBgInfo: '#0084D1',
    // Figma: status.bg-info-subtle (Statut/blue/50 #DFF2FE)
    statusBgInfoSubtle: '#DFF2FE',
    // Figma: status.text-info (Statut/blue/800 #024A70)
    statusTextInfo: '#024A70',

    // =========================================================================
    // 6. NAVIGATION & RACCOURCIS SÉMANTIQUES
    // =========================================================================
    // Figma: buttons.primary (Primary/600 #EB490B)
    primary: Primary[600],
    // Figma: bg.brand / buttons.tertiary (Primary/700 #C3350B)
    primaryLight: Primary[700],
    // Figma: Statut/blue/600 (#457B9D)
    secondary: '#457B9D',
    // Figma: status.bg-warning (Statut/amber/600 #BB4D00)
    warning: '#BB4D00',
    // Figma: status.bg-success (Statut/green/600 #00A63E)
    accentGreen: '#00A63E',
    accentPink: '#FF2D55',

    // Figma: buttons.primary (Primary/600 #EB490B) — Teinte active
    tint: tintColorLight,
    // Figma: text.secondary (Neutral/600 #575246) — Onglet inactif
    tabIconDefault: Neutral[600],
    // Figma: buttons.primary (Primary/600 #EB490B) — Onglet actif
    tabIconSelected: tintColorLight,
    // Figma: buttons.primary (Primary/600 #EB490B)
    brandFocus: Primary[600],

    // Badges UI
    greenBadge: '#DCFCE7',
    blueBadge: '#f5fbffff',
    orangeBadge: '#FFEDD4',

    // =========================================================================
    // 7. RIPPLE & FEEDBACK TACTILE
    // =========================================================================
    ripple: 'rgba(0, 0, 0, 0.08)',
    rippleSubtle: 'rgba(0, 0, 0, 0.05)',
    rippleOnBrand: 'rgba(255, 255, 255, 0.25)',
  },
  dark: {
    // =========================================================================
    // 1. BG & SURFACES (Figma: bg.*)
    // =========================================================================
    // Figma: bg.background (Neutral/900 #1C1914) — Fond principal de l'application
    background: Neutral[900],

    // Figma: bg.card (Neutral/950 #12100C) — Cartes, fenêtres modales, feuilles bas d'écran
    card: Neutral[950],

    // Figma: bg.surface-secondary (Neutral/800 #29251E) — Champs de recherche, entrées de texte
    surfaceSecondary: Neutral[700],

    // Figma: bg.canvas-bg-blur (Neutral/900 #1C1914) — Fond canvas flouté / en-têtes
    canvasBgBlur: Neutral[900],

    // Figma: bg.surface 0 opacity (Neutral/950 alpha 0)
    transparent: 'rgba(18, 16, 12, 0)',

    // Figma: bg.brand (Primary/600 #EB490B) — Fond de marque / trajets recommandés
    brand: Primary[600],

    // Figma: bg.brand-hover (Primary/500 #FA6415) — État pressé / survolé
    brandHover: Primary[500],

    // Figma: bg.brand-subtle (Primary/950 #200803) — Badges légers ou bannières de marque
    brandSubtle: Primary[950],

    // =========================================================================
    // 2. TEXT (Figma: text.*)
    // =========================================================================
    // Figma: text.primary (Neutral/50 #FBFAF7) — Titres principaux et textes importants
    text: Neutral[50],

    // Figma: text.secondary (Neutral/200 #EAE6DC) — Sous-titres, légendes, texte secondaire
    textMuted: Neutral[200],

    // Figma: text.tertiary (Neutral/300 #D6D0C2) — Mentions très secondaires (heures, dates)
    textTertiary: Neutral[300],

    // Figma: text.disabled (Neutral/600 #575246) — Dates passées, libellés inactifs
    textDisabled: Neutral[600],

    // Figma: text.brand (Primary/600 #EB490B) — Liens cliquables, titres accentués
    textBrand: Primary[600],

    // Figma: text.on-brand (Neutral/0 #FFFFFF) — Texte écrit sur fond de marque
    textOnBrand: Neutral.white,

    // =========================================================================
    // 3. BORDER (Figma: border.*)
    // =========================================================================
    // Figma: border.default (Neutral/700 #3D3930) — Séparateurs et contours de cartes
    border: Neutral[600],

    // Figma: border.light (Neutral/800 #29251E) — Séparateurs légers
    borderLight: Neutral[700],

    // Figma: border.strong — Bordure par défaut des inputs
    borderStrong: Neutral[500],

    // Figma: border.focus (Primary/600 #EB490B) — Bordure input actif / sélectionné
    borderFocus: Primary[600],

    // Figma: border.disabled (Neutral/800 #29251E) — Bordure élément désactivé
    borderDisabled: Neutral[800],

    // =========================================================================
    // 4. BUTTONS (Figma: buttons.*)
    // =========================================================================
    // Figma: buttons.primary 
    buttonPrimary: Primary[600],

    // Figma: buttons.secondary (Primary/50 #FBFAF7)
    buttonSecondary: Primary[50],

    // Figma: buttons.text-on-black (Neutral/950 #12100C)
    buttonSecondaryText: Neutral[950],

    // Figma: buttons.tertiary
    buttonTertiary: Primary[50],

    // Figma: buttons.tertiary-text
    buttonTertiaryText: Neutral[950],

    // Figma: buttons.disabled (Neutral/900 #1C1914)
    buttonDisabled: Neutral[800],

    // Figma: buttons.disabled (Neutral/900 #1C1914)
    buttonTextDisabled: Neutral[600],

    // Figma: text.on-brand (Neutral/0 #FFFFFF)
    buttonTextOnBrand: Neutral.white,

    // Figma: bg.card (Neutral/950 #12100C) — voir le clair : pastille de
    // surface, et non le fond d'écran sur lequel elle se pose.
    buttonBgIcon: Neutral[950],

    // Figma: text.primary (Neutral/50 #FBFAF7).
    //
    // Et non `buttons.text-on-black`, qui habille un libellé posé sur un aplat
    // clair : ici l'icône se pose sur la pastille, dont le sombre est le fond de
    // carte. Neutral/950 la rendait noire sur noir.
    buttonIconColor: Neutral[50],

    // =========================================================================
    // 5. STATUS (Figma: status.*)
    // =========================================================================
    // Success (Vert)
    // Figma: status.bg-success (Statut/green/500 #00C950)
    statusBgSuccess: '#00C950',
    // Figma: status.bg-success-subtle (Statut/green/950 #032E15)
    statusBgSuccessSubtle: '#032E15',
    // Figma: status.text-success (Statut/green/200 #7BF1A8)
    statusTextSuccess: '#7BF1A8',

    // Warning (Ambre)
    // Figma: status.bg-warning (Statut/amber/50 #FFEDD4)
    statusBgWarning: '#FFEDD4',
    // Figma: status.bg-warning-subtle (Statut/amber/950 #461901)
    statusBgWarningSubtle: '#461901',
    // Figma: status.text-warning (Statut/amber/200 #FFB86A)
    statusTextWarning: '#FFB86A',

    // Error (Rouge)
    // Figma: status.bg-error (Statut/red/500 #FB2C36)
    statusBgError: '#FB2C36',
    // Figma: status.bg-error-subtle (Statut/red/950 #460809)
    statusBgErrorSubtle: '#460809',
    // Figma: status.text-error (Statut/red/200 #FFA2A2)
    statusTextError: '#FFA2A2',

    // Info / Transport (Bleu)
    // Figma: status.bg-info (Statut/blue/500 #00A6F4)
    statusBgInfo: '#00A6F4',
    // Figma: status.bg-info-subtle (Statut/blue/950 #052F4A)
    statusBgInfoSubtle: '#052F4A',
    // Figma: status.text-info (Statut/blue/200 #74D4FF)
    statusTextInfo: '#74D4FF',

    // =========================================================================
    // 6. NAVIGATION & RACCOURCIS SÉMANTIQUES (Sombre)
    // =========================================================================
    // Figma: buttons.primary (Primary/500 #FA6415)
    primary: Primary[500],
    // Figma: Primary/400 (#FC863B)
    primaryLight: Primary[400],
    // Figma: blue-500 (#98C1D9)
    secondary: '#98C1D9',
    // Figma: status.bg-warning (#FFEDD4)
    warning: '#FFEDD4',
    accentPink: '#FF2D55',
    accentGreen: '#34C759',

    // Figma: buttons.primary (Primary/500 #FA6415) — Teinte active
    tint: tintColorDark,
    // Figma: Neutral/600 (#575246) — Onglet inactif
    tabIconDefault: Neutral[600],
    // Figma: buttons.primary (Primary/500 #FA6415) — Onglet actif
    tabIconSelected: tintColorDark,
    // Figma: buttons.primary (Primary/500 #FA6415)
    brandFocus: Primary[500],

    // Badges UI
    greenBadge: '#032E15',
    blueBadge: '#052F4A',
    orangeBadge: '#461901',

    // =========================================================================
    // 7. RIPPLE (Sombre)
    // =========================================================================
    ripple: 'rgba(255, 255, 255, 0.12)',
    rippleSubtle: 'rgba(255, 255, 255, 0.08)',
    rippleOnBrand: 'rgba(255, 255, 255, 0.25)',
  },
};
