import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createServiceVariant, updateServiceVariant } from '@/lib/api/services';

export default function PriceOptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    treatmentId: string;
    optionId?: string;
    name?: string;
    price?: string;
    duration?: string;
  }>();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const isEditing = Boolean(params.optionId);
  const [poName, setPoName] = React.useState(params.name ?? '');
  const [poPrice, setPoPrice] = React.useState(params.price ?? '');
  const [poDuration, setPoDuration] = React.useState(params.duration ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSave = poName.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!params.treatmentId || !companyId || !poName.trim()) return;
    const price = Number(poPrice);
    const duration = Number(poDuration);
    if (!Number.isFinite(price) || !Number.isFinite(duration)) {
      setError(t('service.failedToSaveOption'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (params.optionId) {
        await updateServiceVariant(params.optionId, companyId, { name: poName.trim(), price, durationInMinutes: duration });
      } else {
        await createServiceVariant(params.treatmentId, companyId, { name: poName.trim(), price, durationInMinutes: duration });
      }
      router.back();
    } catch {
      setError(t('service.failedToSaveOption'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEditing ? t('service.editVariant') : t('service.addVariant'),
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={handleSave} disabled={!canSave} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Text style={[styles.saveText, { color: canSave ? theme.tint : theme.muted }]}>{t('client.save')}</Text>
              )}
            </HeaderButton>
          ),
        }}
      />

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: `${theme.error}22` }]}>
          <Text style={[styles.errorBannerText, { color: theme.error }]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder={t('service.optionName')}
          placeholderTextColor={theme.muted}
          value={poName}
          onChangeText={setPoName}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder={t('service.price')}
          placeholderTextColor={theme.muted}
          value={poPrice}
          onChangeText={setPoPrice}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder={t('service.durationMinutes')}
          placeholderTextColor={theme.muted}
          value={poDuration}
          onChangeText={setPoDuration}
          keyboardType="number-pad"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
});
