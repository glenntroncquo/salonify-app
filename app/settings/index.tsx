import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import { ThemePreference, useThemePreference } from '@/contexts/theme-context';
import { fetchCompany, updateCompany } from '@/lib/api/company';

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { preference, setPreference } = useThemePreference();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [city, setCity] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [state, setState] = React.useState('');
  const [country, setCountry] = React.useState('');

  React.useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchCompany(companyId)
      .then((data) => {
        if (data) {
          setName(data.name ?? '');
          setEmail(data.email ?? '');
          setDescription(data.description ?? '');
          setStreet(data.street ?? '');
          setCity(data.city ?? '');
          setPostalCode(data.postal_code ?? '');
          setState(data.state ?? '');
          setCountry(data.country ?? '');
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('settings.failedToLoad')))
      .finally(() => setLoading(false));
  }, [companyId, t]);

  const handleSave = async () => {
    if (!companyId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateCompany(companyId, {
        name: name.trim(),
        email: email.trim(),
        description: description.trim(),
        street: street.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        state: state.trim(),
        country: country.trim(),
      });
      router.back();
    } catch {
      setError(t('settings.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        {!showNoCompanyState ? (
          <Pressable onPress={handleSave} disabled={saving || !name.trim()} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color="#1b1b1b" />
            ) : (
              <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>{t('client.save')}</Text>
            )}
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1b1b1b" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!showNoCompanyState ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.company')}</Text>
              <TextInput style={styles.input} placeholder={t('settings.name')} value={name} onChangeText={setName} />
              <TextInput
                style={styles.input}
                placeholder={t('client.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder={t('settings.description')}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <TextInput style={styles.input} placeholder={t('settings.street')} value={street} onChangeText={setStreet} />
              <TextInput style={styles.input} placeholder={t('settings.city')} value={city} onChangeText={setCity} />
              <TextInput
                style={styles.input}
                placeholder={t('settings.postalCode')}
                value={postalCode}
                onChangeText={setPostalCode}
              />
              <TextInput style={styles.input} placeholder={t('settings.state')} value={state} onChangeText={setState} />
              <TextInput style={styles.input} placeholder={t('settings.country')} value={country} onChangeText={setCountry} />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings.appearance')}</Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => {
                const isActive = preference === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.themeChip, isActive && styles.themeChipActive]}
                    onPress={() => setPreference(option)}>
                    <Text style={[styles.themeChipText, isActive && styles.themeChipTextActive]}>
                      {t(`settings.theme.${option}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20b87b',
  },
  saveTextDisabled: {
    color: '#c6c6c6',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
  },
  errorBannerText: {
    color: '#881337',
    fontSize: 13,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b8b8b',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1b1b1b',
    marginBottom: 8,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    alignItems: 'center',
  },
  themeChipActive: {
    backgroundColor: '#1b1b1b',
    borderColor: '#1b1b1b',
  },
  themeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  themeChipTextActive: {
    color: '#ffffff',
  },
});
