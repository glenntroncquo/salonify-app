import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/api/clients';

export default function NewClientScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canSave = firstName.trim().length > 0 && email.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!companyId || !canSave) {
      setErrorMessage(t('client.validationRequired'));
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const client = await createClient(companyId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      router.replace({ pathname: '/client/[id]', params: { id: client.id } });
    } catch {
      setErrorMessage(t('client.failedToSave'));
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
        <Text style={styles.headerTitle}>{t('client.addNew')}</Text>
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
        <TextInput
          style={styles.input}
          placeholder={t('client.firstName')}
          placeholderTextColor="#9a9a9a"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('client.lastName')}
          placeholderTextColor="#9a9a9a"
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('client.email')}
          placeholderTextColor="#9a9a9a"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={t('client.phone')}
          placeholderTextColor="#9a9a9a"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
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
});
