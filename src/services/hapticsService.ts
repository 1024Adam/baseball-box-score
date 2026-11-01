import { Platform } from 'react-native';

/**
 * Triggers native iOS/Android haptic feedback while safely no-oping on Web or in tests.
 */
export async function triggerLightHaptic(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignore on unsupported devices/simulators
  }
}

export async function triggerMediumHaptic(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Ignore on unsupported devices/simulators
  }
}
