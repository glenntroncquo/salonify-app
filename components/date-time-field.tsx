import { Pressable } from '@/components/pressable-scale';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function mergeDatePart(base: Date, picked: Date) {
  const next = new Date(base);
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return next;
}

function mergeTimePart(base: Date, picked: Date) {
  const next = new Date(base);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

type Props = {
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  formatLabel: (date: Date) => string;
  doneLabel: string;
};

/**
 * Cross-platform date/time pill: native picker on iOS/Android, a real HTML
 * input on web (the underlying `@react-native-community/datetimepicker`
 * renders nothing on web at all — `console.warn`s and returns null).
 */
export function DateTimeField({ value, mode, onChange, formatLabel, doneLabel }: Props) {
  const [visible, setVisible] = React.useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (Platform.OS === 'web') {
    return (
      <input
        type={mode}
        value={mode === 'date' ? toDateInputValue(value) : toTimeInputValue(value)}
        onChange={(event) => {
          if (mode === 'date') {
            const [y, m, d] = event.target.value.split('-').map(Number);
            if (y && m && d) {
              const next = new Date(value);
              next.setFullYear(y, m - 1, d);
              onChange(next);
            }
          } else {
            const [h, mm] = event.target.value.split(':').map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(mm)) {
              const next = new Date(value);
              next.setHours(h, mm, 0, 0);
              onChange(next);
            }
          }
        }}
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.text,
          padding: '8px 12px',
          borderRadius: 18,
          border: `1px solid ${theme.border}`,
          backgroundColor: theme.surface,
        }}
      />
    );
  }

  return (
    <>
      <Pressable style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => setVisible(true)}>
        <Text style={[styles.pillText, { color: theme.text }]}>{formatLabel(value)}</Text>
      </Pressable>

      {Platform.OS === 'android' && visible ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={(event, selected) => {
            setVisible(false);
            if (event.type === 'set' && selected) {
              onChange(mode === 'date' ? mergeDatePart(value, selected) : mergeTimePart(value, selected));
            }
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && visible ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={(event) => event.stopPropagation()}>
              <View style={styles.doneRow}>
                <Pressable onPress={() => setVisible(false)}>
                  <Text style={[styles.doneText, { color: theme.tint }]}>{doneLabel}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={value}
                mode={mode}
                display="spinner"
                onChange={(_, selected) => {
                  if (selected) onChange(mode === 'date' ? mergeDatePart(value, selected) : mergeTimePart(value, selected));
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
  },
  doneRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
