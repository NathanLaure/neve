import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SearchInputProps extends TextInputProps {
  onClear?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

const SearchInput = forwardRef<TextInput, SearchInputProps>(
  (
    {
      value,
      onChangeText,
      placeholder = 'Rechercher…',
      onClear,
      containerStyle,
      inputStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChangeText) {
        onChangeText('');
      }
    };

    const hasValue = Boolean(value && value.length > 0);

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: isFocused ? theme.text : theme.border,
            borderWidth: isFocused ? 1.5 : 1,
          },
          containerStyle,
        ]}>
        <Search size={20} color={theme.text} style={styles.searchIcon} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, { color: theme.text }, inputStyle]}
          {...props}
        />
        {hasValue && (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            android_ripple={{
              color: theme.ripple,
              borderless: true,
            }}
            style={styles.clearBtn}>
            <X size={16} color={theme.text} />
          </Pressable>
        )}
      </View>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
});
