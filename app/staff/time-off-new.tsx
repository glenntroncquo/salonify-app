import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTimeOff } from '@/lib/api/staff';

function formatDateLabel(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeLabel(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function defaultDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function defaultEnd() {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

export default function StaffTimeOffNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [date, setDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState(defaultDate);
  const [endTime, setEndTime] = React.useState(defaultEnd);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    if (!staffId || !companyId || !locationId) {
      setError(t('calendar.noLocation'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTimeOff(
        staffId,
        companyId,
        date,
        startTime.getHours(),
        startTime.getMinutes(),
        endTime.getHours(),
        endTime.getMinutes(),
        locationId
      );
      router.back();
    } catch {
      setError(t('staff.failedToSaveTimeOff'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('staff.addTimeOff'),
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={handleSave} disabled={saving} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Text style={[styles.saveText, { color: theme.tint }]}>{t('client.save')}</Text>
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
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('staff.date')}</Text>
          <DateTimeField value={date} mode="date" doneLabel={t('appointment.done')} formatLabel={formatDateLabel} onChange={setDate} />
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('appointment.starts')}</Text>
          <DateTimeField
            value={startTime}
            mode="time"
            doneLabel={t('appointment.done')}
            formatLabel={formatTimeLabel}
            onChange={setStartTime}
          />
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('appointment.ends')}</Text>
          <DateTimeField value={endTime} mode="time" doneLabel={t('appointment.done')} formatLabel={formatTimeLabel} onChange={setEndTime} />
        </View>
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
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
