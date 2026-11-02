import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LiveScoreStrip } from '../src/components/LiveScoreStrip';
import { SheetRowPreview } from '../src/components/SheetRowPreview';
import { getTodayDateString } from '../src/domain/liveGameHelpers';
import { calculateGameStats } from '../src/domain/statCalculator';
import { Game, GameEvent } from '../src/domain/types';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
} from '../src/services/hapticsService';
import {
  copyRowToClipboard,
  exportGamesToCsv,
} from '../src/services/sheetsSyncService';
import { defaultGameRepository } from '../src/storage/gameRepository';
import { defaultPreferencesStore } from '../src/storage/preferencesStore';

export default function GameSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGameSummary = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await defaultPreferencesStore.getPreferences();

      let targetGame: Game | null = null;
      if (params.gameId && typeof params.gameId === 'string') {
        targetGame = await defaultGameRepository.getGameById(params.gameId);
      }
      if (!targetGame) {
        targetGame = await defaultGameRepository.getOrCreateActiveGame(
          getTodayDateString(),
          prefs.lastUsedPosition
        );
      }

      const gameEvents = await defaultGameRepository.getEventsForGame(
        targetGame.id
      );
      setGame(targetGame);
      setEvents(gameEvents);
    } finally {
      setLoading(false);
    }
  }, [params.gameId]);

  useEffect(() => {
    void loadGameSummary();
  }, [loadGameSummary]);

  const handleGoBack = () => {
    void triggerLightHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleCopyRow = async () => {
    if (!game) return;
    void triggerMediumHaptic();
    const row = calculateGameStats(game, events);
    await copyRowToClipboard(row, {
      formulaMode: 'blank_for_arrayformula',
    });
    const updatedGame = await defaultGameRepository.updateGameMetadata(
      game.id,
      {
        status: 'completed',
        syncedToSheets: true,
      }
    );
    setGame(updatedGame);
  };

  const handleExportCsv = async () => {
    if (!game) return;
    void triggerLightHaptic();
    const row = calculateGameStats(game, events);
    await exportGamesToCsv([row], {
      formulaMode: 'blank_for_arrayformula',
    });
    const updatedGame = await defaultGameRepository.updateGameMetadata(
      game.id,
      {
        status: 'completed',
        syncedToSheets: true,
      }
    );
    setGame(updatedGame);
  };

  if (loading || !game) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Loading Summary...</Text>
      </SafeAreaView>
    );
  }

  const stats = calculateGameStats(game, events);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Navigation Bar with Left Arrow Back Button */}
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Game Logging"
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.gameContextBadge}>
            <Text style={styles.gameContextText}>
              {game.gameDate} · {game.position}
            </Text>
          </View>
        </View>

        {/* Summarized Box Score View */}
        <LiveScoreStrip stats={stats} />

        {/* Data Sync Card */}
        <SheetRowPreview
          syncedToSheets={game.syncedToSheets}
          onCopyRow={handleCopyRow}
          onExportCsv={handleExportCsv}
        />
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
    paddingHorizontal: 14,
    paddingTop: 6,
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
    marginBottom: 8,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingRight: 12,
    gap: 4,
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '500',
    color: '#0A84FF',
    marginTop: -2,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#0A84FF',
  },
  gameContextBadge: {
    minHeight: 38,
    paddingHorizontal: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameContextText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});
