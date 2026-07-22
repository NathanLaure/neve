import React from 'react';
import { View } from 'react-native';
import {
  Sun,
  Cloud,
  Droplet,
  Snowflake,
  Zap,
  CloudFog,
} from 'lucide-react-native';

export type WeatherIconType =
  | 'sun'
  | 'cloud-sun'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'cloud-lightning'
  | 'fog';

export interface WeatherIconProps {
  type: WeatherIconType;
  size?: number;
}

export default function WeatherIcon({ type, size = 48 }: WeatherIconProps) {
  switch (type) {
    case 'sun':
      return <Sun size={size} color="#F59E0B" fill="rgba(245, 158, 11, 0.15)" />;

    case 'cloud-sun':
      return (
        <View style={{ width: size, height: size, position: 'relative' }}>
          {/* Golden Sun top right */}
          <View style={{ position: 'absolute', top: 0, right: 0 }}>
            <Sun size={size * 0.65} color="#F59E0B" fill="rgba(245, 158, 11, 0.2)" />
          </View>
          {/* Light Slate Cloud bottom left */}
          <View style={{ position: 'absolute', bottom: 0, left: 0 }}>
            <Cloud size={size * 0.78} color="#E2E8F0" fill="rgba(226, 232, 240, 0.25)" />
          </View>
        </View>
      );

    case 'cloud-rain':
      return (
        <View style={{ width: size, height: size, position: 'relative', alignItems: 'center' }}>
          {/* Light Slate Cloud */}
          <View style={{ position: 'absolute', top: 0 }}>
            <Cloud size={size * 0.75} color="#CBD5E1" fill="rgba(203, 213, 225, 0.25)" />
          </View>
          {/* Blue Droplets */}
          <View style={{ position: 'absolute', bottom: 2, flexDirection: 'row', gap: 3 }}>
            <Droplet size={size * 0.3} color="#3B82F6" fill="#3B82F6" />
            <Droplet size={size * 0.3} color="#3B82F6" fill="#3B82F6" />
          </View>
        </View>
      );

    case 'cloud-snow':
      return (
        <View style={{ width: size, height: size, position: 'relative', alignItems: 'center' }}>
          {/* Light Slate Cloud */}
          <View style={{ position: 'absolute', top: 0 }}>
            <Cloud size={size * 0.75} color="#CBD5E1" fill="rgba(203, 213, 225, 0.25)" />
          </View>
          {/* Cyan Snowflake */}
          <View style={{ position: 'absolute', bottom: 2 }}>
            <Snowflake size={size * 0.35} color="#38BDF8" />
          </View>
        </View>
      );

    case 'cloud-lightning':
      return (
        <View style={{ width: size, height: size, position: 'relative', alignItems: 'center' }}>
          {/* Storm Gray Cloud */}
          <View style={{ position: 'absolute', top: 0 }}>
            <Cloud size={size * 0.75} color="#94A3B8" fill="rgba(148, 163, 184, 0.3)" />
          </View>
          {/* Gold Lightning Bolt */}
          <View style={{ position: 'absolute', bottom: 0 }}>
            <Zap size={size * 0.38} color="#F59E0B" fill="#F59E0B" />
          </View>
        </View>
      );

    case 'fog':
    default:
      return <CloudFog size={size} color="#94A3B8" />;
  }
}
