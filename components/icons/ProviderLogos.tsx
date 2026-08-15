import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface ProviderLogoProps {
  size?: number;
}

/** Logo officiel Île-de-France Mobilités */
export function IdfmLogo({ size = 32 }: ProviderLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('@/assets/idfm/idfmobilites_logo.jpg')}
        style={{ width: size, height: size, borderRadius: 4 }}
        resizeMode="cover"
      />
    </View>
  );
}

/** Logo officiel Trainline (Seeklogo officiel Figma) */
export function TrainlineLogo({ size = 32 }: ProviderLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: '#00A88F' }]}>
      <Svg width={size * 0.85} height={size * 0.72} viewBox="0 0 28.1867 23.1233" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.7867 2.08333C18.6667 -0.69 23.2533 -0.69 26.0267 2.08333C28.9067 4.85667 28.9067 9.55 26.0267 12.3233L16.1067 22.2433C14.9333 23.4167 13.12 23.4167 12.0533 22.2433L24 10.2967C24.8533 9.44333 25.28 8.37667 25.28 7.20333C25.28 6.03 24.8533 4.96333 24 4.11C22.2933 2.40333 19.52 2.40333 17.8133 4.11L9.92 12.0033L6.18667 8.27C5.65333 7.73667 5.65333 6.77667 6.18667 6.24333C6.72 5.71 7.68 5.71 8.21333 6.24333L9.92 7.95L15.7867 2.08333ZM2.13333 2.08333C4.8 -0.583334 9.17333 -0.69 12.0533 1.76333L9.92 3.89667C8.21333 2.51 5.65333 2.61667 4.16 4.21667C2.45333 5.92333 2.45333 8.69667 4.16 10.4033L10.0267 16.1633L19.9467 6.24333C20.48 5.71 21.44 5.71 21.9733 6.24333C22.5067 6.77667 22.5067 7.73667 21.9733 8.27L10.0267 20.2167L2.13333 12.3233C0.746667 10.9367 0 9.12333 0 7.20333C0 5.28333 0.746667 3.47 2.13333 2.08333Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

/** Logo officiel SNCF Connect */
export function SncfConnectLogo({ size = 32 }: ProviderLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: '#0C1B2A' }]}>
      <Image
        source={require('@/assets/sncf_connect_logo.png')}
        style={{ width: size, height: size, borderRadius: 4 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
