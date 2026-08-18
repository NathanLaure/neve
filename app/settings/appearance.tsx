import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { setThemeOverride, useColorScheme, useThemeOverride } from '@/components/useColorScheme';
import SettingsPage from '@/components/profile/SettingsPage';
import ThemePreview, { ThemePreviewVariant } from '@/components/profile/ThemePreview';

/** `system` plutôt que `null` : une liste de choix n'a pas d'option « vide ». */
type AppearanceId = ThemePreviewVariant;

const APPEARANCE_OPTIONS: { id: AppearanceId; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'system', label: 'Suivre le thème du système' },
];

/**
 * « Apparence » — thème d'affichage de l'application.
 *
 * Le choix se fait sur des vignettes et non sur une liste : ce qu'on règle ici
 * est visuel, un intitulé le décrit toujours moins bien qu'un aperçu. Il
 * s'applique sans validation — la page bascule sous les yeux, ce qui vaut
 * confirmation.
 */
export default function AppearanceSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const value: AppearanceId = useThemeOverride() ?? 'system';

  return (
    <SettingsPage title="Apparence">
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Thème</Text>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = option.id === value;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setThemeOverride(option.id === 'system' ? null : option.id)}
                style={styles.option}>
                {/* Bordure toujours présente, transparente au repos : peinte
                    seulement à la sélection, elle décalerait les vignettes. */}
                <View
                  style={[
                    styles.previewFrame,
                    { borderColor: selected ? theme.primary : 'transparent' },
                  ]}>
                  <ThemePreview variant={option.id} />
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: selected ? theme.primary : theme.text,
                      fontFamily: selected ? 'Satoshi-Bold' : 'Satoshi-Medium',
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  groupTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    /* Les vignettes s'alignent par le haut : le libellé du mode système passe à
       deux lignes, et un alignement centré ferait remonter ses voisines. */
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  previewFrame: {
    padding: 4,
    borderWidth: 2,
    borderRadius: 18,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
