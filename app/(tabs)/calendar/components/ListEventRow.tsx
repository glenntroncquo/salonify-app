import { Pressable } from '@/components/pressable-scale';
import { VisitPhaseBar } from '@/components/visit-phase-bar';
import React from 'react';
import { Text, View } from 'react-native';

import { getInitialsFromLabel } from '@/lib/text';

import { listVisitBlockHeight } from '../calendar-data';
import { createStyles } from '../styles';
import { EventItem } from '../types';

type Props = {
  event: EventItem;
  onPress?: (event: EventItem) => void;
  styles: ReturnType<typeof createStyles>;
};

export const ListEventRow = React.memo(function ListEventRow({ event, onPress, styles }: Props) {
  const barHeight = listVisitBlockHeight(event);
  return (
    <Pressable style={[styles.listEventRow, { minHeight: barHeight + 16 }]} onPress={() => onPress?.(event)}>
      <View style={styles.listEventTimeCol}>
        <Text style={styles.listEventTime}>{event.startTime}</Text>
        <Text style={styles.listEventTimeMuted}>{event.endTime}</Text>
      </View>
      <View style={styles.listEventPhaseBar}>
        <VisitPhaseBar phases={event.phases} color={event.color} bgColor={event.bgColor} height={barHeight} />
      </View>
      <View style={styles.listEventTextCol}>
        <Text style={styles.listEventTitle} numberOfLines={1}>
          {event.label}
        </Text>
        <Text style={styles.listEventSubtitle} numberOfLines={1}>
          {event.clientName}
        </Text>
      </View>
      <View style={styles.listEventAvatar}>
        <Text style={styles.listEventAvatarText}>{getInitialsFromLabel(event.staffName)}</Text>
      </View>
    </Pressable>
  );
});
