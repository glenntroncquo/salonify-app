import React from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from 'expo-router';

type CalendarDay = {
  date: number;
  inMonth: boolean;
  isSunday?: boolean;
  dateKey: string;
};

type CalendarWeek = {
  weekNumber: number;
  days: CalendarDay[];
};

type EventItem = {
  label: string;
  color: string;
  textColor?: string;
};

type MonthData = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  weeks: CalendarWeek[];
  events: Record<string, EventItem[]>;
  inMonthKeys: Set<string>;
  firstDateKey: string;
};

const BASE_YEAR = 2026;
const BASE_MONTH_INDEX = 1;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const EVENT_LABELS = [
  'Klant haar/',
  'Keratine +',
  'Balayage J',
  'Kleuring',
  'Extensions',
  'Cristal: All',
  'Afspraak T',
  'Lien knipp',
  'Zoe inste',
  'Carmella',
  'Valentijnsc',
];

const EVENT_COLORS = [
  { color: '#ffd4dc', textColor: '#e05668' },
  { color: '#ffe8b5', textColor: '#c98200' },
  { color: '#d4ecff', textColor: '#2e7dd1' },
  { color: '#c9f4dd', textColor: '#1a8f5a' },
  { color: '#bfbfbf', textColor: '#ffffff' },
];

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getISOWeekNumber(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function addMonths(baseYear: number, baseMonth: number, offset: number) {
  const total = baseYear * 12 + baseMonth + offset;
  const year = Math.floor(total / 12);
  const monthIndex = total % 12;
  return { year, monthIndex };
}

function mulberry32(seed: number) {
  let t = seed;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMonthData(year: number, monthIndex: number): MonthData {
  const label = `${MONTH_LABELS[monthIndex]} ${year}`;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - firstDayIndex);
  const rand = mulberry32(year * 100 + monthIndex + 1);

  const weeks: CalendarWeek[] = [];
  const inMonthKeys = new Set<string>();
  const events: Record<string, EventItem[]> = {};
  let firstDateKey = '';

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + weekIndex * 7);
    const weekNumber = getISOWeekNumber(weekStart);
    const days: CalendarDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      const inMonth = dayDate.getMonth() === monthIndex;
      const dateKey = toDateKey(dayDate);

      if (inMonth) {
        inMonthKeys.add(dateKey);
        if (!firstDateKey) {
          firstDateKey = dateKey;
        }
      }

      days.push({
        date: dayDate.getDate(),
        inMonth,
        isSunday: dayDate.getDay() === 0,
        dateKey,
      });
    }

    weeks.push({ weekNumber, days });
  }

  Array.from(inMonthKeys).forEach((dateKey, index) => {
    const roll = rand();
    let count = 0;
    if (roll > 0.55) count = 1;
    if (roll > 0.72) count = 2;
    if (roll > 0.85) count = 3;
    if (roll > 0.95) count = 4;

    if (count > 0) {
      const items: EventItem[] = [];
      for (let i = 0; i < count; i += 1) {
        const label = EVENT_LABELS[(index + i) % EVENT_LABELS.length];
        const color = EVENT_COLORS[(index + i) % EVENT_COLORS.length];
        items.push({ label, color: color.color, textColor: color.textColor });
      }
      events[dateKey] = items;
    }
  });

  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    label,
    year,
    monthIndex,
    weeks,
    events,
    inMonthKeys,
    firstDateKey,
  };
}

