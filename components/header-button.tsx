import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

/**
 * For content rendered inside a native Stack.Screen `headerLeft`/`headerRight`
 * slot only — deliberately NOT the app's animated `Pressable`. On iOS 26,
 * react-native-screens measures this view to size and center the native
 * header-button capsule (Liquid Glass), and a Reanimated-driven
 * `Animated.View` throws that measurement off, leaving the icon visibly
 * off-center inside the bubble. Native header buttons already get the OS's
 * own press feedback for free, so a plain opacity dip is enough here.
 */
export const HeaderButton = React.forwardRef<React.ComponentRef<typeof Pressable>, PressableProps>(
  function HeaderButton({ style, ...rest }, ref) {
    return (
      <Pressable
        ref={ref}
        style={(state) => [typeof style === 'function' ? style(state) : style, state.pressed && { opacity: 0.5 }]}
        {...rest}
      />
    );
  }
);
