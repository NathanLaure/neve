import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ViewStyle,
  Keyboard,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  error?: string;
}

export function Select({
  label,
  placeholder = 'Sélectionner...',
  value,
  options,
  onSelect,
  containerStyle,
  error,
}: SelectProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BaseBottomSheetModalRef>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const borderColor = error
    ? theme.statusTextError || '#E63946'
    : selectedOption
    ? theme.borderLight
    : theme.border;

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
          <View style={[styles.floatingLabelBadge, { backgroundColor: theme.background }]}>
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
      <BaseBottomSheetModal
        ref={bottomSheetRef}
        showHeader={false}
        enableDynamicSizing>
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isLast = idx === options.length - 1;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  bottomSheetRef.current?.dismiss();
                }}
                style={[
                  styles.optionItem,
                  isSelected && { backgroundColor: theme.primary + '15' },
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? theme.primary : theme.text },
                  ]}>
                  {option.label}
                </Text>
                {isSelected ? <Check size={18} color={theme.primary} /> : null}
              </Pressable>
            );
          })}
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
  modalContent: {
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  errorText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    marginTop: 2,
  },
});
