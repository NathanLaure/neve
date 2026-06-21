import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Search, Heart, Compass, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

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

  const bottomPadding = Platform.select({
    ios: insets.bottom > 0 ? insets.bottom - 12 : 8,
    android: 0,
    default: 0,
  }) ?? 0;
  const baseHeight = Platform.select({
    ios: 56,
    android: 56,
    default: 52,
  }) ?? 52;

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: bottomPadding,
          height: baseHeight + bottomPadding,
        },
      ]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;
        const IconComponent = TAB_ICONS[route.name as keyof typeof TAB_ICONS] || Compass;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
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
