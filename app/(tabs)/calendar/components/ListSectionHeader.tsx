import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../styles';

type Props = {
  title: string;
  isToday: boolean;
};

export const ListSectionHeader = React.memo(function ListSectionHeader({ title, isToday }: Props) {
  return (
    <View style={styles.listStickyHeader}>
      <Text style={styles.listStickyTitle}>{title}</Text>
      {isToday ? <Text style={styles.listStickyToday}>Today</Text> : null}
    </View>
  );
});
