import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import {
  BUS_MODE_SVG,
  RER_MODE_SVG,
  METRO_MODE_SVG,
  TRANSILIEN_MODE_SVG,
  TRAM_MODE_SVG,
  RER_PICTOS,
  SNCF_PICTOS,
  METRO_PICTOS,
  TRAM_PICTOS,
} from '@/constants/idfmSvg';

const WALK_PERSON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="#666666">
  <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/>
</svg>`;

/**
/* Calcule la couleur de texte accessible (#FFFFFF ou #000000)
/* en fonction de la luminance du fond hexadécimal.
*/
function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return '#FFFFFF';
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#FFFFFF';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  // Formule YIQ de contraste WCAG
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#000000' : '#FFFFFF';
}

export interface TransportLineBadgeProps {
  mode: 'train' | 'rer' | 'metro' | 'tram' | 'bus' | 'walk';
  lineName?: string;
  lineColor?: string;
  size?: number;
  durationMinutes?: number;
  hideModeIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TransportLineBadge: React.FC<TransportLineBadgeProps> = ({
  mode,
  lineName,
  lineColor,
  size = 20,
  durationMinutes,
  hideModeIcon = false,
  style,
}) => {
  const cleanLine = (lineName || '').trim().toLowerCase();

  // 1. RER (ex: 'A', 'B', 'C', 'D', 'E')
  if (mode === 'rer') {
    const lineLetter = cleanLine.replace(/^rer\s*/, '');
    const pictoXml = lineLetter ? RER_PICTOS[lineLetter] : undefined;
    const bg = lineColor || '#E3051C';
    const textColor = getContrastTextColor(bg);
    return (
      <View style={[styles.badgeRow, style]}>
        {!hideModeIcon && <SvgXml xml={RER_MODE_SVG} width={size} height={size} />}
        {pictoXml ? (
          <SvgXml xml={pictoXml} width={size} height={size} />
        ) : lineName ? (
          <View style={[styles.textBadge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{lineName}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // 2. Metro (ex: '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14')
  if (mode === 'metro') {
    const lineNum = cleanLine.replace(/^m(étro)?\s*/, '');
    const pictoXml = lineNum ? METRO_PICTOS[lineNum] : undefined;
    const bg = lineColor || '#6E6E9D';
    const textColor = getContrastTextColor(bg);
    return (
      <View style={[styles.badgeRow, style]}>
        {!hideModeIcon && <SvgXml xml={METRO_MODE_SVG} width={size} height={size} />}
        {pictoXml ? (
          <SvgXml xml={pictoXml} width={size} height={size} />
        ) : lineName ? (
          <View style={[styles.textBadge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{lineName}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // 3. Train / Transilien (ex: 'H', 'J', 'K', 'L', 'N', 'P', 'R', 'U')
  if (mode === 'train') {
    const lineLetter = cleanLine.replace(/^ligne\s*/, '').replace(/^transilien\s*/, '');
    const pictoXml = lineLetter ? SNCF_PICTOS[lineLetter] : undefined;
    const bg = lineColor || '#004F9F';
    const textColor = getContrastTextColor(bg);
    return (
      <View style={[styles.badgeRow, style]}>
        {!hideModeIcon && <SvgXml xml={TRANSILIEN_MODE_SVG} width={size} height={size} />}
        {pictoXml ? (
          <SvgXml xml={pictoXml} width={size} height={size} />
        ) : lineName ? (
          <View style={[styles.textBadge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{lineName}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // 4. Tram (ex: 't1', 't2', 't3a', 't3b', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12', 't13')
  if (mode === 'tram') {
    const tramKey = cleanLine.startsWith('t') ? cleanLine : `t${cleanLine}`;
    const pictoXml = cleanLine ? TRAM_PICTOS[tramKey] : undefined;
    const bg = lineColor || '#0055C8';
    const textColor = getContrastTextColor(bg);
    return (
      <View style={[styles.badgeRow, style]}>
        {!hideModeIcon && <SvgXml xml={TRAM_MODE_SVG} width={size} height={size} />}
        {pictoXml ? (
          <SvgXml xml={pictoXml} width={size} height={size} />
        ) : lineName ? (
          <View style={[styles.textBadge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{lineName}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // 5. Bus
  if (mode === 'bus') {
    const bg = lineColor || '#760C6B';
    const textColor = getContrastTextColor(bg);
    return (
      <View style={[styles.badgeRow, style]}>
        {!hideModeIcon && <SvgXml xml={BUS_MODE_SVG} width={size} height={size} />}
        {lineName ? (
          <View style={[styles.textBadge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{lineName}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // 6. Walk / Piéton (icône + chiffre en bas à droite sans fond ni badge)
  const mins =
    durationMinutes ??
    (lineName && !isNaN(Number(lineName)) ? Number(lineName) : undefined);

  return (
    <View style={[styles.walkBadgeBox, { width: size, height: size }, style]}>
      <SvgXml xml={WALK_PERSON_SVG} width={size} height={size} />
      {mins ? <Text style={styles.walkSubscriptText}>{mins}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  walkBadgeBox: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  walkSubscriptText: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    fontFamily: 'Satoshi_Variable',
    fontWeight: '800',
    fontSize: 10,
    lineHeight: 11,
    color: '#444444',
  },
  textBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 22,
    minHeight: 22,
  },
  badgeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
