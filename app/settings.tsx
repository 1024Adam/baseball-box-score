import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PLAYER_POSITIONS,
  PlayerPosition,
} from '../src/domain/types';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
} from '../src/services/hapticsService';
import { exportGamesToCsv } from '../src/services/sheetsSyncService';
import { defaultGameRepository } from '../src/storage/gameRepository';
import { defaultPreferencesStore } from '../src/storage/preferencesStore';

export default function SettingsScreen() {
  const [defaultPosition, setDefaultPosition] = useState<string>('RCF');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await defaultPreferencesStore.getPreferences();
      setDefaultPosition(prefs.lastUsedPosition);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSelectDefaultPosition = async (pos: PlayerPosition) => {
    void triggerLightHaptic();
    setDefaultPosition(pos);
    await defaultPreferencesStore.setLastUsedPosition(pos);
  };

  const handleExportAllCsvBackup = async () => {
    void triggerMediumHaptic();
    const games = await defaultGameRepository.listGamesWithStats();
    const rows = games.map((g) => g.stats);
    await exportGamesToCsv(rows, {
      formulaMode: 'blank_for_arrayformula',
      filename: `baseball-box-score-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Loading Settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Default Starting Position */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Default Starting Position</Text>
          <Text style={styles.sectionSub}>
            Used automatically when starting a new game
          </Text>
          <View style={styles.positionGrid}>
            {PLAYER_POSITIONS.map((pos) => {
              const selected = defaultPosition === pos;
              return (
                <Pressable
                  key={pos}
                  accessibilityRole="button"
                  onPress={() => handleSelectDefaultPosition(pos)}
                  style={[
                    styles.posChip,
                    selected && styles.posChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.posChipText,
                      selected && styles.posChipTextSelected,
                    ]}
                  >
                    {pos}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Full CSV Backup */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Full Data Backup</Text>
          <Text style={styles.sectionSub}>
            Export all recorded games as a 23-column CSV file
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleExportAllCsvBackup}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              Export All Games (.CSV)
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 12,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  posChip: {
    width: '23%',
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  posChipSelected: {
    backgroundColor: '#0A84FF',
  },
  posChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  posChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});
