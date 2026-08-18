import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform, Image } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { Search, Heart, Compass, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { useImmersiveProgress } from '@/context/MapImmersiveContext';
import { useAuth } from '@/context/AuthContext';

/** Hauteur de la rangée d'onglets, hors barre système. */
const TAB_BAR_BASE_HEIGHT = 56;

const TAB_ICONS = {
  index: Search,
  favorites: Heart,
  adventures: Compass,
  profile: UserRound,
};

function TabItem({
  isFocused,
  label,
  IconComponent,
  avatarUrl,
  activeColor,
  inactiveColor,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  label: string;
  IconComponent: any;
  avatarUrl?: string | null;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [focusAnim] = useState(() => new Animated.Value(isFocused ? 1 : 0));

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  const activeOpacity = focusAnim;
  const inactiveOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const textColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  const theme = Colors[useColorScheme() ?? 'light'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{
        color: theme.ripple,
        borderless: true,
      }}
      style={styles.tabItem}>
      <View style={styles.iconContainer}>
        {avatarUrl ? (
          <View
            style={[
              styles.avatarContainer,
              {
                borderColor: isFocused ? activeColor : 'transparent',
                borderWidth: isFocused ? 1.5 : 0,
              },
            ]}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          </View>
        ) : (
          <>
            {/* Inactive Icon */}
            <Animated.View style={{ position: 'absolute', opacity: inactiveOpacity }}>
              <IconComponent size={24} color={inactiveColor} strokeWidth={1.8} />
            </Animated.View>
            {/* Active Icon */}
            <Animated.View style={{ position: 'absolute', opacity: activeOpacity }}>
              <IconComponent size={24} color={activeColor} strokeWidth={2.2} />
            </Animated.View>
          </>
        )}
      </View>
      <Animated.Text
        style={[
          styles.tabLabel,
          {
            color: textColor,
            fontFamily: isFocused ? 'Satoshi-Bold' : 'Satoshi-Medium',
          },
        ]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/** Rembourrage bas de la barre, aligné sur la barre système du téléphone. */
function useTabBarBottomPadding() {
  const insets = useSafeAreaInsets();
  const rawBottom = insets.bottom || initialWindowMetrics?.insets.bottom || 0;
  const effectiveBottomInset = rawBottom > 0 ? rawBottom : Platform.OS === 'android' ? 48 : 24;

  return Platform.OS === 'ios'
    ? insets.bottom > 0
      ? Math.max(insets.bottom - 12, 8)
      : 8
    : effectiveBottomInset;
}

/**
 * Hauteur totale occupée par la barre d'onglets, barre système comprise.
 *
 * La barre flotte au-dessus des écrans (`position: 'absolute'`) : chaque écran
 * occupe donc toute la hauteur, et c'est à lui de réserver cette place en bas —
 * rembourrage de liste, décalage des boutons flottants, `bottomInset` de feuille.
 * En échange, escamoter la barre n'est plus qu'une translation : rien ne se
 * redimensionne, ni la carte ni les feuilles.
 */
export function useTabBarHeight() {
  return TAB_BAR_BASE_HEIGHT + useTabBarBottomPadding();
}

/**
 * Course du mobilier bas quand la carte passe en immersif.
 *
 * La barre d'onglets et la feuille repliée sont jointives : elles doivent glisser
 * de la même distance pour rester collées pendant tout le mouvement. C'est donc la
 * plus exigeante des deux qui commande — la feuille, dont la poignée dépasse de
 * 72 px au-dessus de la barre — avec une marge pour sortir aussi son ombre portée.
 */
export function useBottomChromeHideDistance() {
  return useTabBarHeight() + 72 + 24;
}

export default function TabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { searchQuery } = useAdventure();
  const { profile, user } = useAuth();
  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url;

  const bottomPadding = useTabBarBottomPadding();
  const barHeight = TAB_BAR_BASE_HEIGHT + bottomPadding;

  const immersiveProgress = useImmersiveProgress();
  const hideDistance = useBottomChromeHideDistance();

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: immersiveProgress.value * hideDistance }],
  }));

  return (
    <Reanimated.View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.borderLight,
          paddingBottom: bottomPadding,
          height: barHeight,
        },
        animatedContentStyle,
      ]}>
      {state.routes.map((route: any, index: number) => {
        if (route.name === 'results') {
          return null;
        }
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const currentRouteName = state.routes[state.index].name;
        const isFocused =
          state.index === index || (currentRouteName === 'results' && route.name === 'index');
        const IconComponent = TAB_ICONS[route.name as keyof typeof TAB_ICONS] || Compass;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            if (route.name === 'index') {
              if (currentRouteName === 'results') {
                // Do nothing, the user is already logically on the Explorer tab
              } else if (searchQuery && searchQuery.trim() !== '') {
                navigation.navigate('results');
              } else {
                navigation.navigate('index');
              }
            } else if (!isFocused) {
              navigation.navigate(route.name, route.params);
            }
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            isFocused={isFocused}
            label={label}
            IconComponent={IconComponent}
            avatarUrl={route.name === 'profile' ? avatarUrl : undefined}
            activeColor={theme.tint}
            inactiveColor={theme.tabIconDefault}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Medium',
    marginTop: 2,
  },
});
