import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

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
          title: t('tabs.calendar'),
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
          title: t('tabs.clients'),
          tabBarIcon: ({ color }) => <MaterialIcons name="people-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
