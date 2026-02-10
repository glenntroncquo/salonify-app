import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DeviceEventEmitter } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={26} color={color} />,
          tabBarButton: (props) => (
            <HapticTab
              {...props}
              onPress={(event) => {
                props.onPress?.(event);
                DeviceEventEmitter.emit('calendarGoToToday');
              }}
              onLongPress={(event) => {
                props.onLongPress?.(event);
                DeviceEventEmitter.emit('calendarModeMenu');
              }}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            DeviceEventEmitter.emit('calendarGoToToday');
          },
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'List',
          tabBarIcon: ({ color }) => <MaterialIcons name="view-list" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <MaterialIcons name="notifications-none" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
