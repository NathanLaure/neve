import React, { useRef } from 'react';
import { StyleSheet, Text, View, Linking, TextInput, Keyboard } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Button } from '@/components/Button';

interface SignupProfileStepProps {
  firstName: string;
  setFirstName: (name: string) => void;
  lastName: string;
  setLastName: (name: string) => void;
  gender: string;
  setGender: (gender: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const GENDER_OPTIONS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
  { value: 'unspecified', label: 'Ne souhaite pas préciser' },
];

export function SignupProfileStep({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  gender,
  setGender,
  onSubmit,
  isLoading,
}: SignupProfileStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const lastNameRef = useRef<TextInput>(null);

  return (
    <View style={styles.contentFlex}>
      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>
          Parlez-nous un peu de vous
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          Ces informations nous permettent de personnaliser votre expérience d&apos;aventure Névé.
        </Text>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.inlineInputsRow}>
          <Input
            variant="outlined"
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            containerStyle={{ flex: 1 }}
          />
          <Input
            ref={lastNameRef}
            variant="outlined"
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
            containerStyle={{ flex: 1 }}
          />
        </View>

        {/* Gender Dropdown Select */}
        <Select
          label="Genre (Optionnel)"
          placeholder="Sélectionnez votre genre"
          value={gender}
          options={GENDER_OPTIONS}
          onSelect={setGender}
        />
      </View>

      {/* Bottom Sticky Action Block */}
      <View style={styles.bottomStickyBlock}>
        <View style={styles.footerLegal}>
          <Text style={[styles.legalText, { color: theme.textMuted }]}>
            En continuant, vous acceptez nos{' '}
            <Text
              onPress={() => Linking.openURL('https://neve-rando.fr/terms')}
              style={[styles.legalLink, { color: theme.text }]}>
              Conditions d’utilisation
            </Text>{' '}
            et notre{' '}
            <Text
              onPress={() => Linking.openURL('https://neve-rando.fr/privacy')}
              style={[styles.legalLink, { color: theme.text }]}>
              Politique de confidentialité
            </Text>
            .
          </Text>
        </View>
        <Button
          variant="primary"
          title="Créer mon compte"
          onPress={onSubmit}
          loading={isLoading}
          disabled={!firstName.trim() || !lastName.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 20,
  },
  headerTextGroup: {
    gap: 10,
    marginVertical: 8,
  },
  headingTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 26,
    lineHeight: 32,
  },
  headingSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  formGroup: {
    gap: 14,
    marginVertical: 8,
  },
  inlineInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomStickyBlock: {
    marginTop: 'auto',
    gap: 8,
    paddingTop: 8,
  },
  footerLegal: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  legalText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLink: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
});
