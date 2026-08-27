import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Pressable } from '@/components/pressable-scale';

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel: string;
};

/**
 * Standard iOS swipe-to-reveal-delete: dragging left exposes a red button
 * that must be tapped to confirm — the swipe itself never deletes anything.
 */
export function SwipeableRow({ children, onDelete, deleteLabel }: Props) {
  const swipeableRef = React.useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}>
          <Text style={styles.deleteText}>{deleteLabel}</Text>
        </Pressable>
      )}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 88,
    backgroundColor: '#e5484d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
