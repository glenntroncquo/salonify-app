import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { SwipeableRow } from '@/components/swipeable-row';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ManagedTreatment, PriceOption, deletePriceOption, fetchTreatment, updateTreatment } from '@/lib/api/treatments';
import { COLOR_MAP, TREATMENT_COLORS, TreatmentColor } from '@/lib/treatment-colors';

export default function TreatmentDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [treatment, setTreatment] = React.useState<ManagedTreatment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState<string>(TREATMENT_COLORS[0]);
  const [isActive, setIsActive] = React.useState(true);

  const [priceOptions, setPriceOptions] = React.useState<PriceOption[]>([]);

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchTreatment(id);
      setTreatment(data);
      if (data) {
        setName(data.name);
        setDescription(data.description ?? '');
        setColor(data.color ?? TREATMENT_COLORS[0]);
        setIsActive(Boolean(data.is_active));
        setPriceOptions(data.price_option ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('treatment.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    try {
      await updateTreatment(id, { name: name.trim(), description, color, isActive });
      router.back();
    } catch {
      setError(t('treatment.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const openAddOption = () => {
    router.push({ pathname: '/treatments/price-option', params: { treatmentId: id } });
  };

  const openEditOption = (option: PriceOption) => {
    router.push({
      pathname: '/treatments/price-option',
      params: {
        treatmentId: id,
        optionId: option.id,
        name: option.name,
        price: String(option.price),
        duration: String(option.duration_in_minutes),
      },
    });
  };

  const handleDeleteOption = async (option: PriceOption) => {
    try {
      await deletePriceOption(option.id);
      setPriceOptions((prev) => prev.filter((item) => item.id !== option.id));
    } catch {
      setError(t('treatment.failedToDeleteOption'));
    }
  };

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: treatment?.name || t('treatment.title'),
        headerRight: () => (
          <HeaderButton onPress={handleSave} disabled={saving || !name.trim()} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>{t('client.save')}</Text>
            )}
          </HeaderButton>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {screenOptions}
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      {screenOptions}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('treatment.name')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('treatment.name')} />

          <Text style={styles.sectionLabel}>{t('treatment.description')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('treatment.descriptionPlaceholder')}
            multiline
          />

          <Text style={styles.sectionLabel}>{t('treatment.color')}</Text>
          <View style={styles.colorRow}>
            {TREATMENT_COLORS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: COLOR_MAP[option as TreatmentColor] },
                  color === option && styles.colorSwatchSelected,
                ]}
                onPress={() => setColor(option)}>
                {color === option ? <AppIcon name="check" size={16} color="#ffffff" /> : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.activeRow}>
            <Text style={styles.sectionLabel}>{t('treatment.active')}</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('treatment.priceOptions')}</Text>
          {priceOptions.length === 0 ? (
            <Text style={styles.emptyText}>{t('treatment.noPriceOptions')}</Text>
          ) : (
            priceOptions.map((option) => (
              <SwipeableRow key={option.id} onDelete={() => handleDeleteOption(option)} deleteLabel={t('common.delete')}>
                <Pressable style={styles.optionRow} onPress={() => openEditOption(option)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>{option.name}</Text>
                    <Text style={styles.optionSubtitle}>
                      {`${option.duration_in_minutes} ${t('appointment.minutesShort')} · €${option.price}`}
                    </Text>
                  </View>
                </Pressable>
              </SwipeableRow>
            ))
          )}
          <Pressable style={{ marginTop: 8 }} onPress={openAddOption}>
            <Text style={styles.addLink}>{t('treatment.addPriceOption')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#20b87b',
    },
    saveTextDisabled: {
      color: theme.muted,
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
      color: theme.muted,
      textTransform: 'uppercase',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
      marginBottom: 8,
    },
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 8,
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSwatchSelected: {
      borderWidth: 2,
      borderColor: theme.text,
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
    },
    addLink: {
      fontSize: 14,
      fontWeight: '600',
      color: '#20b87b',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    optionName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    optionSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
  });
