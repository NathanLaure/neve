const tintColorLight = '#EB490B'; // Orange vif sémantique (Primary-600)
const tintColorDark = '#FA6415'; // Orange clair sémantique (Primary-500)

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
    textMuted: '#525252', // neutral-600
    greenBadge: '#F2F6F3', // status-bg-success-subtle
    blueBadge: '#F1F5F7', // status-bg-info-subtle
    orangeBadge: '#FDFAF2', // status-bg-warning-subtle
  },
  dark: {
    text: '#EFEFEF', // neutral-50
    background: '#292929', // neutral-900
    tint: tintColorDark,
    tabIconDefault: '#989898', // neutral-300
    tabIconSelected: tintColorDark,
    primary: '#FA6415', // Primary-500
    primaryLight: '#FC863B', // Primary-400
    secondary: '#98C1D9', // blue-500
    warning: '#E9C46A', // amber-500
    card: '#1B1B1B', // neutral-950
    border: '#3D3D3D', // neutral-800
    borderLight: '#525252', // neutral-600
    textMuted: '#989898', // neutral-300
    greenBadge: '#0D1F11', // status-bg-success-subtle
    blueBadge: '#0A192F', // status-bg-info-subtle
    orangeBadge: '#241800', // status-bg-warning-subtle
  },
};
