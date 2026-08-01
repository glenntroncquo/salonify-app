import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { useAuth } from '@/contexts/auth-context';
import i18n from '@/lib/i18n';
import {
  AvailabilitySlot,
  createRecurringAvailability,
  deleteAvailability,
  fetchRecurringAvailability,
  parseNaiveTime,
  updateRecurringAvailability,
} from '@/lib/api/staff';

// Displayed Monday-first for a natural work-week view; values are the
// day_of_week integers actually stored in the DB (0 = Sunday .. 6 = Saturday).
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

type DayState = {
  working: boolean;
  start: Date;
  end: Date;
  existingId: number | null;
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
      const slots = await fetchRecurringAvailability(id, companyId);
      const byDay = new Map<number, AvailabilitySlot[]>();
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
          const startTime = parseNaiveTime(slot.start);
          const endTime = parseNaiveTime(slot.end);
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
            await updateRecurringAvailability(
              state.existingId,
              state.start.getHours(),
              state.start.getMinutes(),
              state.end.getHours(),
              state.end.getMinutes()
            );
          } else if (state.working && !state.existingId) {
            await createRecurringAvailability(
              id,
              companyId,
              day,
              state.start.getHours(),
              state.start.getMinutes(),
              state.end.getHours(),
              state.end.getMinutes()
            );
          } else if (!state.working && state.existingId) {
            await deleteAvailability(state.existingId);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1b1b1b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('staff.availability')}</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          {saving ? (
            <ActivityIndicator size="small" color="#1b1b1b" />
          ) : (
            <Text style={styles.saveText}>{t('client.save')}</Text>
          )}
        </Pressable>
      </View>

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
    borderBottomColor: '#f0f0f0',
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
    color: '#1b1b1b',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeSeparator: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  dayOffText: {
    fontSize: 13,
    color: '#9a9a9a',
  },
  multipleHint: {
    fontSize: 13,
    color: '#9a9a9a',
    fontStyle: 'italic',
  },
});
