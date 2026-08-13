import React from 'react';
import { Text, View } from 'react-native';

import { getInitialsFromLabel } from '@/lib/text';

import { styles } from '../styles';
import { EventItem } from '../types';

type Props = {
  event: EventItem;
};

export const ListEventRow = React.memo(function ListEventRow({ event }: Props) {
  return (
    <View style={styles.listEventRow}>
      <View style={styles.listEventTimeCol}>
        <Text style={styles.listEventTime}>{event.startTime}</Text>
        <Text style={styles.listEventTimeMuted}>{event.endTime}</Text>
      </View>
      <View style={[styles.listEventBar, { backgroundColor: event.color }]} />
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
    </View>
  );
});
