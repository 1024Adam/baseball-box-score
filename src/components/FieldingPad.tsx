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
      <Text style={styles.sectionTitle}>FIELDING CHANCES</Text>
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.po}</Text>
          </View>
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.assists}</Text>
          </View>
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.errors}</Text>
          </View>
          <Text style={styles.mainLabel}>E</Text>
          <Text style={styles.subLabel}>Error (Field)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: '#334155',
    borderColor: '#475569',
    position: 'relative',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  mainLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
});
