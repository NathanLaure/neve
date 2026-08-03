import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function CustomToastView({
  text1,
  text2,
  type = 'info',
}: BaseToastProps & { type?: 'success' | 'error' | 'info' }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  let borderColor = theme.border;
  let icon = <Info size={20} color={theme.primary} />;

  if (type === 'success') {
    borderColor = theme.statusBgSuccess;
    icon = <CheckCircle2 size={20} color={theme.statusBgSuccess} />;
  } else if (type === 'error') {
    borderColor = theme.statusBgError;
    icon = <AlertCircle size={20} color={theme.statusBgError} />;
  }

  return (
    <View
      style={[
        styles.toastContainer,
        {
          backgroundColor: theme.card,
          borderColor: borderColor,
          shadowColor: theme.text,
        },
      ]}>
      <View style={styles.iconWrapper}>{icon}</View>
      <View style={styles.textWrapper}>
        {text1 ? (
          <Text style={[styles.title, { color: theme.text }]}>{text1}</Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: theme.textMuted }]}>{text2}</Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <CustomToastView {...props} type="success" />,
  error: (props: BaseToastProps) => <CustomToastView {...props} type="error" />,
  info: (props: BaseToastProps) => <CustomToastView {...props} type="info" />,
};

const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginHorizontal: 16,
  },
  iconWrapper: {
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  message: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
