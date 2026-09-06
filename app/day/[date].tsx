import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { VisitPhaseBar } from '@/components/visit-phase-bar';
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

import {
  groupAppointmentsByDateKey,
  PX_PER_VISIT_MINUTE,
  visitBlockHeight,
  visitDurationMinutes,
} from '../(tabs)/calendar/calendar-data';
import { getFullDateLabel, getISOWeekNumber, parseSalonWallClock } from '../(tabs)/calendar/date-utils';
import { EventItem } from '../(tabs)/calendar/types';

const HOUR_LABEL_WIDTH = 44;
const GRID_PAD_TOP = 8;
const DEFAULT_START_MINUTE = 8 * 60;
const DEFAULT_END_MINUTE = 18 * 60;

function minutesFromMidnight(value: string): number {
  const date = parseSalonWallClock(value);
  return date.getHours() * 60 + date.getMinutes();
}

function formatHourLabel(minute: number): string {
  const hours = Math.floor(minute / 60);
  return `${String(hours).padStart(2, '0')}:00`;
}

type LaidOutVisit = {
  event: EventItem;
  top: number;
  height: number;
  column: number;
  columns: number;
};

function layoutVisits(events: EventItem[], gridStart: number): LaidOutVisit[] {
  const items = events
    .map((event) => ({
      event,
      start: minutesFromMidnight(event.startISO),
      end: minutesFromMidnight(event.startISO) + visitDurationMinutes(event),
      height: visitBlockHeight(event),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const active: { end: number; column: number }[] = [];
  return items.map((item) => {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].end <= item.start) active.splice(index, 1);
    }
    const used = new Set(active.map((entry) => entry.column));
    let column = 0;
    while (used.has(column)) column += 1;
    active.push({ end: item.end, column });
    const columns = Math.max(column + 1, ...active.map((entry) => entry.column + 1));
    return {
      event: item.event,
      top: GRID_PAD_TOP + (item.start - gridStart) * PX_PER_VISIT_MINUTE,
      height: item.height,
      column,
      columns,
    };
  });
}

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

  const gridStart = React.useMemo(() => {
    if (events.length === 0) return DEFAULT_START_MINUTE;
    return Math.min(DEFAULT_START_MINUTE, ...events.map((event) => minutesFromMidnight(event.startISO)));
  }, [events]);

  const gridEnd = React.useMemo(() => {
    if (events.length === 0) return DEFAULT_END_MINUTE;
    return Math.max(
      DEFAULT_END_MINUTE,
      ...events.map((event) => minutesFromMidnight(event.startISO) + visitDurationMinutes(event))
    );
  }, [events]);

  const hourMarks = React.useMemo(() => {
    const startHour = Math.floor(gridStart / 60);
    const endHour = Math.ceil(gridEnd / 60);
    return Array.from({ length: endHour - startHour + 1 }, (_, index) => (startHour + index) * 60);
  }, [gridStart, gridEnd]);

  const laidOut = React.useMemo(() => layoutVisits(events, gridStart), [events, gridStart]);
  const gridHeight = GRID_PAD_TOP + (gridEnd - gridStart) * PX_PER_VISIT_MINUTE + 16;

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
      ) : events.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>{t('calendar.noAppointmentsToday')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.grid, { height: gridHeight }]}>
            {hourMarks.map((minute) => {
              const top = GRID_PAD_TOP + (minute - gridStart) * PX_PER_VISIT_MINUTE;
              return (
                <View key={minute} style={[styles.hourRow, { top }]}>
                  <Text style={[styles.hourLabel, { color: theme.muted }]}>{formatHourLabel(minute)}</Text>
                  <View style={[styles.hourLine, { backgroundColor: theme.border }]} />
                </View>
              );
            })}

            <View style={styles.visitLane}>
              {laidOut.map((item) => {
                const widthPercent = 100 / item.columns;
                const leftPercent = item.column * widthPercent;
                return (
                  <Pressable
                    key={item.event.id}
                    style={[
                      styles.visitBlock,
                      {
                        top: item.top,
                        height: item.height,
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() =>
                      router.push({ pathname: '/appointment/[id]', params: { id: item.event.appointmentId } })
                    }>
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <VisitPhaseBar
                        phases={item.event.phases}
                        color={item.event.color}
                        bgColor={item.event.bgColor}
                        height={item.height}
                        direction="horizontal"
                      />
                    </View>
                    <View style={styles.visitContent} pointerEvents="box-none">
                      <View style={styles.visitTextCol}>
                        <Text style={[styles.time, { color: theme.text }]} numberOfLines={1}>
                          {`${item.event.startTime}–${item.event.endTime}`}
                        </Text>
                        <Text style={[styles.eventText, { color: theme.text }]} numberOfLines={1}>
                          {item.event.label}
                        </Text>
                        <Text style={[styles.eventSubtitle, { color: theme.muted }]} numberOfLines={1}>
                          {item.event.clientName} · {item.event.staffName}
                        </Text>
                      </View>
                      <StaffAvatar
                        imagePath={staffImageById.get(item.event.staffId ?? '')}
                        name={item.event.staffName}
                        size={28}
                        backgroundColor="#e4d5c8"
                        fontSize={9}
                      />
                      <TouchableOpacity
                        style={[styles.checkoutButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                        onPress={() =>
                          router.push({
                            pathname: '/checkout/[appointmentId]',
                            params: { appointmentId: item.event.appointmentId },
                          })
                        }>
                        <AppIcon name="pointOfSale" size={18} color={theme.text} />
                      </TouchableOpacity>
                    </View>
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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 48,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  grid: {
    marginLeft: 0,
    position: 'relative',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    width: HOUR_LABEL_WIDTH,
    fontSize: 11,
    fontWeight: '600',
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  visitLane: {
    position: 'absolute',
    left: HOUR_LABEL_WIDTH + 4,
    right: 0,
    top: 0,
    bottom: 0,
  },
  visitBlock: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  visitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    height: '100%',
  },
  visitTextCol: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontWeight: '700',
  },
  eventText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventSubtitle: {
    marginTop: 1,
    fontSize: 12,
  },
  checkoutButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
