import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { triggerLightHaptic } from '../services/hapticsService';

interface TabItem {
  label: string;
  href: '/' | '/history' | '/career' | '/settings';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: readonly TabItem[] = [
  {
    label: 'Live Game',
    href: '/',
    icon: 'baseball-outline',
    activeIcon: 'baseball',
  },
  {
    label: 'History',
    href: '/history',
    icon: 'time-outline',
    activeIcon: 'time',
  },
  {
    label: 'Career',
    href: '/career',
    icon: 'stats-chart-outline',
    activeIcon: 'stats-chart',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];

export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/summary') {
    return null;
  }

  return (
    <View style={styles.tabBar}>
      <View style={styles.tabInner}>
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/' || pathname === '/index'
              : pathname.startsWith(tab.href);

          return (
            <Pressable
              key={tab.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => {
                if (!isActive) {
                  void triggerLightHaptic();
                  router.replace(tab.href);
                }
              }}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={24}
                color={isActive ? '#FFFFFF' : '#8E8E93'}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    paddingVertical: 10,
  },
  tabInner: {
    flexDirection: 'row',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
