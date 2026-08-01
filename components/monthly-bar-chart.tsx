import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type BarChartSeries = {
  label: string;
  color: string;
};

export type BarChartDatum = {
  label: string;
  values: number[];
};

const CHART_HEIGHT = 120;

/** Dependency-free grouped/single bar chart — proportionate to this feature's scope (a handful of simple monthly trend charts), not worth a new charting library. */
export function MonthlyBarChart({
  data,
  series,
  formatValue,
}: {
  data: BarChartDatum[];
  series: BarChartSeries[];
  formatValue: (value: number) => string;
}) {
  const maxValue = Math.max(1, ...data.flatMap((d) => d.values));

  return (
    <View>
      <View style={styles.chartRow}>
        {data.map((datum, index) => (
          <View key={index} style={styles.barGroup}>
            <View style={styles.barsContainer}>
              {datum.values.map((value, seriesIndex) => (
                <View
                  key={seriesIndex}
                  style={[
                    styles.bar,
                    {
                      height: Math.max(2, (value / maxValue) * CHART_HEIGHT),
                      backgroundColor: series[seriesIndex]?.color ?? '#1b1b1b',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.barLabel}>{datum.label}</Text>
          </View>
        ))}
      </View>

      {series.length > 1 ? (
        <View style={styles.legendRow}>
          {series.map((s, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.maxValueHint}>{formatValue(maxValue)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 24,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_HEIGHT,
  },
  bar: {
    width: 10,
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 11,
    color: '#8b8b8b',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#8b8b8b',
  },
  maxValueHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#c6c6c6',
    textAlign: 'right',
  },
});