function getDayLabel(dateKey: string) {
  const date = new Date(dateKey);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[date.getDay()]} ${date.getDate()}`;
}

function getOffsetForDate(date: Date) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return year * 12 + monthIndex - (BASE_YEAR * 12 + BASE_MONTH_INDEX);
}

export default function CalendarScreen() {
  const { width, height } = useWindowDimensions();
  const gridWidth = width - 32;
  const calendarHeight = Math.max(320, height - 420);
  const weekRowHeight = Math.floor(calendarHeight / 6);
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list'>('month');
  const [offsets, setOffsets] = React.useState([-2, -1, 0, 1, 2]);
  const [currentOffset, setCurrentOffset] = React.useState(0);
  const [selectedDateKey, setSelectedDateKey] = React.useState('2026-02-10');
  const listRef = React.useRef<FlatList<number>>(null);
  const monthCache = React.useRef(new Map<string, MonthData>()).current;
  const navigation = useNavigation();
  const offsetsRef = React.useRef(offsets);
  const viewModeRef = React.useRef(viewMode);

  React.useEffect(() => {
    offsetsRef.current = offsets;
  }, [offsets]);

  React.useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('calendarModeMenu', () => {
      setShowModeMenu((prev) => !prev);
    });
    return () => subscription.remove();
  }, []);

  const goToToday = React.useCallback(() => {
    const today = new Date();
    const targetOffset = getOffsetForDate(today);
    const dateKey = toDateKey(today);
    const currentOffsets = offsetsRef.current;
    const currentViewMode = viewModeRef.current;

    if (!currentOffsets.includes(targetOffset)) {
      const nextOffsets = [
        targetOffset - 2,
        targetOffset - 1,
        targetOffset,
        targetOffset + 1,
        targetOffset + 2,
      ];
      setOffsets(nextOffsets);
      setCurrentOffset(targetOffset);
      setSelectedDateKey(dateKey);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: 2, animated: false });
      });
      return;
    }

    setCurrentOffset(targetOffset);
    setSelectedDateKey(dateKey);
    if (currentViewMode === 'month') {
      requestAnimationFrame(() => {
        const index = currentOffsets.indexOf(targetOffset);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true });
        }
      });
    }
  }, []);

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('calendarGoToToday', goToToday);
    return () => subscription.remove();
  }, [goToToday]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      goToToday();
    });
    return unsubscribe;
  }, [goToToday, navigation]);

  const menuWidth = 190;
  const calendarTabCenterX = width / 8;
  const menuLeft = Math.max(12, calendarTabCenterX - menuWidth / 2);

  const fetchMonthData = React.useCallback(
    (offset: number) => {
      const { year, monthIndex } = addMonths(BASE_YEAR, BASE_MONTH_INDEX, offset);
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      if (!monthCache.has(key)) {
        const data = generateMonthData(year, monthIndex);
        monthCache.set(key, data);
      }
      return monthCache.get(key)!;
    },
    [monthCache]
  );

  const currentMonth = fetchMonthData(currentOffset);

  React.useEffect(() => {
    const monthData = fetchMonthData(currentOffset);
    if (!monthData.inMonthKeys.has(selectedDateKey)) {
      setSelectedDateKey(monthData.firstDateKey);
    }
  }, [currentOffset, fetchMonthData, selectedDateKey]);

  const selectedEvents = currentMonth.events[selectedDateKey] ?? [];

  const selectedWeek = React.useMemo(() => {
    return currentMonth.weeks.find((week) =>
      week.days.some((day) => day.dateKey === selectedDateKey)
    );
  }, [currentMonth, selectedDateKey]);

  const listDays = React.useMemo(() => {
    return Array.from(currentMonth.inMonthKeys)
      .sort()
      .map((dateKey) => ({
        dateKey,
        label: getDayLabel(dateKey),
        events: currentMonth.events[dateKey] ?? [],
      }));
  }, [currentMonth]);

  const handleMonthChange = React.useCallback(
    (index: number) => {
      const offset = offsets[index];
      if (offset === undefined) return;
      setCurrentOffset(offset);
      fetchMonthData(offset);

      if (index <= 1) {
        const first = offsets[0];
        const prepend = [first - 3, first - 2, first - 1];
        const nextOffsets = [...prepend, ...offsets];
        setOffsets(nextOffsets);
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: index + prepend.length, animated: false });
        });
      }

      if (index >= offsets.length - 2) {
        const last = offsets[offsets.length - 1];
        setOffsets([...offsets, last + 1, last + 2, last + 3]);
      }
    },
    [fetchMonthData, offsets]
  );

  const renderMonthGrid = React.useCallback(
    (monthData: MonthData) => (
      <View style={{ height: calendarHeight }}>
        {monthData.weeks.map((week) => (
          <View
            key={`${monthData.key}-${week.weekNumber}`}
            style={[styles.weekRow, { height: weekRowHeight }]}>
            <Text style={styles.weekNumber}>{week.weekNumber}</Text>
            {week.days.map((day) => {
              const events = monthData.events[day.dateKey] ?? [];
              const maxVisibleEvents = 3;
              const visibleEvents = events.slice(0, maxVisibleEvents);
              const hiddenCount = Math.max(0, events.length - visibleEvents.length);
              const isSelected = selectedDateKey === day.dateKey;
              return (
                <Pressable
                  key={day.dateKey}
                  style={styles.dayCell}
                  onPress={() => setSelectedDateKey(day.dateKey)}>
                  <View style={styles.dayHeader}>
                    <View style={isSelected ? styles.selectedDayCircle : undefined}>
                      <Text
                        style={[
                          styles.dayNumber,
                          !day.inMonth && styles.dayNumberMuted,
                          day.isSunday && styles.dayNumberSunday,
                          isSelected && styles.dayNumberSelected,
                        ]}>
                        {day.date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eventStack}>
                    {visibleEvents.map((event, eventIndex) => (
                      <View
                        key={`${day.dateKey}-${eventIndex}`}
                        style={[styles.eventPill, { backgroundColor: event.color }]}>
                        <Text style={[styles.eventText, { color: event.textColor ?? '#e05668' }]}>
                          {event.label}
                        </Text>
                      </View>
                    ))}
                    {hiddenCount > 0 ? (
                      <View style={styles.morePill}>
                        <Text style={styles.moreText}>{`+${hiddenCount}`}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    ),
    [calendarHeight, selectedDateKey, weekRowHeight]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View style={styles.monthRow}>
              <Text style={styles.monthText}>{currentMonth.label}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color="#9a9a9a" />
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialIcons name="star-border" size={22} color="#1b1b1b" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialIcons name="view-agenda" size={22} color="#1b1b1b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.employeeRow}>
            <Text style={styles.employeeLabel}>Employee</Text>
            <View style={styles.employeeChip}>
              <View style={styles.employeeAvatar} />
              <Text style={styles.employeeName}>All staff</Text>
              <MaterialIcons name="expand-more" size={18} color="#8b8b8b" />
            </View>
          </View>

          <View style={styles.weekHeader}>
            <View style={styles.weekNumberSpacer} />
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((label) => (
              <Text key={label} style={styles.weekdayText}>
                {label}
              </Text>
            ))}
          </View>

          {viewMode === 'month' ? (
            <FlatList
              ref={listRef}
              data={offsets}
              keyExtractor={(item) => `month-${item}`}
              horizontal
              pagingEnabled
              initialScrollIndex={offsets.indexOf(0)}
              showsHorizontalScrollIndicator={false}
              style={{ height: calendarHeight }}
              getItemLayout={(_, index) => ({
                length: gridWidth,
                offset: gridWidth * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / gridWidth);
                handleMonthChange(index);
              }}
              renderItem={({ item }) => (
                <View style={{ width: gridWidth, height: calendarHeight }}>
                  {renderMonthGrid(fetchMonthData(item))}
                </View>
              )}
            />
          ) : null}

          {viewMode === 'week' && selectedWeek ? (
            <View>
              <View style={[styles.weekRow, { height: weekRowHeight }]}>
                <Text style={styles.weekNumber}>{selectedWeek.weekNumber}</Text>
                {selectedWeek.days.map((day) => {
                  const isSelected = selectedDateKey === day.dateKey;
                  return (
                    <Pressable
                      key={day.dateKey}
                      style={styles.dayCell}
                      onPress={() => setSelectedDateKey(day.dateKey)}>
                      <View style={styles.dayHeader}>
                        <View style={isSelected ? styles.selectedDayCircle : undefined}>
                          <Text
                            style={[
                              styles.dayNumber,
                              !day.inMonth && styles.dayNumberMuted,
                              day.isSunday && styles.dayNumberSunday,
                              isSelected && styles.dayNumberSelected,
                            ]}>
                            {day.date}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.weekList}>
                {selectedWeek.days.map((day) => {
                  const events = currentMonth.events[day.dateKey] ?? [];
                  if (events.length === 0) return null;
                  return (
                    <View key={`week-${day.dateKey}`} style={styles.listDayBlock}>
                      <Text style={styles.listDayLabel}>{getDayLabel(day.dateKey)}</Text>
                      {events.map((event, index) => (
                        <View key={`week-${day.dateKey}-${index}`} style={styles.listRow}>
                          <View style={[styles.detailDot, { backgroundColor: event.color }]} />
                          <Text style={styles.listText}>{event.label}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
                {selectedEvents.length === 0 ? (
                  <Text style={styles.detailEmpty}>No appointments</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {viewMode === 'list' ? (
            <FlatList
              data={listDays.filter((day) => day.events.length > 0)}
              keyExtractor={(item) => item.dateKey}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.listDayBlock}>
                  <Text style={styles.listDayLabel}>{item.label}</Text>
                  {item.events.map((event, index) => (
                    <View key={`${item.dateKey}-${index}`} style={styles.listRow}>
                      <View style={[styles.detailDot, { backgroundColor: event.color }]} />
                      <Text style={styles.listText}>{event.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            />
          ) : null}
        </View>

        {showModeMenu ? (
          <>
            <Pressable style={styles.menuOverlay} onPress={() => setShowModeMenu(false)} />
            <View style={[styles.modeMenu, { left: menuLeft, width: menuWidth }]}>
              <Pressable
                style={styles.modeItemActive}
                onPress={() => {
                  setViewMode('month');
                  setShowModeMenu(false);
                }}>
                <MaterialIcons name="calendar-today" size={20} color="#1b1b1b" />
                <Text style={styles.modeText}>Month</Text>
                {viewMode === 'month' ? (
                  <MaterialIcons name="check" size={20} color="#20b87b" />
                ) : null}
              </Pressable>
              <Pressable
                style={styles.modeItem}
                onPress={() => {
                  setViewMode('week');
                  setShowModeMenu(false);
                }}>
                <MaterialIcons name="view-week" size={20} color="#1b1b1b" />
                <Text style={styles.modeText}>Week</Text>
                {viewMode === 'week' ? (
                  <MaterialIcons name="check" size={20} color="#20b87b" />
                ) : null}
              </Pressable>
              <Pressable
                style={styles.modeItem}
                onPress={() => {
                  setViewMode('list');
                  setShowModeMenu(false);
                }}>
                <MaterialIcons name="view-list" size={20} color="#1b1b1b" />
                <Text style={styles.modeText}>List</Text>
                {viewMode === 'list' ? (
                  <MaterialIcons name="check" size={20} color="#20b87b" />
                ) : null}
              </Pressable>
            </View>
          </>
        ) : null}

        <TouchableOpacity style={styles.fab}>
          <MaterialIcons name="add" size={26} color="#1b1b1b" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  headerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 14,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeLabel: {
    fontSize: 15,
    color: '#8b8b8b',
    fontWeight: '600',
  },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    backgroundColor: '#ffffff',
  },
  employeeAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#d8cfc6',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  weekHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekNumberSpacer: {
    width: 20,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#8b8b8b',
    letterSpacing: 0.4,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  weekNumber: {
    width: 20,
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 6,
  },
  dayCell: {
    flex: 1,
    paddingHorizontal: 2,
    height: '100%',
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 13,
    color: '#1b1b1b',
  },
  dayNumberMuted: {
    color: '#bdbdbd',
  },
  dayNumberSunday: {
    color: '#e04b4b',
  },
  selectedDayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  eventStack: {
    gap: 4,
  },
  eventPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventText: {
    fontSize: 11,
    fontWeight: '600',
  },
  morePill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f0f0f0',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6f6f6f',
  },
  detailEmpty: {
    fontSize: 13,
    color: '#8b8b8b',
    marginTop: 8,
  },
  detailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  weekList: {
    paddingTop: 12,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 140,
  },
  listDayBlock: {
    marginBottom: 16,
  },
  listDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b1b1b',
    marginBottom: 6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  listText: {
    fontSize: 14,
    color: '#1b1b1b',
  },
  menuOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  modeMenu: {
    position: 'absolute',
    bottom: 88,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  modeItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  modeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 82,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
