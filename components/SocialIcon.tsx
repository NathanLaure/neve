import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const APPLE_SVG = (color: string) => `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16.6192 0C16.6751 0 16.7309 0 16.7899 0C16.9269 1.69253 16.2809 2.95719 15.4958 3.87301C14.7254 4.78251 13.6704 5.6646 11.9642 5.53076C11.8504 3.86247 12.4975 2.69161 13.2816 1.77789C14.0087 0.92636 15.3419 0.168621 16.6192 0Z" fill="${color}"/>
  <path d="M21.7841 17.6164C21.7841 17.6332 21.7841 17.648 21.7841 17.6638C21.3046 19.1161 20.6206 20.3607 19.7859 21.5157C19.024 22.5643 18.0903 23.9755 16.423 23.9755C14.9824 23.9755 14.0254 23.0491 12.549 23.0238C10.9871 22.9985 10.1282 23.7984 8.70019 23.9997C8.53684 23.9997 8.37348 23.9997 8.21329 23.9997C7.16468 23.848 6.31842 23.0175 5.7019 22.2693C3.88396 20.0582 2.47914 17.2022 2.21777 13.5474C2.21777 13.189 2.21777 12.8318 2.21777 12.4735C2.32843 9.85772 3.59941 7.73099 5.28878 6.7003C6.18036 6.15228 7.40602 5.68541 8.7708 5.89408C9.3557 5.98471 9.95325 6.18495 10.477 6.38308C10.9734 6.57383 11.5941 6.91213 12.1822 6.89421C12.5806 6.88262 12.9768 6.67501 13.3784 6.52852C14.5545 6.1038 15.7074 5.61691 17.2271 5.8456C19.0535 6.12172 20.3498 6.93321 21.1507 8.18522C19.6057 9.16848 18.3843 10.6502 18.593 13.1806C18.7784 15.4791 20.1148 16.8239 21.7841 17.6164Z" fill="${color}"/>
</svg>
`;

const FACEBOOK_SVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 12C24 17.9897 19.6116 22.9542 13.875 23.8542V15.4688H16.6711L17.2031 12H13.875V9.74906C13.875 8.79984 14.34 7.875 15.8306 7.875H17.3438V4.92188C17.3438 4.92188 15.9703 4.6875 14.6573 4.6875C11.9166 4.6875 10.125 6.34875 10.125 9.35625V12H7.07812V15.4688H10.125V23.8542C4.38844 22.9542 0 17.9897 0 12C0 5.37281 5.37281 0 12 0C18.6272 0 24 5.37281 24 12Z" fill="#1877F2"/>
  <path d="M16.6711 15.4688L17.2031 12H13.875V9.74902C13.875 8.80003 14.3399 7.875 15.8306 7.875H17.3438V4.92188C17.3438 4.92188 15.9705 4.6875 14.6576 4.6875C11.9165 4.6875 10.125 6.34875 10.125 9.35625V12H7.07812V15.4688H10.125V23.8542C10.736 23.95 11.3621 24 12 24C12.6379 24 13.264 23.95 13.875 23.8542V15.4688H16.6711Z" fill="white"/>
</svg>
`;

export interface SocialIconProps {
  provider: 'apple' | 'google' | 'facebook';
  size?: number;
}

export function SocialIcon({ provider, size = 20 }: SocialIconProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  switch (provider) {
    case 'apple':
      return <SvgXml xml={APPLE_SVG(theme.text)} width={size} height={size} />;
    case 'facebook':
      return <SvgXml xml={FACEBOOK_SVG} width={size} height={size} />;
    case 'google':
    default:
      return (
        <Image
          source={require('@/assets/google.png')}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      );
  }
}
