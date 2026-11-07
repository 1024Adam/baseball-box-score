import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export interface SecondaryButtonProps {
  title: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}

export function SecondaryButton({
  title,
  accessibilityLabel,
  disabled = false,
  onPress,
}: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.title, disabled && styles.titleDisabled]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    minHeight: 50,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  titleDisabled: {
    color: '#8E8E93',
  },
  pressed: {
    opacity: 0.7,
  },
});
