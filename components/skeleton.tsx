import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 12, radius = 8, style }: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.55 : 0.4);

  React.useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.bone,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

type CalendarMonthSkeletonProps = {
  weeks?: number;
};

export function CalendarMonthSkeleton({ weeks = 6 }: CalendarMonthSkeletonProps) {
  return (
    <View style={styles.monthGrid}>
      {Array.from({ length: weeks }, (_, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {Array.from({ length: 7 }, (__, dayIndex) => (
            <View key={dayIndex} style={styles.dayCell}>
              <Skeleton width={26} height={26} radius={13} style={styles.dayNumber} />
              <Skeleton height={14} radius={6} />
              <Skeleton width="70%" height={14} radius={6} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function CalendarListSkeleton() {
  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: 4 }, (_, section) => (
        <View key={section}>
          <View style={styles.listHeader}>
            <Skeleton width={160} height={14} />
          </View>
          {Array.from({ length: 3 }, (__, row) => (
            <View key={row} style={styles.listRow}>
              <Skeleton width={36} height={28} radius={6} />
              <Skeleton width={3} height={36} radius={2} />
              <View style={styles.listText}>
                <Skeleton width="55%" height={12} />
                <Skeleton width="40%" height={10} />
              </View>
              <Skeleton width={24} height={24} radius={12} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function DayTimelineSkeleton() {
  return (
    <View style={styles.timeline}>
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} style={styles.hourRow}>
          <Skeleton width={36} height={10} />
          <View style={styles.hourLine} />
        </View>
      ))}
      <View style={[styles.visit, { top: 28 }]}>
        <Skeleton height={56} radius={8} />
      </View>
      <View style={[styles.visit, { top: 120 }]}>
        <Skeleton height={72} radius={8} />
      </View>
      <View style={[styles.visit, { top: 230 }]}>
        <Skeleton width="70%" height={48} radius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    overflow: 'hidden',
  },
  monthGrid: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    flex: 1,
    paddingTop: 4,
  },
  dayCell: {
    flex: 1,
    paddingHorizontal: 2,
    gap: 4,
    alignItems: 'center',
  },
  dayNumber: {
    marginBottom: 2,
  },
  listSkeleton: {
    paddingTop: 4,
  },
  listHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  listText: {
    flex: 1,
    gap: 6,
  },
  timeline: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
    position: 'relative',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.25)',
  },
  visit: {
    position: 'absolute',
    left: 56,
    right: 12,
  },
});
