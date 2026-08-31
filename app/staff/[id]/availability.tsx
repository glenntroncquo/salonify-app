import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n from '@/lib/i18n';
import {
  ScheduleRule,
  createScheduleRule,
  deleteScheduleRule,
  fetchScheduleRules,
  parseTimeOfDay,
  updateScheduleRule,
} from '@/lib/api/staff';

// Displayed Monday-first for a natural work-week view; values are the
// day_of_week integers actually stored in the DB (0 = Sunday .. 6 = Saturday).
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

type DayState = {
  working: boolean;
  start: Date;
  end: Date;
  existingId: string | null;
  multiple: boolean;
};

function defaultDayState(): DayState {
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date();
  end.setHours(17, 0, 0, 0);
  return { working: false, start, end, existingId: null, multiple: false };
}

function timeAt(hours: number, minutes: number): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTimeLabel(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function StaffAvailabilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [days, setDays] = React.useState<Record<number, DayState>>(() => {
    const initial: Record<number, DayState> = {};
    DISPLAY_DAYS.forEach((day) => {
      initial[day] = defaultDayState();
    });
    return initial;
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const slots = await fetchScheduleRules(id, companyId);
      const byDay = new Map<number, ScheduleRule[]>();
      slots.forEach((slot) => {
        const list = byDay.get(slot.day_of_week) ?? [];
        list.push(slot);
        byDay.set(slot.day_of_week, list);
      });

      const next: Record<number, DayState> = {};
      DISPLAY_DAYS.forEach((day) => {
        const slotsForDay = byDay.get(day) ?? [];
        if (slotsForDay.length === 0) {
          next[day] = defaultDayState();
        } else if (slotsForDay.length === 1) {
          const slot = slotsForDay[0];
          const startTime = parseTimeOfDay(slot.start_time);
          const endTime = parseTimeOfDay(slot.end_time);
          next[day] = {
            working: true,
            start: timeAt(startTime.hours, startTime.minutes),
            end: timeAt(endTime.hours, endTime.minutes),
            existingId: slot.id,
            multiple: false,
          };
        } else {
          next[day] = { ...defaultDayState(), multiple: true };
        }
      });
      setDays(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoadAvailability'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!id || !companyId) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        DISPLAY_DAYS.map(async (day) => {
          const state = days[day];
          if (state.multiple) return;

          if (state.working && state.existingId) {
            await updateScheduleRule(
              state.existingId,
              state.start.getHours(),
              state.start.getMinutes(),
              state.end.getHours(),
              state.end.getMinutes()
            );
          } else if (state.working && !state.existingId) {
            await createScheduleRule(
              id,
              companyId,
              day,
              state.start.getHours(),
              state.start.getMinutes(),
              state.end.getHours(),
              state.end.getMinutes()
            );
          } else if (!state.working && state.existingId) {
            await deleteScheduleRule(state.existingId);
          }
        })
      );
      router.back();
    } catch {
      setError(t('staff.failedToSaveAvailability'));
    } finally {
      setSaving(false);
    }
  };

  const weekdaysLong = i18n.t('calendar.weekdaysLong', { returnObjects: true }) as string[];

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: t('staff.availability'),
        headerRight: () => (
          <HeaderButton onPress={handleSave} disabled={saving} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Text style={styles.saveText}>{t('client.save')}</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {DISPLAY_DAYS.map((day) => {
          const state = days[day];
          return (
            <View key={day} style={styles.dayRow}>
              <View style={styles.dayHeaderRow}>
                <Text style={styles.dayLabel}>{weekdaysLong[day]}</Text>
                {!state.multiple ? (
                  <Switch
                    value={state.working}
                    onValueChange={(value) =>
                      setDays((prev) => ({ ...prev, [day]: { ...prev[day], working: value } }))
                    }
                  />
                ) : null}
              </View>
              {state.multiple ? (
                <Text style={styles.multipleHint}>{t('staff.multipleSlots')}</Text>
              ) : state.working ? (
                <View style={styles.timeRow}>
                  <DateTimeField
                    value={state.start}
                    mode="time"
                    doneLabel={t('appointment.done')}
                    formatLabel={formatTimeLabel}
                    onChange={(next) => setDays((prev) => ({ ...prev, [day]: { ...prev[day], start: next } }))}
                  />
                  <Text style={styles.timeSeparator}>–</Text>
                  <DateTimeField
                    value={state.end}
                    mode="time"
                    doneLabel={t('appointment.done')}
                    formatLabel={formatTimeLabel}
                    onChange={(next) => setDays((prev) => ({ ...prev, [day]: { ...prev[day], end: next } }))}
                  />
                </View>
              ) : (
                <Text style={styles.dayOffText}>{t('staff.dayOff')}</Text>
              )}
            </View>
          );
        })}
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#20b87b',
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
    },
    dayRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 8,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dayLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    timeSeparator: {
      fontSize: 14,
      color: theme.muted,
    },
    dayOffText: {
      fontSize: 13,
      color: theme.muted,
    },
    multipleHint: {
      fontSize: 13,
      color: theme.muted,
      fontStyle: 'italic',
    },
  });
