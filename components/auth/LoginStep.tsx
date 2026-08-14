import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { showToast } from '@/utils/toast';
import { SocialIcon } from '@/components/SocialIcon';

interface LoginStepProps {
  email: string;
  password: string;
  setPassword: (password: string) => void;
  onLoginSubmit: () => void;
  onForgotPassword: () => void;
  onOAuth?: (provider: 'google' | 'apple' | 'facebook') => void;
  isLoading: boolean;
}

export function LoginStep({
  email,
  password,
  setPassword,
  onLoginSubmit,
  onForgotPassword,
  onOAuth,
  isLoading,
}: LoginStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.contentFlex}>
      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>
          Ravi de vous revoir !
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          Entrez votre mot de passe pour vous connecter à {email}.
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Input
          variant="outlined"
          label="Mot de passe"
          placeholder="Tapez votre mot de passe"
          value={password}
          onChangeText={setPassword}
          isPassword
          returnKeyType="done"
          onSubmitEditing={onLoginSubmit}
        />

        <Pressable
          onPress={onForgotPassword}
          android_ripple={{
            color: theme.ripple,
            borderless: true,
          }}
          style={{ alignSelf: 'flex-end', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
          <Text style={[styles.forgotPassLink, { color: theme.primary }]}>
            Mot de passe oublié ?
          </Text>
        </Pressable>

        <Button
          title="Se connecter"
          onPress={onLoginSubmit}
          loading={isLoading}
          disabled={!password.trim()}
          style={styles.actionBtn}
        />

        {onOAuth ? (
          <>
            {/* Divider: "ou" */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Social Auth Buttons */}
            <View style={styles.socialButtonsGroup}>
              {Platform.OS === 'ios' ? (
                <Button
                  title="Continuer avec Apple"
                  variant="social"
                  icon={<SocialIcon provider="apple" size={20} />}
                  onPress={() => onOAuth('apple')}
                />
              ) : null}
              <Button
                title="Continuer avec Google"
                variant="social"
                icon={<SocialIcon provider="google" size={20} />}
                onPress={() => onOAuth('google')}
              />
              <Button
                title="Continuer avec Facebook"
                variant="social"
                icon={<SocialIcon provider="facebook" size={20} />}
                onPress={() => onOAuth('facebook')}
              />
            </View>
          </>
        ) : null}
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
  forgotPassLink: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    alignSelf: 'flex-end',
    marginVertical: 4,
  },
  actionBtn: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  socialButtonsGroup: {
    gap: 12,
  },
});
