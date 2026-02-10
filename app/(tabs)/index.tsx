import React from 'react';
import {
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type CalendarDay = {
  date: number;
  inMonth: boolean;
  isSunday?: boolean;
};

const months = [
  {
    label: 'Jan 2026',
    weeks: [
      {
        week: 1,
        days: [
          { date: 29, inMonth: false },
          { date: 30, inMonth: false },
          { date: 31, inMonth: false },
          { date: 1, inMonth: true },
          { date: 2, inMonth: true },
          { date: 3, inMonth: true },
          { date: 4, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 2,
        days: [
          { date: 5, inMonth: true },
          { date: 6, inMonth: true },
          { date: 7, inMonth: true },
          { date: 8, inMonth: true },
          { date: 9, inMonth: true },
          { date: 10, inMonth: true },
          { date: 11, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 3,
        days: [
          { date: 12, inMonth: true },
          { date: 13, inMonth: true },
          { date: 14, inMonth: true },
          { date: 15, inMonth: true },
          { date: 16, inMonth: true },
          { date: 17, inMonth: true },
          { date: 18, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 4,
        days: [
          { date: 19, inMonth: true },
          { date: 20, inMonth: true },
          { date: 21, inMonth: true },
          { date: 22, inMonth: true },
          { date: 23, inMonth: true },
          { date: 24, inMonth: true },
          { date: 25, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 5,
        days: [
          { date: 26, inMonth: true },
          { date: 27, inMonth: true },
          { date: 28, inMonth: true },
          { date: 29, inMonth: true },
          { date: 30, inMonth: true },
          { date: 31, inMonth: true },
          { date: 1, inMonth: false, isSunday: true },
        ],
      },
    ],
    events: {
      '2-8': [
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Extensions', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Kleuring', color: '#ffe8b5', textColor: '#c98200' },
        { label: 'Cristal: Lo', color: '#d4ecff', textColor: '#2e7dd1' },
      ],
      '3-14': [{ label: 'Afspraak T', color: '#ffd4dc', textColor: '#e05668' }],
      '4-22': [
        { label: 'Balayage', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Keratine', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
      ],
    },
  },
  {
    label: 'Feb 2026',
    weeks: [
      {
        week: 5,
        days: [
          { date: 26, inMonth: false },
          { date: 27, inMonth: false },
          { date: 28, inMonth: false },
          { date: 29, inMonth: false },
          { date: 30, inMonth: false },
          { date: 31, inMonth: false },
          { date: 1, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 6,
        days: [
          { date: 2, inMonth: true },
          { date: 3, inMonth: true },
          { date: 4, inMonth: true },
          { date: 5, inMonth: true },
          { date: 6, inMonth: true },
          { date: 7, inMonth: true },
          { date: 8, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 7,
        days: [
          { date: 9, inMonth: true },
          { date: 10, inMonth: true },
          { date: 11, inMonth: true },
          { date: 12, inMonth: true },
          { date: 13, inMonth: true },
          { date: 14, inMonth: true },
          { date: 15, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 8,
        days: [
          { date: 16, inMonth: true },
          { date: 17, inMonth: true },
          { date: 18, inMonth: true },
          { date: 19, inMonth: true },
          { date: 20, inMonth: true },
          { date: 21, inMonth: true },
          { date: 22, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 9,
        days: [
          { date: 23, inMonth: true },
          { date: 24, inMonth: true },
          { date: 25, inMonth: true },
          { date: 26, inMonth: true },
          { date: 27, inMonth: true },
          { date: 28, inMonth: true },
          { date: 1, inMonth: false, isSunday: true },
        ],
      },
    ],
    events: {
      '5-29': [
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Cristal: Ari', color: '#d4ecff', textColor: '#2e7dd1' },
        { label: 'Kleuring m', color: '#ffe8b5', textColor: '#c98200' },
        { label: 'Afspraak T', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Cristal: All', color: '#d4ecff', textColor: '#2e7dd1' },
      ],
      '5-30': [{ label: 'Kleuring Fl', color: '#ffe8b5', textColor: '#c98200' }],
      '5-31': [{ label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' }],
      '5-1': [{ label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' }],
      '6-7': [
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Keratine +', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Balayage J', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Kleur', color: '#ffe8b5', textColor: '#c98200' },
      ],
      '6-11': [{ label: 'Extensions', color: '#ffd4dc', textColor: '#e05668' }],
      '6-13': [
        { label: 'Lien knipp', color: '#c9f4dd', textColor: '#1a8f5a' },
        { label: 'Keratine ha', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Zoë inste', color: '#ffd4dc', textColor: '#e05668' },
      ],
      '6-14': [
        { label: 'Valentijnsc', color: '#bfbfbf', textColor: '#ffffff' },
        { label: 'Carmella', color: '#ffd4dc', textColor: '#e05668' },
      ],
      '6-16': [
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
      ],
      '6-18': [{ label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' }],
      '6-27': [
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Kleur', color: '#ffe8b5', textColor: '#c98200' },
        { label: 'Keratine +', color: '#ffd4dc', textColor: '#e05668' },
      ],
      '6-28': [{ label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' }],
    },
  },
  {
    label: 'Mar 2026',
    weeks: [
      {
        week: 9,
        days: [
          { date: 23, inMonth: false },
          { date: 24, inMonth: false },
          { date: 25, inMonth: false },
          { date: 26, inMonth: false },
          { date: 27, inMonth: false },
          { date: 28, inMonth: false },
          { date: 1, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 10,
        days: [
          { date: 2, inMonth: true },
          { date: 3, inMonth: true },
          { date: 4, inMonth: true },
          { date: 5, inMonth: true },
          { date: 6, inMonth: true },
          { date: 7, inMonth: true },
          { date: 8, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 11,
        days: [
          { date: 9, inMonth: true },
          { date: 10, inMonth: true },
          { date: 11, inMonth: true },
          { date: 12, inMonth: true },
          { date: 13, inMonth: true },
          { date: 14, inMonth: true },
          { date: 15, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 12,
        days: [
          { date: 16, inMonth: true },
          { date: 17, inMonth: true },
          { date: 18, inMonth: true },
          { date: 19, inMonth: true },
          { date: 20, inMonth: true },
          { date: 21, inMonth: true },
          { date: 22, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 13,
        days: [
          { date: 23, inMonth: true },
          { date: 24, inMonth: true },
          { date: 25, inMonth: true },
          { date: 26, inMonth: true },
          { date: 27, inMonth: true },
          { date: 28, inMonth: true },
          { date: 29, inMonth: true, isSunday: true },
        ],
      },
      {
        week: 14,
        days: [
          { date: 30, inMonth: true },
          { date: 31, inMonth: true },
          { date: 1, inMonth: false },
          { date: 2, inMonth: false },
          { date: 3, inMonth: false },
          { date: 4, inMonth: false },
          { date: 5, inMonth: false, isSunday: true },
        ],
      },
    ],
    events: {
      '10-3': [{ label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' }],
      '11-11': [
        { label: 'Keratine +', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Kleuring', color: '#ffe8b5', textColor: '#c98200' },
      ],
      '12-21': [
        { label: 'Klant haar/', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Cristal: All', color: '#d4ecff', textColor: '#2e7dd1' },
        { label: 'Afspraak T', color: '#ffd4dc', textColor: '#e05668' },
        { label: 'Kleur', color: '#ffe8b5', textColor: '#c98200' },
        { label: 'Balayage J', color: '#ffd4dc', textColor: '#e05668' },
      ],
    },
  },
];

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list'>('month');
  const [currentMonthIndex, setCurrentMonthIndex] = React.useState(1);
  const [selectedDayKey, setSelectedDayKey] = React.useState('7-10');

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('calendarModeMenu', () => {
      setShowModeMenu((prev) => !prev);
    });
    return () => subscription.remove();
  }, []);

  const menuWidth = 190;
  const calendarTabCenterX = width / 8;
  const menuLeft = Math.max(12, calendarTabCenterX - menuWidth / 2);

  const currentMonth = months[currentMonthIndex];
  const selectedEvents = currentMonth.events[selectedDayKey] ?? [];

  const visibleWeeks =
    viewMode === 'week'
      ? currentMonth.weeks.filter((week) =>
          week.days.some((day) => `${week.week}-${day.date}` === selectedDayKey)
        )
      : currentMonth.weeks;


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

          <View>
            {visibleWeeks.map((week) => (
              <View key={week.week} style={styles.weekRow}>
                <Text style={styles.weekNumber}>{week.week}</Text>
                {week.days.map((day, index) => {
                  const key = `${week.week}-${day.date}`;
                  const events = currentMonth.events[key] ?? [];
                  const maxVisibleEvents = viewMode === 'month' ? 3 : 5;
                  const visibleEvents = events.slice(0, maxVisibleEvents);
                  const hiddenCount = Math.max(0, events.length - visibleEvents.length);
                  const isSelected = selectedDayKey === key;
                  return (
                    <Pressable
                      key={`${week.week}-${index}`}
                      style={styles.dayCell}
                      onPress={() => setSelectedDayKey(key)}>
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
                            key={`${key}-${eventIndex}`}
                            style={[styles.eventPill, { backgroundColor: event.color }]}>
                            <Text
                              style={[styles.eventText, { color: event.textColor ?? '#e05668' }]}>
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
        </View>

        {viewMode !== 'month' ? (
          <View style={styles.detailPanel}>
            <Text style={styles.detailTitle}>
              {viewMode === 'week' ? 'Week view (fake data)' : 'List view (fake data)'}
            </Text>
            {selectedEvents.length === 0 ? (
              <Text style={styles.detailEmpty}>No appointments</Text>
            ) : (
              selectedEvents.map((event, index) => (
                <View key={`${selectedDayKey}-detail-${index}`} style={styles.detailRow}>
                  <View style={[styles.detailDot, { backgroundColor: event.color }]} />
                  <Text style={styles.detailText}>{event.label}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

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
    minHeight: 86,
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
  detailPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b1b1b',
    marginBottom: 10,
  },
  detailEmpty: {
    fontSize: 13,
    color: '#8b8b8b',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  detailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailText: {
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
