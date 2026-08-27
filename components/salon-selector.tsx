import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { StaffAvatar } from '@/components/staff-avatar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Salon = {
  id: string;
  name: string;
  imagePath?: string | null;
};

// Placeholder data for a not-yet-built feature: a staff member can belong to
// more than one company/location, and needs a way to say which one(s) they
// want appointments from. Purely visual for now — selection doesn't filter
// anything yet.
const MOCK_SALONS: Salon[] = [
  { id: 'salon', name: 'Salon' },
  { id: 'personal', name: 'Personal' },
];

const THUMB_SIZE = 20;

type Props = {
  salons?: Salon[];
};

export function SalonSelector({ salons = MOCK_SALONS }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  // Multi-select, all selected by default — matches "viewing everything I
  // have access to" as the natural starting state.
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set(salons.map((salon) => salon.id)));

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {salons.map((salon) => {
        const isSelected = selectedIds.has(salon.id);
        return (
          <Pressable
            key={salon.id}
            style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
            onPress={() => toggle(salon.id)}>
            <StaffAvatar
              imagePath={salon.imagePath}
              name={salon.name}
              size={THUMB_SIZE}
              backgroundColor={isSelected ? theme.onTint : theme.border}
              textColor={isSelected ? theme.tint : theme.muted}
              fontSize={9}
            />
            <Text style={[styles.label, isSelected ? styles.labelSelected : styles.labelUnselected]} numberOfLines={1}>
              {salon.name}
            </Text>
            {isSelected ? <AppIcon name="check" size={13} color={theme.onTint} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 10,
      paddingBottom: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 6,
      paddingRight: 10,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipSelected: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    chipUnselected: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
    },
    labelSelected: {
      color: theme.onTint,
    },
    labelUnselected: {
      color: theme.text,
    },
  });
