import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Button } from '@/components/Button';

interface VerifyEmailStepProps {
  email: string;
  onCheckConfirmation: () => void;
  onResendEmail: () => void;
  onChangeEmail: () => void;
  isCheckingConfirmation: boolean;
  isResendingEmail: boolean;
}

export function VerifyEmailStep({
  email,
  onCheckConfirmation,
  onResendEmail,
  onChangeEmail,
  isCheckingConfirmation,
  isResendingEmail,
}: VerifyEmailStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [cooldown, setCooldown] = useState(45);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = () => {
    onResendEmail();
    setCooldown(60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.contentFlex}>
      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>
          Vérifiez votre boite mail
        </Text>

        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          Un e-mail de confirmation vient d’être envoyé à{' '}
          <Text style={[styles.emailText, { color: theme.text }]}>{email}</Text>.{'\n'}
          Cliquez sur le lien reçu pour continuer la création de votre compte Névé.
        </Text>

        <View style={styles.resendSection}>
          <Text style={[styles.resendQuestion, { color: theme.textMuted }]}>
            Le mail n’est pas arrivé?
          </Text>

          <Button
            title="Renvoyer l’e-mail"
            variant="transparent"
            icon={<RotateCcw size={18} color={theme.buttonIconColor} />}
            onPress={handleResend}
            disabled={cooldown > 0 || isResendingEmail}
            loading={isResendingEmail}
            style={styles.resendBtn}
          />

          {cooldown > 0 ? (
            <Text style={[styles.cooldownText, { color: theme.textMuted }]}>
              Vous pouvez en renvoyer un dans {formatTime(cooldown)}.
            </Text>
          ) : null}
        </View>
      </View>

      {/* Bottom Sticky Action Block */}
      <View style={styles.bottomStickyBlock}>
        <Button
          variant="primary"
          title="J’ai confirmé mon e-mail"
          onPress={onCheckConfirmation}
          loading={isCheckingConfirmation}
        />

        <Button
          variant="transparent"
          title="Modifier l’adresse e-mail"
          onPress={onChangeEmail}
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
    gap: 16,
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
  emailText: {
    fontFamily: 'Satoshi-Bold',
  },
  resendSection: {
    marginTop: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  resendQuestion: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  resendBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
  cooldownText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    marginTop: 4,
  },
  bottomStickyBlock: {
    marginTop: 'auto',
    gap: 12,
    paddingTop: 12,
  },
});
