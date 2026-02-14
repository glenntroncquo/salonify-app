import React from 'react';
import { Text, View } from 'react-native';

import { getInitialsFromLabel } from '../date-utils';
import { styles } from '../styles';
import { ListRowItem } from '../types';

type Props = {
  item: ListRowItem;
};

export const ListEventRow = React.memo(function ListEventRow({ item }: Props) {
  const primaryColor = !item.textColor || item.textColor === '#ffffff' ? '#8b8b8b' : item.textColor;

  return (
    <View style={styles.listEventRow}>
      <View style={styles.listEventTimeCol}>
        <Text style={[styles.listEventTime, { color: primaryColor }]}>
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
  );
});
