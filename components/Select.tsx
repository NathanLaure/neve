import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ViewStyle,
  Keyboard,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import ChoiceChip from '@/components/ChoiceChip';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  containerStyle?: ViewStyle;
  /**
   * Fond du badge de label flottant. Il doit reprendre celui de la surface qui
   * porte le champ, puisqu'il vient masquer la bordure derrière lui : blanc sur
   * une carte, gris sur un encart. Par défaut, la couleur de carte.
   */
  labelBackgroundColor?: string;
  /** Titre de la feuille de choix. Reprend `label` s'il n'est pas fourni. */
  sheetTitle?: string;
  error?: string;
}

export function Select({
  label,
  placeholder = 'Sélectionner...',
  value,
  options,
  onSelect,
  containerStyle,
  labelBackgroundColor,
  sheetTitle,
  error,
}: SelectProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const bottomSheetRef = useRef<BaseBottomSheetModalRef>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const borderColor = error
    ? theme.statusTextError || '#E63946'
    : selectedOption
    ? theme.borderStrong
    : theme.borderStrong;

  const labelColor = error
    ? theme.statusTextError || '#E63946'
    : selectedOption
    ? theme.text
    : theme.textMuted;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Trigger Box */}
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          bottomSheetRef.current?.present();
        }}
        style={[
          styles.inputContainer,
          {
            backgroundColor: 'transparent',
            borderColor,
            borderWidth: 1.5,
          },
        ]}>
        {label ? (
          <View
            style={[
              styles.floatingLabelBadge,
              { backgroundColor: labelBackgroundColor ?? theme.card },
            ]}>
            <Text
              style={[
                styles.floatingLabelText,
                {
                  color: labelColor,
                  fontFamily: selectedOption ? 'Satoshi-Bold' : 'Satoshi-Medium',
                },
              ]}>
              {label}
            </Text>
          </View>
        ) : null}

        <Text
          style={[
            styles.valueText,
            { color: selectedOption ? theme.text : theme.textMuted },
          ]}
          numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>

        <ChevronDown size={20} color={theme.textMuted} />
      </Pressable>

      {/* Bottom Sheet Options Modal */}
      {/* `push` : le Select peut vivre dans une feuille (voir PassengersBottomSheet).
          Sans ça, gorhom remplacerait la feuille parente au lieu de s'empiler dessus. */}
      <BaseBottomSheetModal
        ref={bottomSheetRef}
        title={sheetTitle ?? label}
        stackBehavior="push"
        enableDynamicSizing>
        <View style={styles.optionList}>
          {options.map((option) => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              selected={option.value === value}
              onPress={() => {
                onSelect(option.value);
                bottomSheetRef.current?.dismiss();
              }}
            />
          ))}
        </View>
      </BaseBottomSheetModal>

      {error ? (
        <Text style={[styles.errorText, { color: theme.statusTextError || '#E63946' }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
    width: '100%',
    marginVertical: 4,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
  },
  floatingLabelBadge: {
    position: 'absolute',
    left: 12,
    top: -10,
    paddingHorizontal: 6,
    zIndex: 10,
  },
  floatingLabelText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 14,
  },
  valueText: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  optionList: {
    gap: 12,
  },
  errorText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    marginTop: 2,
  },
});
