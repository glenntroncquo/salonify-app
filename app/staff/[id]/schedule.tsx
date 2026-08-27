import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { groupAppointmentsByDateKey } from '@/app/(tabs)/calendar/calendar-data';
import { addDays, getISOWeekNumber, getMonthShortLabel, getWeekStartMonday, getWeekdayLong, toDateKey } from '@/app/(tabs)/calendar/date-utils';
import { EventItem } from '@/app/(tabs)/calendar/types';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchStaffAppointments } from '@/lib/api/calendar';
import {
  AvailabilitySlot,
  UnavailabilityBlock,
  fetchRecurringAvailability,
  fetchUnavailability,
  parseNaiveTime,
} from '@/lib/api/staff';

function formatSlotRange(slot: AvailabilitySlot) {
  const start = parseNaiveTime(slot.start);
  const end = parseNaiveTime(slot.end);
  const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${fmt(start.hours, start.minutes)} – ${fmt(end.hours, end.minutes)}`;
}

function unavailabilityOverlapsDay(block: UnavailabilityBlock, day: Date) {
  if (!block.start || !block.end) return false;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return new Date(block.start) <= dayEnd && new Date(block.end) >= dayStart;
}

function formatTimeOfDay(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function StaffScheduleScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [weekOffset, setWeekOffset] = React.useState(0);
  const [availability, setAvailability] = React.useState<AvailabilitySlot[]>([]);
  const [unavailability, setUnavailability] = React.useState<UnavailabilityBlock[]>([]);
  const [eventsByDateKey, setEventsByDateKey] = React.useState<Record<string, EventItem[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const weekStart = React.useMemo(() => addDays(getWeekStartMonday(new Date()), weekOffset * 7), [weekOffset]);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekNumber = React.useMemo(() => getISOWeekNumber(weekStart), [weekStart]);

  const availabilityBySlotDay = React.useMemo(() => {
    const map = new Map<number, AvailabilitySlot[]>();
    availability.forEach((slot) => {
      const list = map.get(slot.day_of_week) ?? [];
      list.push(slot);
      map.set(slot.day_of_week, list);
    });
    return map;
  }, [availability]);

  React.useEffect(() => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchRecurringAvailability(id, companyId),
      fetchUnavailability(id, companyId),
      fetchStaffAppointments(id, companyId, weekStart, addDays(weekStart, 7)),
    ])
      .then(([availabilityData, unavailabilityData, appointments]) => {
        if (cancelled) return;
        setAvailability(availabilityData);
        setUnavailability(unavailabilityData);
        setEventsByDateKey(groupAppointmentsByDateKey(appointments, null));
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('staff.failedToLoadSchedule'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, companyId, weekStart, t]);

  const todayKey = toDateKey(new Date());

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: true, title: t('staff.schedule') }} />

      <View style={styles.weekNavRow}>
        <Pressable onPress={() => setWeekOffset((prev) => prev - 1)} hitSlop={8}>
          <AppIcon name="chevronLeft" size={24} color={theme.text} />
        </Pressable>
        <Pressable onPress={() => setWeekOffset(0)}>
          <Text style={styles.weekLabel}>{t('calendar.weekLabel', { number: weekNumber })}</Text>
        </Pressable>
        <Pressable onPress={() => setWeekOffset((prev) => prev + 1)} hitSlop={8}>
          <AppIcon name="chevronRight" size={24} color={theme.text} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {weekDays.map((day) => {
            const dateKey = toDateKey(day);
            const dayOfWeek = day.getDay();
            const slots = availabilityBySlotDay.get(dayOfWeek) ?? [];
            const absences = unavailability.filter((block) => unavailabilityOverlapsDay(block, day));
            const events = eventsByDateKey[dateKey] ?? [];
            const isToday = dateKey === todayKey;

            let availabilityLabel: string;
            if (slots.length === 0) {
              availabilityLabel = t('staff.dayOff');
            } else if (slots.length === 1) {
              availabilityLabel = formatSlotRange(slots[0]);
            } else {
              availabilityLabel = t('staff.multipleSlots');
            }

            return (
              <View key={dateKey} style={styles.dayCard}>
                <View style={styles.dayHeaderRow}>
                  <Text style={styles.dayHeaderTitle}>
                    {`${getWeekdayLong(day)} ${day.getDate()} ${getMonthShortLabel(day.getMonth())}`}
                  </Text>
                  {isToday ? <Text style={styles.todayBadge}>{t('calendar.today')}</Text> : null}
                </View>

                <View style={styles.metaRow}>
                  <AppIcon name="schedule" size={14} color={theme.muted} />
                  <Text style={styles.metaText}>{availabilityLabel}</Text>
                </View>

                {absences.map((block) => (
                  <View key={block.id} style={styles.absentRow}>
                    <AppIcon name="eventBusy" size={14} color={theme.error} />
                    <Text style={styles.absentText}>
                      {block.start && block.end
                        ? `${t('staff.absent')} · ${formatTimeOfDay(block.start)}–${formatTimeOfDay(block.end)}`
                        : t('staff.absent')}
                    </Text>
                  </View>
                ))}

                {events.length === 0 ? (
                  <Text style={styles.noAppointmentsText}>{t('calendar.noAppointmentsToday')}</Text>
                ) : (
                  events.map((event) => (
                    <View key={event.appointmentId} style={styles.appointmentRow}>
                      <View style={[styles.colorBar, { backgroundColor: event.color }]} />
                      <Text style={styles.appointmentTime}>{event.startTime}</Text>
                      <Text style={styles.appointmentLabel} numberOfLines={1}>
                        {event.label}
                      </Text>
                      <Text style={styles.appointmentClient} numberOfLines={1}>
                        {event.clientName}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
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
    weekNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    weekLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      minWidth: 100,
      textAlign: 'center',
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
      gap: 12,
    },
    dayCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dayHeaderTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      textTransform: 'capitalize',
    },
    todayBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: '#20b87b',
      textTransform: 'uppercase',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 13,
      color: theme.muted,
      fontWeight: '600',
    },
    absentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    absentText: {
      fontSize: 13,
      color: theme.error,
      fontWeight: '600',
    },
    noAppointmentsText: {
      fontSize: 13,
      color: theme.muted,
    },
    appointmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    colorBar: {
      width: 3,
      height: 20,
      borderRadius: 2,
    },
    appointmentTime: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
      width: 42,
    },
    appointmentLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    appointmentClient: {
      fontSize: 12,
      color: theme.muted,
      maxWidth: 100,
    },
  });
