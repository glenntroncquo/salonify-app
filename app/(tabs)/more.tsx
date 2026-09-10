import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AccountDeletionButton } from '@/components/account-deletion-button';
import { LegalLinkRows, useLegalUrls } from '@/components/legal-link-rows';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n, { SUPPORTED_LANGUAGES, SupportedLanguage, setLanguage } from '@/lib/i18n';
import { fetchOwnStaffProfile, StaffProfile } from '@/lib/api/profile';
import { getCompanyImageUrl } from '@/lib/storage';
import { getInitialsFromLabel } from '@/lib/text';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  nl: 'Nederlands',
  en: 'English',
  pt: 'Português',
};

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);
  const { user, companyId, signOut } = useAuth();
  const { privacyUrl, termsUrl } = useLegalUrls();
  const hasLegalLinks = Boolean(privacyUrl || termsUrl);
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [shouldCrash, setShouldCrash] = React.useState(false);

  if (__DEV__ && shouldCrash) {
    throw new Error('Sentry test render crash (__DEV__)');
  }

  const loadProfile = React.useCallback(async () => {
    if (!user || !companyId) {
      setProfileLoading(false);
      return;
    }
    try {
      const data = await fetchOwnStaffProfile(user.id, companyId);
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user, companyId]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const displayName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || user?.email || '';
  const avatarUrl = getCompanyImageUrl(profile?.image_path);

  return (
    <TabScreen>
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileSection}>
        {profileLoading ? (
          <View style={styles.avatar}>
            <ActivityIndicator color={theme.muted} />
          </View>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarInitials}>{getInitialsFromLabel(displayName)}</ThemedText>
          </View>
        )}
        {displayName ? <ThemedText style={styles.name}>{displayName}</ThemedText> : null}
        {user?.email && user.email !== displayName ? (
          <ThemedText style={styles.email}>{user.email}</ThemedText>
        ) : null}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.languageLabel}>{t('profile.language')}</ThemedText>
        <View style={styles.languageRow}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const isActive = i18n.language === language;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={language}
                style={[styles.languageChip, isActive && styles.languageChipActive]}
                onPress={() => setLanguage(language)}>
                <ThemedText
                  style={styles.languageChipText}
                  lightColor={isActive ? theme.onTint : undefined}
                  darkColor={isActive ? theme.onTint : undefined}>
                  {LANGUAGE_LABELS[language]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>{t('more.manage')}</ThemedText>
        <Pressable accessibilityRole="button" style={styles.manageRow} onPress={() => router.push('/staff')}>
          <AppIcon name="groups" size={21} color={theme.text} />
          <ThemedText style={styles.manageRowText}>{t('more.staff')}</ThemedText>
          <AppIcon name="chevronRight" size={15} color={theme.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.manageRow} onPress={() => router.push('/services')}>
          <AppIcon name="cut" size={21} color={theme.text} />
          <ThemedText style={styles.manageRowText}>{t('more.services')}</ThemedText>
          <AppIcon name="chevronRight" size={15} color={theme.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.manageRow} onPress={() => router.push('/orders')}>
          <AppIcon name="orders" size={21} color={theme.text} />
          <ThemedText style={styles.manageRowText}>{t('more.orders')}</ThemedText>
          <AppIcon name="chevronRight" size={15} color={theme.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.manageRow} onPress={() => router.push('/dashboard')}>
          <AppIcon name="dashboard" size={21} color={theme.text} />
          <ThemedText style={styles.manageRowText}>{t('more.dashboard')}</ThemedText>
          <AppIcon name="chevronRight" size={15} color={theme.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.manageRow} onPress={() => router.push('/settings')}>
          <AppIcon name="settings" size={21} color={theme.text} />
          <ThemedText style={styles.manageRowText}>{t('more.settings')}</ThemedText>
          <AppIcon name="chevronRight" size={15} color={theme.muted} />
        </Pressable>
      </View>

      {hasLegalLinks ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>{t('legal.section')}</ThemedText>
          <LegalLinkRows showIcons rowStyle={styles.manageRow} textStyle={styles.manageRowText} chevronColor={theme.muted} />
        </View>
      ) : null}

      <View style={styles.accountActions}>
        {__DEV__ ? (
          <Pressable style={styles.signOutButton} onPress={() => setShouldCrash(true)}>
            <ThemedText style={styles.signOutText} lightColor={Colors.light.error} darkColor={Colors.dark.error}>
              {t('errorBoundary.testCrash')}
            </ThemedText>
          </Pressable>
        ) : null}

        <AccountDeletionButton style={styles.signOutButton} />

        <Pressable style={styles.signOutButton} onPress={signOut}>
          <ThemedText style={styles.signOutText} lightColor={Colors.light.error} darkColor={Colors.dark.error}>
            {t('profile.signOut')}
          </ThemedText>
        </Pressable>
      </View>
      </ScrollView>
    </ThemedView>
    </TabScreen>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 24,
      paddingHorizontal: Design.screenPadding,
      gap: Design.sectionGap,
    },
    profileSection: {
      alignItems: 'center',
      gap: 6,
    },
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    avatarInitials: {
      fontSize: 23,
      fontWeight: '700',
      color: theme.muted,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
    },
    email: {
      fontSize: 14,
      opacity: 0.6,
    },
    section: {
      width: '100%',
      gap: 0,
    },
    languageLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 8,
      opacity: 0.6,
      textTransform: 'uppercase',
    },
    languageRow: {
      flexDirection: 'row',
      gap: 8,
    },
    languageChip: {
      minHeight: Design.touchTarget,
      justifyContent: 'center',
      flex: 1,
      paddingVertical: 10,
      borderRadius: Design.controlRadius,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    languageChipActive: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    languageChipText: {
      fontSize: 14,
      fontWeight: '600',
    },
    manageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    manageRowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '400',
    },
    accountActions: {
      marginTop: 'auto',
      alignItems: 'center',
      marginBottom: 24,
    },
    signOutButton: {
      paddingVertical: 12,
      paddingHorizontal: Design.screenPadding,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
