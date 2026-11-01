import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FieldingOutcome, SheetGameRow } from '../domain/types';

export interface FieldingPadProps {
  stats: SheetGameRow;
  onRecordFielding: (outcome: FieldingOutcome) => void;
}

export function FieldingPad({ stats, onRecordFielding }: FieldingPadProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Fielding</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log Putout"
          onPress={() => onRecordFielding('PO')}
          style={({ pressed }) => [
            styles.fieldButton,
            pressed && styles.pressed,
          ]}
        >
          {stats.po > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.po}</Text>
            </View>
          )}
          <Text style={styles.mainLabel}>PO</Text>
          <Text style={styles.subLabel}>Putout</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log Assist"
          onPress={() => onRecordFielding('ASSIST')}
          style={({ pressed }) => [
            styles.fieldButton,
            pressed && styles.pressed,
          ]}
        >
          {stats.assists > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.assists}</Text>
            </View>
          )}
          <Text style={styles.mainLabel}>A</Text>
          <Text style={styles.subLabel}>Assist</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log Fielding Error"
          onPress={() => onRecordFielding('E_FLD')}
          style={({ pressed }) => [
            styles.fieldButton,
            pressed && styles.pressed,
          ]}
        >
          {stats.errors > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.errors}</Text>
            </View>
          )}
          <Text style={styles.mainLabel}>E</Text>
          <Text style={styles.subLabel}>Error</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    position: 'relative',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  mainLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
