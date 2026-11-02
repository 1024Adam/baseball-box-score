import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BattingOutcome, SheetGameRow } from '../domain/types';

export interface BattingPadProps {
  stats: SheetGameRow;
  onRecordBatting: (outcome: BattingOutcome, rbi: number) => void;
}

const RBI_OPTIONS = [0, 1, 2, 3, 4] as const;

interface OutcomeButtonDef {
  outcome: BattingOutcome;
  label: string;
  subtitle: string;
  countKey: keyof SheetGameRow;
}

const HIT_BUTTONS: OutcomeButtonDef[] = [
  { outcome: '1B', label: '1B', subtitle: 'Single', countKey: 'singles' },
  { outcome: '2B', label: '2B', subtitle: 'Double', countKey: 'doubles' },
  { outcome: '3B', label: '3B', subtitle: 'Triple', countKey: 'triples' },
  { outcome: 'HR', label: 'HR', subtitle: 'Home Run', countKey: 'hr' },
];

const ON_BASE_BUTTONS: OutcomeButtonDef[] = [
  { outcome: 'BB', label: 'BB', subtitle: 'Walk', countKey: 'bb' },
  {
    outcome: 'E_BAT',
    label: 'E',
    subtitle: 'Error',
    countKey: 'eBatting',
  },
  {
    outcome: 'FC',
    label: 'FC',
    subtitle: "Fielder's Choice",
    countKey: 'fc',
  },
];

const OUT_BUTTONS: OutcomeButtonDef[] = [
  {
    outcome: 'FO',
    label: 'FO',
    subtitle: 'Fly / Line Out',
    countKey: 'fo',
  },
  {
    outcome: 'GO',
    label: 'GO',
    subtitle: 'Ground Out',
    countKey: 'go',
  },
  { outcome: 'K', label: 'K', subtitle: 'Strikeout', countKey: 'k' },
];

export function BattingPad({ stats, onRecordBatting }: BattingPadProps) {
  const [selectedRbi, setSelectedRbi] = useState<number | null>(null);

  const handleOutcomeTap = (outcome: BattingOutcome) => {
    const effectiveRbi =
      selectedRbi !== null ? selectedRbi : outcome === 'HR' ? 1 : 0;
    onRecordBatting(outcome, effectiveRbi);
    setSelectedRbi(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Batting</Text>

      {/* Full-Width Zero-Typing RBI Quick Bar */}
      <Text style={styles.groupLabel}>RBI on Play</Text>
      <View style={styles.rbiBar}>
        {RBI_OPTIONS.map((rbiVal) => {
          const isActive =
            selectedRbi === rbiVal || (selectedRbi === null && rbiVal === 0);
          return (
            <Pressable
              key={rbiVal}
              accessibilityRole="button"
              accessibilityLabel={`Set ${rbiVal} RBI for next play`}
              onPress={() => setSelectedRbi(rbiVal === 0 ? null : rbiVal)}
              style={({ pressed }) => [
                styles.rbiPill,
                isActive && styles.rbiPillActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.rbiPillText,
                  isActive && styles.rbiPillTextActive,
                ]}
              >
                {rbiVal === 0 ? '0' : `+${rbiVal}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Hits Group */}
      <Text style={styles.groupLabel}>Hits</Text>
      <View style={styles.gridRow}>
        {HIT_BUTTONS.map((btn) => {
          const count = Number(stats[btn.countKey] ?? 0);
          return (
            <Pressable
              key={btn.outcome}
              accessibilityRole="button"
              accessibilityLabel={`Log ${btn.subtitle}`}
              onPress={() => handleOutcomeTap(btn.outcome)}
              style={({ pressed }) => [
                styles.padButton,
                pressed && styles.buttonPressed,
              ]}
            >
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
              <Text style={styles.buttonMainText}>{btn.label}</Text>
              <Text style={styles.buttonSubText}>{btn.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* On Base / Misc Group */}
      <Text style={styles.groupLabel}>On Base</Text>
      <View style={styles.gridRow}>
        {ON_BASE_BUTTONS.map((btn) => {
          const count = Number(stats[btn.countKey] ?? 0);
          return (
            <Pressable
              key={btn.outcome}
              accessibilityRole="button"
              accessibilityLabel={`Log ${btn.subtitle}`}
              onPress={() => handleOutcomeTap(btn.outcome)}
              style={({ pressed }) => [
                styles.padButton,
                pressed && styles.buttonPressed,
              ]}
            >
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
              <Text style={styles.buttonMainText}>{btn.label}</Text>
              <Text style={styles.buttonSubText}>{btn.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Outs Group */}
      <Text style={styles.groupLabel}>Outs</Text>
      <View style={styles.gridRow}>
        {OUT_BUTTONS.map((btn) => {
          const count = Number(stats[btn.countKey] ?? 0);
          return (
            <Pressable
              key={btn.outcome}
              accessibilityRole="button"
              accessibilityLabel={`Log ${btn.subtitle}`}
              onPress={() => handleOutcomeTap(btn.outcome)}
              style={({ pressed }) => [
                styles.padButton,
                pressed && styles.buttonPressed,
              ]}
            >
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
              <Text style={styles.buttonMainText}>{btn.label}</Text>
              <Text style={styles.buttonSubText}>{btn.subtitle}</Text>
            </Pressable>
          );
        })}
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
    marginBottom: 6,
  },
  rbiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 4,
  },
  rbiPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rbiPillActive: {
    backgroundColor: '#636366',
  },
  rbiPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  rbiPillTextActive: {
    color: '#FFFFFF',
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 6,
    marginBottom: 5,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  padButton: {
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
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  buttonMainText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center',
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
