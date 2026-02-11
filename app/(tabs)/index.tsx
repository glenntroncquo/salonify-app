import React from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  Pressable,
  Animated,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  Modal,
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

type WeekAppointment = EventItem & {
  startTime: string;
  endTime: string;
  allDay?: boolean;
};

type WeekDayData = {
  dateKey: string;
  date: number;
  weekday: string;
  isSunday: boolean;
  appointments: WeekAppointment[];
};

type ListSection = {
  title: string;
  dateKey: string;
  isToday: boolean;
  data: WeekAppointment[];
};

const BASE_YEAR = 2026;
const BASE_MONTH_INDEX = 1;
const WEEK_CENTER_INDEX = 1000;
const WEEK_PAGE_COUNT = 2001;
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

function getFullDateLabel(dateKey: string) {
  const date = new Date(dateKey);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getOffsetForDate(date: Date) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return year * 12 + monthIndex - (BASE_YEAR * 12 + BASE_MONTH_INDEX);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getWeekStartMonday(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), mondayOffset);
}

function getWeekOffsetFromBase(baseWeekStart: Date, dateKey: string) {
  const target = getWeekStartMonday(new Date(dateKey));
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - baseWeekStart.getTime()) / msPerWeek);
}

function getListHeaderLabel(dateKey: string) {
  const date = new Date(dateKey);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getInitialsFromLabel(label: string) {
  const parts = label
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getWeekdayLong(date: Date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[date.getDay()];
}

function buildWeekAppointments(dateKey: string, baseEvents: EventItem[]): WeekAppointment[] {
  const slots = [
    ['09:30', '10:30'],
    ['11:00', '12:00'],
    ['12:00', '13:00'],
    ['14:00', '15:00'],
    ['16:00', '17:00'],
    ['17:30', '18:30'],
  ] as const;

  return baseEvents.map((event, index) => ({
    ...event,
    startTime: slots[index % slots.length][0],
    endTime: slots[index % slots.length][1],
    allDay: false,
  }));
}

export default function CalendarScreen() {
  const { width, height } = useWindowDimensions();
  const gridWidth = width - 32;
  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [calendarAreaHeight, setCalendarAreaHeight] = React.useState(0);
  const calendarHeight = Math.max(
    320,
    calendarAreaHeight || height - headerHeight - 120
  );
  const weekRowFixedHeight = Math.max(84, Math.floor(calendarHeight / 7));
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list'>('month');
  const [offsets, setOffsets] = React.useState([-2, -1, 0, 1, 2]);
  const [currentOffset, setCurrentOffset] = React.useState(0);
  const weekOffsets = React.useMemo(
    () => Array.from({ length: WEEK_PAGE_COUNT }, (_, i) => i - WEEK_CENTER_INDEX),
    []
  );
  const [currentWeekIndex, setCurrentWeekIndex] = React.useState(WEEK_CENTER_INDEX);
  const [selectedDateKey, setSelectedDateKey] = React.useState('2026-02-10');
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [sheetEvents, setSheetEvents] = React.useState<EventItem[]>([]);
  const [sheetDateLabel, setSheetDateLabel] = React.useState('');
  const sheetAnim = React.useRef(new Animated.Value(0)).current;
  const [sheetMounted, setSheetMounted] = React.useState(false);
  const listRef = React.useRef<FlatList<number>>(null);
  const weekListRef = React.useRef<FlatList<number>>(null);
  const listSectionRef = React.useRef<SectionList<WeekAppointment, ListSection>>(null);
  const weekProgrammaticScrollRef = React.useRef(false);
  const monthCache = React.useRef(new Map<string, MonthData>()).current;
  const navigation = useNavigation();
  const offsetsRef = React.useRef(offsets);
  const viewModeRef = React.useRef(viewMode);
  const selectedDateKeyRef = React.useRef(selectedDateKey);
  const prevViewModeRef = React.useRef(viewMode);

  React.useEffect(() => {
    offsetsRef.current = offsets;
  }, [offsets]);

  React.useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  React.useEffect(() => {
    selectedDateKeyRef.current = selectedDateKey;
  }, [selectedDateKey]);

  React.useEffect(() => {
    if (sheetVisible) {
      setSheetMounted(true);
      Animated.spring(sheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 28,
        stiffness: 240,
        mass: 1,
      }).start();
    } else if (sheetMounted) {
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 30,
        stiffness: 260,
        mass: 1,
      }).start(({ finished }) => {
        if (finished) {
          setSheetMounted(false);
        }
      });
    }
  }, [sheetAnim, sheetMounted, sheetVisible]);

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
    setCurrentWeekIndex(WEEK_CENTER_INDEX);

    if (currentViewMode === 'month') {
      requestAnimationFrame(() => {
        const index = currentOffsets.indexOf(targetOffset);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true });
        }
      });
    }
    if (currentViewMode === 'week') {
      requestAnimationFrame(() => {
        weekProgrammaticScrollRef.current = true;
        weekListRef.current?.scrollToIndex({ index: WEEK_CENTER_INDEX, animated: true });
        setTimeout(() => {
          weekProgrammaticScrollRef.current = false;
        }, 260);
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

  React.useEffect(() => {
    const prevMode = prevViewModeRef.current;
    prevViewModeRef.current = viewMode;
    if (viewMode !== 'week' || prevMode === 'week') return;

    const targetWeekOffset = getWeekOffsetFromBase(baseWeekStart, selectedDateKeyRef.current);
    const targetIndex = WEEK_CENTER_INDEX + targetWeekOffset;
    if (targetIndex < 0 || targetIndex >= WEEK_PAGE_COUNT) return;
    setCurrentWeekIndex(targetIndex);
    requestAnimationFrame(() => {
      weekProgrammaticScrollRef.current = true;
      weekListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      setTimeout(() => {
        weekProgrammaticScrollRef.current = false;
      }, 120);
    });
  }, [baseWeekStart, viewMode]);

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

  const baseWeekStart = React.useMemo(() => getWeekStartMonday(new Date()), []);

  const fetchWeekData = React.useCallback(
    (weekOffset: number): WeekDayData[] => {
      const weekStart = addDays(baseWeekStart, weekOffset * 7);
      return Array.from({ length: 7 }, (_, dayOffset) => {
        const dayDate = addDays(weekStart, dayOffset);
        const dateKey = toDateKey(dayDate);
        const monthOffset = getOffsetForDate(dayDate);
        const monthData = fetchMonthData(monthOffset);
        const baseEvents = monthData.events[dateKey] ?? [];
        return {
          dateKey,
          date: dayDate.getDate(),
          weekday: getWeekdayLong(dayDate),
          isSunday: dayDate.getDay() === 0,
          appointments: buildWeekAppointments(dateKey, baseEvents),
        };
      });
    },
    [baseWeekStart, fetchMonthData]
  );

  const currentMonth = fetchMonthData(currentOffset);
  const currentWeekOffset = weekOffsets[currentWeekIndex] ?? 0;
  const currentWeekDays = fetchWeekData(currentWeekOffset);
  const activeDateForHeader =
    viewMode === 'week' ? new Date(currentWeekDays[0]?.dateKey ?? selectedDateKey) : new Date(selectedDateKey);
  const activeMonthLabel = `${MONTH_LABELS[activeDateForHeader.getMonth()]} ${activeDateForHeader.getFullYear()}`;

  React.useEffect(() => {
    const monthData = fetchMonthData(currentOffset);
    if (!monthData.inMonthKeys.has(selectedDateKey)) {
      setSelectedDateKey(monthData.firstDateKey);
    }
  }, [currentOffset, fetchMonthData, selectedDateKey]);

  const selectedWeekNumber = React.useMemo(
    () => getISOWeekNumber(new Date(selectedDateKey)),
    [selectedDateKey]
  );

  const listSections = React.useMemo(() => {
    const todayKey = toDateKey(new Date());
    return Array.from(currentMonth.inMonthKeys)
      .sort()
      .map((dateKey) => ({
        title: getListHeaderLabel(dateKey),
        dateKey,
        isToday: dateKey === todayKey,
        data: buildWeekAppointments(dateKey, currentMonth.events[dateKey] ?? []),
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

  const handleWeekChange = React.useCallback(
    (index: number) => {
      if (weekProgrammaticScrollRef.current) return;
      const weekOffset = weekOffsets[index];
      if (weekOffset === undefined) return;
      setCurrentWeekIndex(index);
      const days = fetchWeekData(weekOffset);
      if (days[0]) {
        setSelectedDateKey(days[0].dateKey);
      }
    },
    [fetchWeekData, weekOffsets]
  );

  const renderMonthGrid = React.useCallback(
    (monthData: MonthData) => {
      const weeksToRender = [...monthData.weeks];
      while (
        weeksToRender.length > 5 &&
        !weeksToRender[weeksToRender.length - 1].days.some((day) => day.inMonth)
      ) {
        weeksToRender.pop();
      }

      return (
        <View style={styles.monthGrid}>
          {weeksToRender.map((week) => (
            <View key={`${monthData.key}-${week.weekNumber}`} style={styles.weekRow}>
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
                  onPress={() => {
                    if (selectedDateKey === day.dateKey) {
                      setSheetEvents(events);
                      setSheetDateLabel(day.dateKey);
                      setSheetVisible(true);
                      return;
                    }
                    setSelectedDateKey(day.dateKey);
                  }}>
                  <View style={styles.dayHeader}>
                    <View style={[styles.dayNumberWrapper, isSelected ? styles.selectedDayCircle : undefined]}>
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
                        <Text
                          style={[styles.eventText, { color: event.textColor ?? '#e05668' }]}
                          numberOfLines={1}>
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
      );
    },
    [selectedDateKey]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <View
            style={styles.headerBlock}
            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <View style={styles.headerRow}>
              <View style={styles.monthRow}>
                <Text style={styles.monthText}>{activeMonthLabel}</Text>
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

          </View>

          <View
            style={styles.calendarArea}
            onLayout={(event) => setCalendarAreaHeight(event.nativeEvent.layout.height)}>
            {viewMode === 'month' ? (
              <FlatList
                ref={listRef}
                data={offsets}
                keyExtractor={(item) => `month-${item}`}
                horizontal
                pagingEnabled
                initialScrollIndex={offsets.indexOf(0)}
                showsHorizontalScrollIndicator={false}
                style={[styles.monthPager, { height: calendarHeight }]}
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

            {viewMode === 'week' ? (
              <FlatList
                ref={weekListRef}
                data={weekOffsets}
                keyExtractor={(item) => `week-${item}`}
                horizontal
                pagingEnabled
                initialScrollIndex={WEEK_CENTER_INDEX}
                showsHorizontalScrollIndicator={false}
                style={styles.weekPager}
                getItemLayout={(_, index) => ({
                  length: gridWidth,
                  offset: gridWidth * index,
                  index,
                })}
                decelerationRate="fast"
                disableIntervalMomentum
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / gridWidth);
                  handleWeekChange(index);
                }}
                renderItem={({ item }) => {
                  const weekDays = fetchWeekData(item);
                  return (
                    <View style={[styles.weekAgendaPage, { width: gridWidth, height: calendarHeight }]}>
                      {weekDays.map((day) => (
                        <View key={day.dateKey} style={[styles.weekAgendaDay, { height: weekRowFixedHeight }]}>
                          <Pressable
                            style={styles.weekAgendaDateCol}
                            onPress={() => {
                              if (selectedDateKey === day.dateKey) {
                                setSheetEvents(day.appointments);
                                setSheetDateLabel(day.dateKey);
                                setSheetVisible(true);
                                return;
                              }
                              setSelectedDateKey(day.dateKey);
                            }}>
                            <Text style={[styles.weekAgendaDate, day.isSunday && styles.dayNumberSunday]}>
                              {day.date}
                            </Text>
                            <Text style={styles.weekAgendaWeekday}>{day.weekday}</Text>
                          </Pressable>
                          <ScrollView
                            style={styles.weekAgendaEvents}
                            nestedScrollEnabled
                            directionalLockEnabled
                            showsVerticalScrollIndicator>
                            {day.appointments.map((event, index) => (
                              <View key={`${day.dateKey}-${index}`} style={styles.weekAgendaEventRow}>
                                <View style={[styles.weekAgendaColorBar, { backgroundColor: event.color }]} />
                                <Text
                                  style={[
                                    styles.weekAgendaTime,
                                    {
                                      color:
                                        !event.textColor || event.textColor === '#ffffff'
                                          ? '#8b8b8b'
                                          : event.textColor,
                                    },
                                  ]}>
                                  {event.startTime}
                                </Text>
                                <Text style={styles.weekAgendaTitle}>{event.label}</Text>
                                <View style={styles.weekAgendaInitialCircle}>
                                  <Text style={styles.weekAgendaInitialText}>
                                    {getInitialsFromLabel(event.label)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      ))}
                    </View>
                  );
                }}
              />
            ) : null}

            {viewMode === 'list' ? (
              <SectionList
                ref={listSectionRef}
                sections={listSections}
                keyExtractor={(item, index) => `${item.label}-${index}`}
                stickySectionHeadersEnabled
                showsVerticalScrollIndicator={false}
                style={styles.listFullBleed}
                contentContainerStyle={styles.listContent}
                renderSectionHeader={({ section }) => (
                  <View style={styles.listStickyHeader}>
                    <Text style={styles.listStickyTitle}>{section.title}</Text>
                    {section.isToday ? <Text style={styles.listStickyToday}>Today</Text> : null}
                  </View>
                )}
                renderItem={({ item }) => (
                  <View style={styles.listEventRow}>
                    <View style={styles.listEventTimeCol}>
                      <Text
                        style={[
                          styles.listEventTime,
                          {
                            color:
                              !item.textColor || item.textColor === '#ffffff'
                                ? '#8b8b8b'
                                : item.textColor,
                          },
                        ]}>
                        {item.allDay ? 'All-day' : item.startTime}
                      </Text>
                      <Text style={styles.listEventTimeMuted}>{item.allDay ? '' : item.endTime}</Text>
                    </View>
                    <View style={[styles.listEventBar, { backgroundColor: item.color }]} />
                    <Text style={styles.listEventTitle}>{item.label}</Text>
                    <View style={styles.listEventAvatar}>
                      <Text style={styles.listEventAvatarText}>{getInitialsFromLabel(item.label)}</Text>
                    </View>
                  </View>
                )}
              />
            ) : null}
          </View>
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
      <Modal transparent animationType="none" visible={sheetMounted} onRequestClose={() => setSheetVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetVisible(false)}>
          <Animated.View
            style={[
              styles.sheetBackdrop,
              {
                opacity: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sheetCard,
              {
                transform: [
                  {
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{getFullDateLabel(sheetDateLabel || selectedDateKey)}</Text>
                <Text style={styles.sheetSubtitle}>Week {selectedWeekNumber}</Text>
              </View>
              <View style={styles.sheetAddButton}>
                <MaterialIcons name="add" size={18} color="#ffffff" />
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {sheetEvents.map((event, index) => (
                <View key={`${sheetDateLabel}-${index}`} style={styles.sheetRow}>
                  <View style={[styles.sheetLine, { backgroundColor: event.color }]} />
                  <View style={styles.sheetRowContent}>
                    <Text style={styles.sheetTime}>09:30</Text>
                    <Text style={styles.sheetTimeMuted}>10:30</Text>
                  </View>
                  <Text style={styles.sheetEventText}>{event.label}</Text>
                  <View style={styles.sheetAvatar} />
                </View>
              ))}
            </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
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
    paddingBottom: 0,
  },
  headerBlock: {
    paddingBottom: 8,
  },
  calendarArea: {
    flex: 1,
  },
  monthPager: {
    flex: 1,
  },
  monthGrid: {
    flex: 1,
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
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
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
  dayNumberWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 10,
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
  weekList: {
    paddingTop: 12,
  },
  weekArea: {
    flex: 1,
  },
  weekPager: {
    flex: 1,
  },
  weekAgendaPage: {
    justifyContent: 'space-between',
  },
  weekAgendaDay: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    paddingVertical: 6,
  },
  weekAgendaDateCol: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekAgendaDate: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  weekAgendaWeekday: {
    marginTop: 2,
    fontSize: 11,
    color: '#8b8b8b',
    textTransform: 'capitalize',
  },
  weekAgendaEvents: {
    flex: 1,
    maxHeight: '100%',
    paddingRight: 8,
  },
  weekAgendaEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  weekAgendaColorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 6,
  },
  weekAgendaTime: {
    width: 44,
    fontSize: 11,
    lineHeight: 13,
    marginRight: 2,
    fontWeight: '600',
  },
  weekAgendaInitialCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d8cfc6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekAgendaInitialText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#4a4a4a',
  },
  weekAgendaTitle: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 13,
    color: '#1f1f1f',
    fontWeight: '600',
    marginRight: 2,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 120,
  },
  listFullBleed: {
    marginHorizontal: -16,
  },
  listStickyHeader: {
    backgroundColor: '#fbfbfb',
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  listStickyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  listStickyToday: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b8b8b',
  },
  listEventRow: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  listEventTimeCol: {
    width: 48,
    marginRight: 6,
  },
  listEventTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  listEventTimeMuted: {
    marginTop: 1,
    fontSize: 10,
    color: '#9a9a9a',
  },
  listEventBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 8,
  },
  listEventTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  listEventAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d8cfc6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  listEventAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4a4a4a',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    minHeight: 420,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d9d9d9',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#8b8b8b',
    marginTop: 2,
  },
  sheetAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetList: {
    gap: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetLine: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  sheetRowContent: {
    width: 56,
  },
  sheetTime: {
    fontSize: 14,
    color: '#1b1b1b',
  },
  sheetTimeMuted: {
    fontSize: 12,
    color: '#8b8b8b',
  },
  sheetEventText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  sheetAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e4d5c8',
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
    bottom: 16,
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
    bottom: 16,
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
