import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StaffAvatar } from '@/components/staff-avatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchAppointmentsForMonth, fetchStaff } from '@/lib/api/calendar';

import { groupAppointmentsByDateKey } from '../(tabs)/calendar/calendar-data';
import { getFullDateLabel, getISOWeekNumber } from '../(tabs)/calendar/date-utils';
import { EventItem } from '../(tabs)/calendar/types';

export default function DayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { date, staffId: staffIdParam } = useLocalSearchParams<{ date: string; staffId?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [staffImageById, setStaffImageById] = React.useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!date || !companyId || !locationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const target = new Date(date);
    const [appointments, staff] = await Promise.all([
      fetchAppointmentsForMonth(companyId, locationId, target.getFullYear(), target.getMonth()),
      fetchStaff(companyId, locationId),
    ]);
    const byDateKey = groupAppointmentsByDateKey(appointments, staffIdParam || null);
    setEvents(byDateKey[date] ?? []);
    setStaffImageById(new Map(staff.map((member) => [member.id, member.image_path])));
    setLoading(false);
  }, [date, companyId, locationId, staffIdParam]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('calendarRefreshAppointments', load);
    return () => subscription.remove();
  }, [load]);

  const weekNumber = date ? getISOWeekNumber(new Date(date)) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {date ? getFullDateLabel(date) : ''}
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>{t('calendar.weekLabel', { number: weekNumber })}</Text>
            </View>
          ),
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={() => router.push({ pathname: '/appointment-new', params: { date } })} hitSlop={8}>
              <AppIcon name="add" size={24} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.muted} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {events.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.muted }]}>{t('calendar.noAppointmentsToday')}</Text>
          ) : (
            events.map((event) => (
              <Pressable
                key={event.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })}>
                <View style={[styles.colorBar, { backgroundColor: event.color }]} />
                <View style={styles.rowTimeCol}>
                  <Text style={[styles.time, { color: theme.text }]}>{event.startTime}</Text>
                  <Text style={[styles.timeMuted, { color: theme.muted }]}>{event.endTime}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventText, { color: theme.text }]} numberOfLines={1}>
                    {event.label}
                  </Text>
                  <Text style={[styles.eventSubtitle, { color: theme.muted }]} numberOfLines={1}>
                    {event.clientName} · {event.staffName}
                  </Text>
                </View>
                <StaffAvatar
                  imagePath={staffImageById.get(event.staffId ?? '')}
                  name={event.staffName}
                  size={32}
                  backgroundColor="#e4d5c8"
                  fontSize={9}
                />
                <TouchableOpacity
                  style={[styles.checkoutButton, { borderColor: theme.border }]}
                  onPress={() =>
                    router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } })
                  }>
                  <AppIcon name="pointOfSale" size={20} color={theme.text} />
                </TouchableOpacity>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 14,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  rowTimeCol: {
    width: 56,
  },
  time: {
    fontSize: 14,
  },
  timeMuted: {
    fontSize: 12,
  },
  eventText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  checkoutButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
