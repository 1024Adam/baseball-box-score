import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LiveScoreStrip } from '../src/components/LiveScoreStrip';
import { SheetRowPreview } from '../src/components/SheetRowPreview';
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

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function GameSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const showFloatingToast = useCallback(
    (message: string) => {
      if (toastAnimRef.current) {
        toastAnimRef.current.stop();
      }
      setToastText(message);
      toastOpacity.setValue(0);

      const anim = Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.delay(1100),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]);

      toastAnimRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) {
          setToastText(null);
        }
      });
    },
    [toastOpacity]
  );

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
    showFloatingToast('✓ Copied data row');
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
      {toastText && (
        <Animated.View
          pointerEvents="none"
          style={[styles.floatingToastContainer, { opacity: toastOpacity }]}
        >
          <View style={styles.floatingToastPill}>
            <Text style={styles.floatingToastText}>{toastText}</Text>
          </View>
        </Animated.View>
      )}

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
          stats={stats}
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
    position: 'relative',
  },
  floatingToastContainer: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: 'center',
  },
  floatingToastPill: {
    backgroundColor: '#2C2C2E',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingToastText: {
    color: '#30D158',
    fontSize: 15,
    fontWeight: '600',
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
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
    minHeight: 36,
    paddingHorizontal: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
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
