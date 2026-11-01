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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BattingPad } from '../src/components/BattingPad';
import { EventTimeline } from '../src/components/EventTimeline';
import { FieldingPad } from '../src/components/FieldingPad';
import { calculateGameStats } from '../src/domain/statCalculator';
import {
  BattingOutcome,
  FieldingOutcome,
  Game,
  GameEvent,
  PLAYER_POSITIONS,
  PlayerPosition,
} from '../src/domain/types';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
} from '../src/services/hapticsService';
import { defaultGameRepository } from '../src/storage/gameRepository';
import { defaultPreferencesStore } from '../src/storage/preferencesStore';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateStr: string, deltaDays: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return getTodayDateString();
  }
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + deltaDays);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LiveGameDugoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const loadActiveGame = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await defaultPreferencesStore.getPreferences();

      let targetGame: Game | null = null;
      if (params.gameId && typeof params.gameId === 'string') {
        targetGame = await defaultGameRepository.getGameById(params.gameId);
      }
      if (!targetGame) {
        const today = getTodayDateString();
        targetGame = await defaultGameRepository.getOrCreateActiveGame(
          today,
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
    void loadActiveGame();
  }, [loadActiveGame]);

  const handleRecordBatting = async (outcome: BattingOutcome, rbi: number) => {
    if (!game) return;
    void triggerLightHaptic();
    await defaultGameRepository.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: outcome,
      rbi,
    });
    const updatedEvents = await defaultGameRepository.getEventsForGame(game.id);
    setEvents(updatedEvents);
  };

  const handleRecordFielding = async (outcome: FieldingOutcome) => {
    if (!game) return;
    void triggerLightHaptic();
    await defaultGameRepository.recordEvent({
      gameId: game.id,
      category: 'fielding',
      eventType: outcome,
    });
    const updatedEvents = await defaultGameRepository.getEventsForGame(game.id);
    setEvents(updatedEvents);
  };

  const handleUndoLast = async () => {
    if (!game) return;
    void triggerMediumHaptic();
    await defaultGameRepository.undoLastEvent(game.id);
    const updatedEvents = await defaultGameRepository.getEventsForGame(game.id);
    setEvents(updatedEvents);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!game) return;
    void triggerMediumHaptic();
    await defaultGameRepository.deleteEvent(eventId);
    const updatedEvents = await defaultGameRepository.getEventsForGame(game.id);
    setEvents(updatedEvents);
  };

  const handleSelectPosition = async (pos: PlayerPosition) => {
    if (!game) return;
    void triggerLightHaptic();
    const updatedGame = await defaultGameRepository.updateGameMetadata(
      game.id,
      { position: pos }
    );
    await defaultPreferencesStore.setLastUsedPosition(pos);
    setGame(updatedGame);
    setShowPositionPicker(false);
  };

  const handleChangeDate = async (deltaDays: number) => {
    if (!game) return;
    void triggerLightHaptic();
    const nextDate =
      deltaDays === 0
        ? getTodayDateString()
        : shiftDateString(game.gameDate, deltaDays);
    const updatedGame = await defaultGameRepository.updateGameMetadata(
      game.id,
      { gameDate: nextDate }
    );
    setGame(updatedGame);
  };

  const handleStartNewGame = async () => {
    if (!game) return;
    void triggerMediumHaptic();
    if (events.length > 0) {
      await defaultGameRepository.updateGameMetadata(game.id, {
        status: 'completed',
      });
    }
    const newGame = await defaultGameRepository.createNewGame({
      gameDate: game.gameDate,
      position: game.position || 'SS',
    });
    setGame(newGame);
    setEvents([]);
  };

  const handleGoToSummary = () => {
    if (!game) return;
    void triggerMediumHaptic();
    router.push({
      pathname: '/summary',
      params: { gameId: game.id },
    });
  };

  if (loading || !game) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Loading Game...</Text>
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
        {/* Title Row: Live Game + New Game Button */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Live Game</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new game"
            onPress={handleStartNewGame}
            style={({ pressed }) => [
              styles.newGamePill,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.newGameText}>+ New Game</Text>
          </Pressable>
        </View>

        {/* Context Row: Date Pill & Position Pill */}
        <View style={styles.topBar}>
          <View style={styles.datePillGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              onPress={() => handleChangeDate(-1)}
              style={({ pressed }) => [
                styles.dateStepButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.dateStepText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset date to today"
              onPress={() => handleChangeDate(0)}
              style={styles.datePillCenter}
            >
              <Text style={styles.pillLabel}>Date</Text>
              <Text style={styles.pillValue}>{game.gameDate}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next day"
              onPress={() => handleChangeDate(1)}
              style={({ pressed }) => [
                styles.dateStepButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.dateStepText}>›</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Active position ${game.position}. Tap to change`}
            onPress={() => setShowPositionPicker((prev) => !prev)}
            style={[
              styles.positionPill,
              showPositionPicker && styles.positionPillActive,
            ]}
          >
            <Text style={styles.pillLabel}>Position</Text>
            <Text style={styles.positionPillValue}>{game.position} ▾</Text>
          </Pressable>
        </View>

        {/* Expandable 13-Position Selector Panel */}
        {showPositionPicker && (
          <View style={styles.positionDrawer}>
            <Text style={styles.positionDrawerTitle}>Select Position</Text>
            <View style={styles.positionGrid}>
              {PLAYER_POSITIONS.map((pos) => {
                const isSelected = game.position === pos;
                return (
                  <Pressable
                    key={pos}
                    accessibilityRole="button"
                    accessibilityLabel={`Position ${pos}`}
                    onPress={() => handleSelectPosition(pos)}
                    style={[
                      styles.posChip,
                      isSelected && styles.posChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.posChipText,
                        isSelected && styles.posChipTextSelected,
                      ]}
                    >
                      {pos}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Batting Action Pad */}
        <BattingPad stats={stats} onRecordBatting={handleRecordBatting} />

        {/* Fielding Action Pad */}
        <FieldingPad stats={stats} onRecordFielding={handleRecordFielding} />

        {/* 1-Tap Undo Last Play */}
        <EventTimeline
          events={events}
          onUndoLast={handleUndoLast}
          onDeleteEvent={handleDeleteEvent}
        />

        {/* Summary Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit and Review Game Stats"
          onPress={handleGoToSummary}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitButtonText}>Summary ›</Text>
        </Pressable>
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
    paddingTop: 10,
    paddingBottom: 12,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  datePillGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dateStepButton: {
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateStepText: {
    color: '#0A84FF',
    fontSize: 20,
    fontWeight: '600',
  },
  datePillCenter: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  positionPill: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionPillActive: {
    backgroundColor: '#2C2C2E',
  },
  positionPillValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newGamePill: {
    minHeight: 42,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
  },
  positionDrawer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  positionDrawerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
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
  submitButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});

