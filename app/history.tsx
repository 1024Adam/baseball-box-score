import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  formatLiveBattingLine,
  formatLiveFieldingLine,
  getTodayDateString,
} from '../src/domain/liveGameHelpers';
import { Game, SheetGameRow } from '../src/domain/types';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
} from '../src/services/hapticsService';
import { copyRowToClipboard } from '../src/services/sheetsSyncService';
import { defaultGameRepository } from '../src/storage/gameRepository';
import { defaultPreferencesStore } from '../src/storage/preferencesStore';

const DELETE_ACTION_WIDTH = 92;

interface SwipeableHistoryCardProps {
  game: Game;
  stats: SheetGameRow;
  eventCount: number;
  onEdit: () => void;
  onSummary: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function SwipeableHistoryCard({
  game,
  stats,
  eventCount,
  onEdit,
  onSummary,
  onCopy,
  onDelete,
}: SwipeableHistoryCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);

  const animateTo = useCallback(
    (toValue: number, openState: boolean) => {
      isOpenRef.current = openState;
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    },
    [translateX]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
        onPanResponderMove: (_evt, gestureState) => {
          const baseOffset = isOpenRef.current ? -DELETE_ACTION_WIDTH : 0;
          const nextX = Math.min(
            0,
            Math.max(-DELETE_ACTION_WIDTH * 1.6, baseOffset + gestureState.dx)
          );
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const baseOffset = isOpenRef.current ? -DELETE_ACTION_WIDTH : 0;
          const finalDx = baseOffset + gestureState.dx;

          if (finalDx < -DELETE_ACTION_WIDTH * 1.35 || gestureState.vx < -1.2) {
            onDelete();
            return;
          }

          if (finalDx < -DELETE_ACTION_WIDTH / 2 || gestureState.vx < -0.35) {
            void triggerLightHaptic();
            animateTo(-DELETE_ACTION_WIDTH, true);
          } else {
            animateTo(0, false);
          }
        },
        onPanResponderTerminate: () => {
          animateTo(isOpenRef.current ? -DELETE_ACTION_WIDTH : 0, isOpenRef.current);
        },
      }),
    [animateTo, onDelete, translateX]
  );

  return (
    <View style={styles.swipeContainer}>
      {/* Red iOS Delete Action Behind Card */}
      <View style={styles.deleteBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete game from ${game.gameDate}`}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.deleteActionText}>Delete</Text>
        </Pressable>
      </View>

      {/* Foreground Game Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.gameCard,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.datePosGroup}>
            <Text style={styles.gameDateText}>{game.gameDate}</Text>
            <View style={styles.posBadge}>
              <Text style={styles.posBadgeText}>{game.position}</Text>
            </View>
          </View>

          <View
            style={[
              styles.syncBadge,
              game.syncedToSheets
                ? styles.syncBadgeSynced
                : styles.syncBadgeUnsynced,
            ]}
          >
            <Text
              style={[
                styles.syncBadgeText,
                game.syncedToSheets && styles.syncBadgeTextSynced,
              ]}
            >
              {game.syncedToSheets ? '✓ Copied' : 'Unsynced'}
            </Text>
          </View>
        </View>

        <View style={styles.linesBlock}>
          <Text style={styles.statLineText} numberOfLines={1}>
            <Text style={styles.statLineLabel}>Batting  </Text>
            {formatLiveBattingLine(stats)}
          </Text>
          <Text style={styles.statLineText} numberOfLines={1}>
            <Text style={styles.statLineLabel}>Fielding </Text>
            {formatLiveFieldingLine(stats)}
          </Text>
        </View>

        <View style={styles.cardActionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit game from ${game.gameDate}`}
            onPress={onEdit}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cardActionText}>
              Edit Plays ({eventCount})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View summary for ${game.gameDate}`}
            onPress={onSummary}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cardActionText}>Summary</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Copy row for ${game.gameDate}`}
            onPress={onCopy}
            style={({ pressed }) => [
              styles.copyActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.copyActionText}>Copy Row</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default function GameHistoryScreen() {
  const router = useRouter();
  const [games, setGames] = useState<
    Array<{ game: Game; stats: SheetGameRow; eventCount: number }>
  >([]);
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

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const list = await defaultGameRepository.listGamesWithStats();
      setGames(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const handleStartNewGame = async () => {
    void triggerMediumHaptic();
    const prefs = await defaultPreferencesStore.getPreferences();
    const newGame = await defaultGameRepository.startNewGame(
      getTodayDateString(),
      prefs.lastUsedPosition
    );
    router.replace({
      pathname: '/',
      params: { gameId: newGame.id },
    });
  };

  const handleOpenGameToEdit = (gameId: string) => {
    void triggerLightHaptic();
    router.replace({
      pathname: '/',
      params: { gameId },
    });
  };

  const handleOpenGameSummary = (gameId: string) => {
    void triggerLightHaptic();
    router.push({
      pathname: '/summary',
      params: { gameId },
    });
  };

  const handleQuickCopy = async (game: Game, stats: SheetGameRow) => {
    void triggerMediumHaptic();
    await copyRowToClipboard(stats, {
      formulaMode: 'blank_for_arrayformula',
    });
    await defaultGameRepository.updateGameMetadata(game.id, {
      status: 'completed',
      syncedToSheets: true,
    });
    await loadGames();
    showFloatingToast('✓ Copied data row');
  };

  const handleDeleteGame = async (gameId: string) => {
    void triggerMediumHaptic();
    await defaultGameRepository.deleteGame(gameId);
    await loadGames();
    showFloatingToast('Deleted game');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Loading Game History...</Text>
      </SafeAreaView>
    );
  }

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
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>History</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new game"
            onPress={handleStartNewGame}
            style={({ pressed }) => [
              styles.newGameButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.newGameButtonText}>+ New Game</Text>
          </Pressable>
        </View>

        {games.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Games Recorded Yet</Text>
            <Text style={styles.emptySub}>
              Log plays in the Live Game tab or tap "+ New Game" above.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {games.map(({ game, stats, eventCount }) => (
              <SwipeableHistoryCard
                key={game.id}
                game={game}
                stats={stats}
                eventCount={eventCount}
                onEdit={() => handleOpenGameToEdit(game.id)}
                onSummary={() => handleOpenGameSummary(game.id)}
                onCopy={() => handleQuickCopy(game, stats)}
                onDelete={() => handleDeleteGame(game.id)}
              />
            ))}
          </View>
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newGameButton: {
    minHeight: 42,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGameButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
  },
  emptyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  swipeContainer: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  deleteBackdrop: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    right: 1,
    width: DELETE_ACTION_WIDTH,
    backgroundColor: '#FF453A',
    borderTopRightRadius: 13,
    borderBottomRightRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  gameCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  datePosGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameDateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  posBadge: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  posBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
  },
  syncBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  syncBadgeSynced: {
    backgroundColor: '#30D158',
  },
  syncBadgeUnsynced: {
    backgroundColor: '#2C2C2E',
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  syncBadgeTextSynced: {
    color: '#000000',
    fontWeight: '700',
  },
  linesBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
    paddingVertical: 10,
    gap: 5,
    marginBottom: 10,
  },
  statLineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  statLineLabel: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyActionButton: {
    flex: 1,
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  copyActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});
