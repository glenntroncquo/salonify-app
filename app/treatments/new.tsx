import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import { createTreatment } from '@/lib/api/treatments';
import { COLOR_MAP, TREATMENT_COLORS, TreatmentColor } from '@/lib/treatment-colors';

export default function NewTreatmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState<string>(TREATMENT_COLORS[0]);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!companyId || !canSave) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const treatment = await createTreatment(companyId, { name: name.trim(), color, description: description.trim() });
      router.replace({ pathname: '/treatments/[id]', params: { id: treatment.id } });
    } catch {
      setErrorMessage(t('treatment.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="close" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('treatment.addNew')}</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
          {saving ? (
            <ActivityIndicator size="small" color="#1b1b1b" />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{t('client.save')}</Text>
          )}
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder={t('treatment.name')} value={name} onChangeText={setName} />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={t('treatment.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
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
              {color === option ? <MaterialIcons name="check" size={16} color="#ffffff" /> : null}
            </Pressable>
          ))}
        </View>
      </View>
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
    fontSize: 16,
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
  form: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b8b8b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1b1b1b',
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    borderColor: '#1b1b1b',
  },
});
