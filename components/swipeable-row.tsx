import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppIcon } from '@/components/app-icon';

const ACTION_WIDTH = 76;
let openRow: SwipeableMethods | null = null;

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel: string;
};

function DeleteAction({ translation, onPress, label }: {
  translation: SharedValue<number>;
  onPress: () => void;
  label: string;
}) {
  const theme = Colors[useColorScheme() ?? 'light'];
  // Slide the action in with the row, without exposing a full-width red tray.
  const revealStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translation.value / ACTION_WIDTH)),
    transform: [{ translateX: Math.max(0, ACTION_WIDTH + translation.value) }],
  }));

  return (
    <Animated.View style={[styles.actionContainer, revealStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.deleteAction, { backgroundColor: theme.destructive }, pressed && styles.pressed]}
        onPress={onPress}>
        <AppIcon name="delete" size={23} color={theme.onDestructive} />
      </Pressable>
    </Animated.View>
  );
}

/** UI-thread swipe-to-reveal. Deletion requires tapping the revealed action. */
export function SwipeableRow({ children, onDelete, deleteLabel }: Props) {
  const swipeableRef = React.useRef<SwipeableMethods>(null);

  React.useEffect(() => {
    const row = swipeableRef.current;
    return () => {
      if (openRow === row) openRow = null;
    };
  }, []);

  const reveal = () => {
    if (openRow !== swipeableRef.current) openRow?.close();
    openRow = swipeableRef.current;
  };
  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1.25}
      animationOptions={{ stiffness: 240, damping: 32, mass: 1, overshootClamping: true }}
      rightThreshold={32}
      dragOffsetFromRightEdge={16}
      overshootLeft={false}
      overshootRight
      overshootFriction={10}
      onSwipeableOpenStartDrag={reveal}
      onSwipeableWillOpen={reveal}
      onSwipeableClose={() => {
        if (openRow === swipeableRef.current) openRow = null;
      }}
      renderRightActions={(_, translation) => (
        <DeleteAction translation={translation} label={deleteLabel} onPress={handleDelete} />
      )}>
      <View
        accessible
        accessibilityActions={[{ name: 'delete', label: deleteLabel }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') handleDelete();
        }}
        style={styles.content}>
        {children}
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: 56 },
  actionContainer: {
    width: ACTION_WIDTH,
    paddingLeft: 10,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  deleteAction: {
    minHeight: 44,
    maxHeight: 64,
    flex: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
