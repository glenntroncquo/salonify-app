/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Monochrome accent: the accent *is* the theme's text color, so it flips
// naturally with light/dark mode instead of carrying a separate brand hue.
// `onTint` is the correct foreground for anything drawn on a tint-colored
// surface (e.g. a solid button) — it's the theme's background color, so
// contrast is automatic in both modes.
const textLight = '#11181C';
const textDark = '#ECEDEE';

export const Colors = {
  light: {
    text: textLight,
    background: '#fff',
    surface: '#F5F6F7',
    border: '#DCDFE1',
    muted: '#687076',
    error: '#E5484D',
    tint: textLight,
    onTint: '#fff',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: textLight,
  },
  dark: {
    // True black, Instagram-style: large flat surfaces read as clean rather
    // than a stack of gray card levels — structure comes from hairline
    // borders, not elevation.
    text: textDark,
    background: '#000000',
    surface: '#0A0A0A',
    border: '#262626',
    muted: '#A8A8A8',
    error: '#FF6B6B',
    tint: textDark,
    onTint: '#000000',
    icon: '#A8A8A8',
    tabIconDefault: '#A8A8A8',
    tabIconSelected: textDark,
  },
};
