import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
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
  const { user, companyId, signOut } = useAuth();
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);

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
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileSection}>
        {profileLoading ? (
          <View style={styles.avatar}>
            <ActivityIndicator color="#8b8b8b" />
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
        <ThemedText style={styles.sectionLabel}>{t('profile.language')}</ThemedText>
        <View style={styles.languageRow}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const isActive = i18n.language === language;
            return (
              <Pressable
                key={language}
                style={[styles.languageChip, isActive && styles.languageChipActive]}
                onPress={() => setLanguage(language)}>
                <ThemedText
                  style={styles.languageChipText}
                  lightColor={isActive ? '#ffffff' : undefined}
                  darkColor={isActive ? '#ffffff' : undefined}>
                  {LANGUAGE_LABELS[language]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>{t('more.manage')}</ThemedText>
        <Pressable style={styles.manageRow} onPress={() => router.push('/staff')}>
          <ThemedText style={styles.manageRowText}>{t('more.staff')}</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#c6c6c6" />
        </Pressable>
        <Pressable style={styles.manageRow} onPress={() => router.push('/treatments')}>
          <ThemedText style={styles.manageRowText}>{t('more.treatments')}</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#c6c6c6" />
        </Pressable>
        <Pressable style={styles.manageRow} onPress={() => router.push('/orders')}>
          <ThemedText style={styles.manageRowText}>{t('more.orders')}</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#c6c6c6" />
        </Pressable>
        <Pressable style={styles.manageRow} onPress={() => router.push('/dashboard')}>
          <ThemedText style={styles.manageRowText}>{t('more.dashboard')}</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#c6c6c6" />
        </Pressable>
        <Pressable style={styles.manageRow} onPress={() => router.push('/settings')}>
          <ThemedText style={styles.manageRowText}>{t('more.settings')}</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#c6c6c6" />
        </Pressable>
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <ThemedText style={styles.signOutText} lightColor="#e5484d" darkColor="#e5484d">
          {t('profile.signOut')}
        </ThemedText>
      </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 40,
  },
  profileSection: {
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#d8cfc6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4a4a4a',
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
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    alignItems: 'center',
  },
  languageChipActive: {
    backgroundColor: '#20b87b',
    borderColor: '#20b87b',
  },
  languageChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e7e7',
  },
  manageRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
