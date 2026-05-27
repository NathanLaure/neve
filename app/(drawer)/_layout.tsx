import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme, setThemeOverride, getThemeOverride } from '@/components/useColorScheme';
import { HeaderButton } from '../../components/HeaderButton';

// High-fidelity Custom Drawer Item component
interface CustomDrawerItemProps {
  label: string;
  focused: boolean;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
}

function CustomDrawerItem({ label, focused, icon, onPress }: CustomDrawerItemProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.customDrawerItem,
            {
              backgroundColor: focused ? theme.greenBadge : 'transparent',
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <View style={styles.customDrawerItemIconWrapper}>
            {icon(focused ? theme.tint : theme.textMuted)}
          </View>
          <Text
            style={[
              styles.customDrawerItemText,
              {
                color: focused ? theme.tint : theme.text,
                fontWeight: focused ? '700' : '600',
              },
            ]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// Custom drawer panel content component
function CustomDrawerContent(props: any) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  // Find exact active route name to avoid index shift bugs
  const activeRouteName = props.state?.routes?.[props.state.index]?.name;
  const isHomeFocused = activeRouteName === 'index';
  const isTabsFocused = activeRouteName === '(tabs)';

  return (
    <View style={[styles.drawerContainer, { backgroundColor: theme.background }]}>
      {/* Top Header Section with Safe Area top inset */}
      <View
        style={[
          styles.drawerHeader,
          {
            paddingTop: insets.top + 20,
            borderBottomColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}>
        <View style={styles.brandRow}>
          <View style={[styles.logoIcon, { backgroundColor: theme.greenBadge }]}>
            <Ionicons name="compass" size={24} color={theme.tint} />
          </View>
          <View style={styles.brandTextWrapper}>
            <Text style={[styles.logoText, { color: theme.text }]}>Névé</Text>
            <Text style={[styles.sloganText, { color: theme.textMuted }]}>
              {'Éco-Aventures en train'}
            </Text>
          </View>
        </View>
      </View>

      {/* Middle Scrollable Section for Navigation */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          <CustomDrawerItem
            label="Explorer les randos"
            focused={isHomeFocused}
            icon={(color) => <Ionicons name="compass-outline" size={20} color={color} />}
            onPress={() => props.navigation.navigate('index')}
          />
          <CustomDrawerItem
            label="Carnet de voyage"
            focused={isTabsFocused}
            icon={(color) => <Ionicons name="bookmark-outline" size={20} color={color} />}
            onPress={() => props.navigation.navigate('(tabs)')}
          />
        </View>
      </ScrollView>

      {/* Bottom Theme Switcher Section with Safe Area bottom inset */}
      <View
        style={[
          styles.themeSelectorContainer,
          {
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom + 16, 24),
            backgroundColor: theme.card,
          },
        ]}>
        <Text style={[styles.themeSelectorTitle, { color: theme.textMuted }]}>
          {"Mode d'affichage"}
        </Text>

        <View
          style={[
            styles.themeButtonsRow,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
          {[
            { key: 'light', icon: 'sunny-outline', label: 'Clair' },
            { key: 'dark', icon: 'moon-outline', label: 'Sombre' },
            { key: 'system', icon: 'contrast-outline', label: 'Auto' },
          ].map((item) => {
            // Check active theme state
            const isSelected =
              item.key === 'system' ? getThemeOverride() === null : getThemeOverride() === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setThemeOverride(item.key === 'system' ? null : (item.key as any))}
                style={({ pressed }) => [
                  styles.themePill,
                  {
                    backgroundColor: isSelected ? theme.card : 'transparent',
                    borderColor: isSelected ? theme.border : 'transparent',
                    borderWidth: 1,
                    shadowColor: isSelected && colorScheme !== 'dark' ? '#000' : 'transparent',
                    shadowOffset: isSelected ? { width: 0, height: 2 } : { width: 0, height: 0 },
                    shadowOpacity: isSelected ? 0.08 : 0,
                    shadowRadius: isSelected ? 4 : 0,
                    elevation: isSelected ? 1 : 0,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <Ionicons
                  name={item.icon as any}
                  size={15}
                  color={isSelected ? theme.tint : theme.textMuted}
                />
                <Text
                  style={[
                    styles.themePillText,
                    {
                      color: isSelected ? theme.text : theme.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const DrawerLayout = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: theme.tint,
        drawerInactiveTintColor: theme.textMuted,
        drawerStyle: {
          backgroundColor: theme.background,
          width: 285,
        },
        drawerLabelStyle: {
          fontWeight: '700',
          fontSize: 15,
        },
        headerStyle: {
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}>
      <Drawer.Screen
        name="index"
        options={{
          headerShown: false,
          drawerLabel: 'Explorer les randos',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: 'Carnet de voyage',
          drawerLabel: 'Carnet de voyage',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <HeaderButton />
            </Link>
          ),
        }}
      />
    </Drawer>
  );
};

export default DrawerLayout;

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  drawerHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoIcon: {
    height: 46,
    width: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F5F3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTextWrapper: {
    justifyContent: 'center',
    gap: 2,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  sloganText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingTop: 16,
    gap: 4,
  },
  customDrawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    height: 48,
    gap: 14,
  },
  customDrawerItemIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  customDrawerItemText: {
    fontSize: 15,
  },
  themeSelectorContainer: {
    paddingHorizontal: 14,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  themeSelectorTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  themeButtonsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themePillText: {
    fontSize: 12,
  },
});
