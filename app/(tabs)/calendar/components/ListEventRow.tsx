import React from 'react';
import { Text, View } from 'react-native';

import { getInitialsFromLabel } from '@/lib/text';

import { styles } from '../styles';
import { ListRowItem } from '../types';

type Props = {
  item: ListRowItem;
};

export const ListEventRow = React.memo(function ListEventRow({ item }: Props) {
  return (
    <View style={styles.listEventRow}>
      <View style={styles.listEventTimeCol}>
        <Text style={styles.listEventTime}>{item.startTime}</Text>
        <Text style={styles.listEventTimeMuted}>{item.endTime}</Text>
      </View>
      <View style={[styles.listEventBar, { backgroundColor: item.color }]} />
      <View style={styles.listEventTextCol}>
        <Text style={styles.listEventTitle} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={styles.listEventSubtitle} numberOfLines={1}>
          {item.clientName}
        </Text>
      </View>
      <View style={styles.listEventAvatar}>
        <Text style={styles.listEventAvatarText}>{getInitialsFromLabel(item.staffName)}</Text>
      </View>
    </View>
  );
});
