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
        <ActivityIndicator size="large" color="#94a3b8" />
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
            <Text style={styles.backArrow}>←</Text>
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

        {/* 23-Column Google Sheets Preview & Copy / Export Buttons */}
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
    backgroundColor: '#0f172a',
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
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingToastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    gap: 6,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  backText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  gameContextBadge: {
    minHeight: 46,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameContextText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  pressed: {
    opacity: 0.75,
  },
});
