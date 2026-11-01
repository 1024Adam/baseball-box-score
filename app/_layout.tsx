import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
    </>
  );
}

