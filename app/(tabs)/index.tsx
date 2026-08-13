import React from 'react';
import {
  DeviceEventEmitter,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { StaffAvatar } from '@/components/staff-avatar';
import { useAuth } from '@/contexts/auth-context';
import { fetchAppointmentsForMonth, fetchStaff, AppointmentRow, StaffMember } from '@/lib/api/calendar';

import {
  BASE_MONTH_INDEX,
  BASE_YEAR,
  LIST_MAX_LOADED_MONTHS,
  PREFETCH_FUTURE_MONTHS,
  PREFETCH_PAST_MONTHS,
  WEEK_CENTER_INDEX,
  WEEK_PAGE_COUNT,
} from './calendar/constants';
import {
  addDays,
  addMonths,
  getListHeaderLabel,
  getMonthShortLabel,
  getOffsetForDate,
  getWeekOffsetFromBase,
  getWeekStartMonday,
  getWeekdayLong,
  toDateKey,
} from './calendar/date-utils';
import { buildMonthData, groupAppointmentsByDateKey } from './calendar/calendar-data';
import { ListEventRow } from './calendar/components/ListEventRow';
import { ListSectionHeader } from './calendar/components/ListSectionHeader';
import { styles } from './calendar/styles';
import { EventItem, ListFlatItem, MonthData, WeekDayData } from './calendar/types';

function buildPrefetchWindow(centerOffset: number): number[] {
  const span = PREFETCH_PAST_MONTHS + PREFETCH_FUTURE_MONTHS + 1;
  return Array.from({ length: span }, (_, i) => centerOffset - PREFETCH_PAST_MONTHS + i);
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const gridWidth = width - 32;
  const { companyId } = useAuth();
  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [calendarAreaHeight, setCalendarAreaHeight] = React.useState(0);
  const calendarHeight = Math.max(320, calendarAreaHeight || height - headerHeight - 120);
  const weekRowFixedHeight = Math.max(84, Math.floor(calendarHeight / 7));
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [showStaffMenu, setShowStaffMenu] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list'>('month');
  const [offsets, setOffsets] = React.useState([-2, -1, 0, 1, 2]);
  const [currentOffset, setCurrentOffset] = React.useState(0);
  const [listMonthOffsets, setListMonthOffsets] = React.useState(() => buildPrefetchWindow(0));
  const weekOffsets = React.useMemo(
    () => Array.from({ length: WEEK_PAGE_COUNT }, (_, i) => i - WEEK_CENTER_INDEX),
    []
  );
  const [currentWeekIndex, setCurrentWeekIndex] = React.useState(WEEK_CENTER_INDEX);
  const [selectedDateKey, setSelectedDateKey] = React.useState(() => toDateKey(new Date()));
  const listRef = React.useRef<FlatList<number>>(null);
  const weekListRef = React.useRef<FlatList<number>>(null);
  const listAgendaRef = React.useRef<FlashListRef<ListFlatItem>>(null);
  const pendingListScrollRef = React.useRef<string | null>(null);
  const weekProgrammaticScrollRef = React.useRef(false);
  const navigation = useNavigation();
  const router = useRouter();
  const offsetsRef = React.useRef(offsets);
  const viewModeRef = React.useRef(viewMode);
  const selectedDateKeyRef = React.useRef(selectedDateKey);
  const prevViewModeRef = React.useRef(viewMode);

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [staffFilterId, setStaffFilterId] = React.useState<string | null>(null);
  const [staffLoading, setStaffLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Appointments are fetched one calendar month at a time (see loadMonth
  // below) rather than the whole company's history up front — cached here by
  // "YYYY-MM" key. A ref because it's a cache, not something that should
  // itself trigger renders; `loadingMonthKeys` (state) does that instead.
  const monthDataRef = React.useRef(new Map<string, AppointmentRow[]>());
  const inFlightMonthsRef = React.useRef(new Set<string>());
  const [loadingMonthKeys, setLoadingMonthKeys] = React.useState<Set<string>>(new Set());

  // Unfiltered per-day event groupings for the agenda list, cached per month
  // key so the same EventItem object references survive re-renders (staff
  // filter toggles, scroll-triggered growth, etc). Stable references let
  // FlashList/React.memo skip re-rendering rows whose data hasn't changed.
  // Invalidated in loadMonth whenever a month's appointments are (re)fetched.
  const monthEventsCacheRef = React.useRef(new Map<string, Record<string, EventItem[]>>());

  const monthKeyForOffset = React.useCallback((offset: number) => {
    const { year, monthIndex } = addMonths(BASE_YEAR, BASE_MONTH_INDEX, offset);
    return { year, monthIndex, key: `${year}-${String(monthIndex + 1).padStart(2, '0')}` };
  }, []);

  const loadMonth = React.useCallback(
    async (offset: number, opts?: { force?: boolean }) => {
      if (!companyId) return;
      const { year, monthIndex, key } = monthKeyForOffset(offset);

      if (inFlightMonthsRef.current.has(key)) return;
      if (!opts?.force && monthDataRef.current.has(key)) return;

      inFlightMonthsRef.current.add(key);
      setLoadingMonthKeys((prev) => new Set(prev).add(key));

      try {
        const data = await fetchAppointmentsForMonth(companyId, year, monthIndex);
        monthDataRef.current.set(key, data);
        monthEventsCacheRef.current.delete(key);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('calendar.failedToLoadAppointments'));
      } finally {
        inFlightMonthsRef.current.delete(key);
        setLoadingMonthKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [companyId, monthKeyForOffset, t]
  );

  const loadStaff = React.useCallback(async () => {
    if (!companyId) {
      setStaffLoading(false);
      return;
    }
    try {
      const data = await fetchStaff(companyId);
      setStaffList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('calendar.failedToLoadStaff'));
    } finally {
      setStaffLoading(false);
    }
  }, [companyId, t]);

  useFocusEffect(
    React.useCallback(() => {
      loadStaff();
    }, [loadStaff])
  );

  const baseWeekStart = React.useMemo(() => getWeekStartMonday(new Date()), []);

  // The set of month offsets the active view currently needs, unioned with a
  // PREFETCH_PAST_MONTHS/PREFETCH_FUTURE_MONTHS buffer around wherever the
  // user currently is. All three views share the same monthDataRef cache (see
  // loadMonth above), so this buffer is what lets swiping a few weeks/months
  // in either direction — or switching between month/week/list — land on
  // already-loaded data instead of triggering a fresh fetch at the boundary.
  const neededMonthOffsets = React.useMemo(() => {
    if (viewMode === 'week') {
      const weekOffset = weekOffsets[currentWeekIndex] ?? 0;
      const weekStart = addDays(baseWeekStart, weekOffset * 7);
      const offsetsSet = new Set<number>();
      for (let i = 0; i < 7; i += 1) {
        offsetsSet.add(getOffsetForDate(addDays(weekStart, i)));
      }
      buildPrefetchWindow(getOffsetForDate(weekStart)).forEach((offset) => offsetsSet.add(offset));
      return Array.from(offsetsSet);
    }
    if (viewMode === 'list') {
      return Array.from(new Set([...listMonthOffsets, ...buildPrefetchWindow(currentOffset)]));
    }
    return Array.from(new Set([...offsets, ...buildPrefetchWindow(currentOffset)]));
  }, [viewMode, weekOffsets, currentWeekIndex, baseWeekStart, listMonthOffsets, offsets, currentOffset]);

  React.useEffect(() => {
    neededMonthOffsets.forEach((offset) => {
      loadMonth(offset);
    });
  }, [neededMonthOffsets, loadMonth]);

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    return Promise.all([loadStaff(), ...neededMonthOffsets.map((offset) => loadMonth(offset, { force: true }))]).finally(
      () => setRefreshing(false)
    );
  }, [loadStaff, loadMonth, neededMonthOffsets]);

  const isVisibleDataLoading = neededMonthOffsets.some((offset) => loadingMonthKeys.has(monthKeyForOffset(offset).key));

  const selectedStaff = staffFilterId ? staffList.find((staff) => staff.id === staffFilterId) : undefined;
  const selectedStaffName = selectedStaff
    ? `${selectedStaff.first_name ?? ''} ${selectedStaff.last_name ?? ''}`.trim() || t('calendar.employee')
    : t('calendar.allStaff');

  const staffImageById = React.useMemo(() => {
    const map = new Map<string, string | null>();
    staffList.forEach((staff) => map.set(staff.id, staff.image_path));
    return map;
  }, [staffList]);

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
    const subscription = DeviceEventEmitter.addListener('calendarModeMenu', () => {
      setShowModeMenu((prev) => !prev);
    });
    return () => subscription.remove();
  }, []);

  const fetchMonthData = React.useCallback(
    (offset: number): MonthData => {
      const { year, monthIndex, key } = monthKeyForOffset(offset);
      const monthAppointments = monthDataRef.current.get(key) ?? [];
      const eventsByDateKey = groupAppointmentsByDateKey(monthAppointments, staffFilterId);
      return buildMonthData(year, monthIndex, eventsByDateKey);
    },
    [monthKeyForOffset, staffFilterId]
  );

  const getMonthEventsByDateKey = React.useCallback(
    (offset: number): Record<string, EventItem[]> => {
      const { key } = monthKeyForOffset(offset);
      let cached = monthEventsCacheRef.current.get(key);
      if (!cached) {
        const monthAppointments = monthDataRef.current.get(key) ?? [];
        cached = groupAppointmentsByDateKey(monthAppointments, null);
        monthEventsCacheRef.current.set(key, cached);
      }
      return cached;
    },
    [monthKeyForOffset]
  );

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('calendarRefreshAppointments', () => {
      handleRefresh();
    });
    return () => subscription.remove();
  }, [handleRefresh]);

  const fetchWeekData = React.useCallback(
    (weekOffset: number): WeekDayData[] => {
      const weekStart = addDays(baseWeekStart, weekOffset * 7);
      return Array.from({ length: 7 }, (_, dayOffset) => {
        const dayDate = addDays(weekStart, dayOffset);
        const dateKey = toDateKey(dayDate);
        const monthOffset = getOffsetForDate(dayDate);
        const monthData = fetchMonthData(monthOffset);
        return {
          dateKey,
          date: dayDate.getDate(),
          weekday: getWeekdayLong(dayDate),
          isSunday: dayDate.getDay() === 0,
          appointments: monthData.events[dateKey] ?? [],
        };
      });
    },
    [baseWeekStart, fetchMonthData]
  );

  const currentWeekOffset = weekOffsets[currentWeekIndex] ?? 0;
  const currentWeekDays = fetchWeekData(currentWeekOffset);
  const activeDateForHeader =
    viewMode === 'week' ? new Date(currentWeekDays[0]?.dateKey ?? selectedDateKey) : new Date(selectedDateKey);
  const activeMonthLabel = `${getMonthShortLabel(activeDateForHeader.getMonth())} ${activeDateForHeader.getFullYear()}`;

  React.useEffect(() => {
    const monthData = fetchMonthData(currentOffset);
    if (!monthData.inMonthKeys.has(selectedDateKey)) {
      setSelectedDateKey(monthData.firstDateKey);
    }
  }, [currentOffset, fetchMonthData, selectedDateKey]);

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

  React.useEffect(() => {
    if (viewMode !== 'list') return;
    setListMonthOffsets((prev) => (prev.includes(currentOffset) ? prev : buildPrefetchWindow(currentOffset)));
  }, [currentOffset, viewMode]);

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
    setListMonthOffsets(buildPrefetchWindow(targetOffset));

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

    if (currentViewMode === 'list') {
      pendingListScrollRef.current = dateKey;
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

  // Flattened [header, row, row, ...] data for the agenda FlashList, with the
  // header indices FlashList needs to pin them via stickyHeaderIndices. Built
  // from the cached per-month groupings so EventItem object identity stays
  // stable across renders (React.memo on ListEventRow relies on this).
  const listFlatData = React.useMemo(() => {
    const todayKey = toDateKey(new Date());
    const items: ListFlatItem[] = [];
    const stickyHeaderIndices: number[] = [];

    listMonthOffsets
      .slice()
      .sort((a, b) => a - b)
      .forEach((monthOffset) => {
        const eventsByDateKey = getMonthEventsByDateKey(monthOffset);
        Object.keys(eventsByDateKey)
          .sort()
          .forEach((dateKey) => {
            const dayEvents = staffFilterId
              ? eventsByDateKey[dateKey].filter((event) => event.staffId === staffFilterId)
              : eventsByDateKey[dateKey];
            if (!dayEvents || dayEvents.length === 0) return;

            stickyHeaderIndices.push(items.length);
            items.push({
              kind: 'header',
              key: `header-${dateKey}`,
              dateKey,
              title: getListHeaderLabel(dateKey),
              isToday: dateKey === todayKey,
            });
            dayEvents.forEach((event) => {
              items.push({ kind: 'row', key: event.appointmentId, dateKey, event });
            });
          });
      });

    return { items, stickyHeaderIndices };
  }, [getMonthEventsByDateKey, listMonthOffsets, staffFilterId]);

  // Grows the loaded window forward by one month at a time, up to a cap.
  // Never drops already-loaded months (that eviction was what caused the
  // list to blank on fast scroll) — it's gated only by the array itself, so
  // repeated onEndReached calls while scrolling fast are naturally no-ops
  // once the next month is already in the window.
  const handleListLoadMore = React.useCallback(() => {
    setListMonthOffsets((prev) => {
      const highest = Math.max(...prev);
      const lowest = Math.min(...prev);
      if (highest - lowest + 1 >= LIST_MAX_LOADED_MONTHS || prev.includes(highest + 1)) {
        return prev;
      }
      return [...prev, highest + 1];
    });
  }, []);

  const listLoadingMore = React.useMemo(() => {
    if (viewMode !== 'list' || listMonthOffsets.length === 0) return false;
    const highest = Math.max(...listMonthOffsets);
    return loadingMonthKeys.has(monthKeyForOffset(highest).key);
  }, [listMonthOffsets, loadingMonthKeys, monthKeyForOffset, viewMode]);

  React.useEffect(() => {
    if (viewMode !== 'list' || !pendingListScrollRef.current) return;
    const targetDateKey = pendingListScrollRef.current;
    const index = listFlatData.items.findIndex((item) => item.kind === 'header' && item.dateKey === targetDateKey);
    if (index < 0) return;
    pendingListScrollRef.current = null;
    listAgendaRef.current?.scrollToIndex({ index, animated: true });
  }, [listFlatData, viewMode]);

  const handleMonthChange = React.useCallback(
    (index: number) => {
      const offset = offsets[index];
      if (offset === undefined) return;

      setCurrentOffset(offset);

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
    [offsets]
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

  const listKeyExtractor = React.useCallback((item: ListFlatItem) => item.key, []);

  const listGetItemType = React.useCallback((item: ListFlatItem) => item.kind, []);

  const renderListItem = React.useCallback(({ item }: { item: ListFlatItem }) => {
    if (item.kind === 'header') {
      return <ListSectionHeader title={item.title} isToday={item.isToday} />;
    }
    return <ListEventRow event={item.event} />;
  }, []);

  const renderMonthGrid = React.useCallback(
    (monthData: MonthData) => {
      const weeksToRender = [...monthData.weeks];
      while (weeksToRender.length > 5 && !weeksToRender[weeksToRender.length - 1].days.some((day) => day.inMonth)) {
        weeksToRender.pop();
      }

      return (
        <View style={styles.monthGrid}>
          {weeksToRender.map((week) => (
            <View key={`${monthData.key}-${week.weekNumber}`} style={styles.weekRow}>
              {week.days.map((day) => {
                const events = monthData.events[day.dateKey] ?? [];
                const visibleEvents = events.slice(0, 3);
                const hiddenCount = Math.max(0, events.length - visibleEvents.length);
                const isSelected = selectedDateKey === day.dateKey;

                return (
                  <Pressable
                    key={day.dateKey}
                    style={styles.dayCell}
                    onPress={() => {
                      if (selectedDateKey === day.dateKey) {
                        router.push({
                          pathname: '/day/[date]',
                          params: { date: day.dateKey, ...(staffFilterId ? { staffId: staffFilterId } : {}) },
                        });
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
                      {visibleEvents.map((event) => (
                        <View key={event.appointmentId} style={[styles.eventPill, { backgroundColor: event.bgColor }]}>
                          <Text style={[styles.eventText, { color: event.textColor }]} numberOfLines={1}>
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
    [selectedDateKey, staffFilterId, router]
  );

  const menuWidth = 190;
  const calendarTabCenterX = width / 8;
  const menuLeft = Math.max(12, calendarTabCenterX - menuWidth / 2);

  const showInitialLoading = staffLoading && !error;
  const showNoCompanyState = !staffLoading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {showInitialLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1b1b1b" />
        </View>
      ) : showNoCompanyState ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{t('calendar.noCompany')}</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.scrollContent}>
            <View style={styles.headerBlock} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
              <View style={styles.headerRow}>
                <View style={styles.monthRow}>
                  <Text style={styles.monthText}>{activeMonthLabel}</Text>
                  <MaterialIcons name="keyboard-arrow-down" size={22} color="#9a9a9a" />
                </View>
                <View style={styles.headerIcons}>
                  <TouchableOpacity style={styles.iconButton} onPress={handleRefresh} disabled={refreshing}>
                    {refreshing || isVisibleDataLoading ? (
                      <ActivityIndicator size="small" color="#1b1b1b" />
                    ) : (
                      <MaterialIcons name="refresh" size={20} color="#1b1b1b" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton}>
                    <MaterialIcons name="view-agenda" size={22} color="#1b1b1b" />
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText} numberOfLines={2}>
                    {error}
                  </Text>
                  <Pressable onPress={handleRefresh}>
                    <Text style={styles.errorBannerRetry}>{t('calendar.retry')}</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.employeeRow}>
                <Text style={styles.employeeLabel}>{t('calendar.employee')}</Text>
                <Pressable style={styles.employeeChip} onPress={() => setShowStaffMenu((prev) => !prev)}>
                  <StaffAvatar imagePath={selectedStaff?.image_path} name={selectedStaffName} size={26} fontSize={9} />
                  <Text style={styles.employeeName}>{selectedStaffName}</Text>
                  <MaterialIcons name="expand-more" size={18} color="#8b8b8b" />
                </Pressable>
              </View>
            </View>

            <View style={styles.calendarArea} onLayout={(event) => setCalendarAreaHeight(event.nativeEvent.layout.height)}>
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
                  getItemLayout={(_, index) => ({ length: gridWidth, offset: gridWidth * index, index })}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / gridWidth);
                    handleMonthChange(index);
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: gridWidth, height: calendarHeight }}>{renderMonthGrid(fetchMonthData(item))}</View>
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
                  getItemLayout={(_, index) => ({ length: gridWidth, offset: gridWidth * index, index })}
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
                                  router.push({
                                    pathname: '/day/[date]',
                                    params: { date: day.dateKey, ...(staffFilterId ? { staffId: staffFilterId } : {}) },
                                  });
                                  return;
                                }
                                setSelectedDateKey(day.dateKey);
                              }}>
                              <Text style={[styles.weekAgendaDate, day.isSunday && styles.dayNumberSunday]}>{day.date}</Text>
                              <Text style={styles.weekAgendaWeekday}>{day.weekday}</Text>
                            </Pressable>
                            <ScrollView style={styles.weekAgendaEvents} nestedScrollEnabled directionalLockEnabled showsVerticalScrollIndicator>
                              {day.appointments.map((event) => (
                                <View key={event.appointmentId} style={styles.weekAgendaEventRow}>
                                  <View style={[styles.weekAgendaColorBar, { backgroundColor: event.color }]} />
                                  <Text style={styles.weekAgendaTime}>{event.startTime}</Text>
                                  <Text style={styles.weekAgendaTitle} numberOfLines={1}>
                                    {event.label}
                                  </Text>
                                  <StaffAvatar
                                    imagePath={staffImageById.get(event.staffId ?? '')}
                                    name={event.staffName}
                                    size={18}
                                    fontSize={8}
                                  />
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
                <FlashList
                  ref={listAgendaRef}
                  data={listFlatData.items}
                  keyExtractor={listKeyExtractor}
                  getItemType={listGetItemType}
                  stickyHeaderIndices={listFlatData.stickyHeaderIndices}
                  showsVerticalScrollIndicator={false}
                  style={styles.listFullBleed}
                  contentContainerStyle={styles.listContent}
                  onEndReachedThreshold={0.4}
                  onEndReached={handleListLoadMore}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  ListFooterComponent={
                    listLoadingMore ? (
                      <View style={styles.listLoadingFooter}>
                        <ActivityIndicator size="small" color="#8b8b8b" />
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={styles.stateContainer}>
                      {isVisibleDataLoading ? (
                        <ActivityIndicator color="#8b8b8b" />
                      ) : (
                        <Text style={styles.stateText}>{t('calendar.noAppointmentsFound')}</Text>
                      )}
                    </View>
                  }
                  renderItem={renderListItem}
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
                  <Text style={styles.modeText}>{t('calendar.month')}</Text>
                  {viewMode === 'month' ? <MaterialIcons name="check" size={20} color="#20b87b" /> : null}
                </Pressable>
                <Pressable
                  style={styles.modeItem}
                  onPress={() => {
                    setViewMode('week');
                    setShowModeMenu(false);
                  }}>
                  <MaterialIcons name="view-week" size={20} color="#1b1b1b" />
                  <Text style={styles.modeText}>{t('calendar.week')}</Text>
                  {viewMode === 'week' ? <MaterialIcons name="check" size={20} color="#20b87b" /> : null}
                </Pressable>
                <Pressable
                  style={styles.modeItem}
                  onPress={() => {
                    setViewMode('list');
                    setShowModeMenu(false);
                  }}>
                  <MaterialIcons name="view-list" size={20} color="#1b1b1b" />
                  <Text style={styles.modeText}>{t('calendar.list')}</Text>
                  {viewMode === 'list' ? <MaterialIcons name="check" size={20} color="#20b87b" /> : null}
                </Pressable>
              </View>
            </>
          ) : null}

          {showStaffMenu ? (
            <>
              <Pressable style={styles.menuOverlay} onPress={() => setShowStaffMenu(false)} />
              <View style={styles.staffMenu}>
                <ScrollView>
                  <Pressable
                    style={styles.staffMenuItem}
                    onPress={() => {
                      setStaffFilterId(null);
                      setShowStaffMenu(false);
                    }}>
                    <View style={styles.staffMenuAvatar}>
                      <MaterialIcons name="groups" size={14} color="#4a4a4a" />
                    </View>
                    <Text style={styles.staffMenuName}>{t('calendar.allStaff')}</Text>
                    {staffFilterId === null ? <MaterialIcons name="check" size={18} color="#20b87b" /> : null}
                  </Pressable>
                  {staffList.map((staff) => {
                    const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || t('calendar.employee');
                    return (
                      <Pressable
                        key={staff.id}
                        style={styles.staffMenuItem}
                        onPress={() => {
                          setStaffFilterId(staff.id);
                          setShowStaffMenu(false);
                        }}>
                        <StaffAvatar imagePath={staff.image_path} name={name} size={22} fontSize={9} />
                        <Text style={styles.staffMenuName}>{name}</Text>
                        {staffFilterId === staff.id ? <MaterialIcons name="check" size={18} color="#20b87b" /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          ) : null}

          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push({ pathname: '/appointment-new', params: { date: selectedDateKey } })}>
            <MaterialIcons name="add" size={26} color="#1b1b1b" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
