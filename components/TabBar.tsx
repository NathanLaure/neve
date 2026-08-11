import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Search, Heart, Compass, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';

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
  activeColor,
  inactiveColor,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  label: string;
  IconComponent: any;
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}>
      <View style={styles.iconContainer}>
        {/* Inactive Icon */}
        <Animated.View style={{ position: 'absolute', opacity: inactiveOpacity }}>
          <IconComponent size={24} color={inactiveColor} strokeWidth={1.8} />
        </Animated.View>
        {/* Active Icon */}
        <Animated.View style={{ position: 'absolute', opacity: activeOpacity }}>
          <IconComponent size={24} color={activeColor} strokeWidth={2.2} />
        </Animated.View>
      </View>
      <Animated.Text
        style={[
          styles.tabLabel,
          {
            color: textColor,
          },
        ]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { searchQuery } = useAdventure();

  const rawBottom = insets.bottom || initialWindowMetrics?.insets.bottom || 0;
  const effectiveBottomInset =
    rawBottom > 0 ? rawBottom : Platform.OS === 'android' ? 48 : 24;

  const bottomPadding =
    Platform.OS === 'ios'
      ? (insets.bottom > 0 ? Math.max(insets.bottom - 12, 8) : 8)
      : effectiveBottomInset;
  const baseHeight = 56;

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.borderLight,
          paddingBottom: bottomPadding,
          height: baseHeight + bottomPadding,
        },
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
          state.index === index ||
          (currentRouteName === 'results' && route.name === 'index');
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
            activeColor={theme.tint}
            inactiveColor={theme.tabIconDefault}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
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
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Medium',
    marginTop: 2,
  },
});
