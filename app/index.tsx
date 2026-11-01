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
import { BattingPad } from '../src/components/BattingPad';
import { EventTimeline } from '../src/components/EventTimeline';
import { FieldingPad } from '../src/components/FieldingPad';
import { LiveScoreStrip } from '../src/components/LiveScoreStrip';
import {
  formatLiveBattingLine,
  formatLiveFieldingLine,
} from '../src/domain/liveGameHelpers';
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
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const loadActiveGame = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await defaultPreferencesStore.getPreferences();
      const today = getTodayDateString();
      const activeGame = await defaultGameRepository.getOrCreateActiveGame(
        today,
        prefs.lastUsedPosition
      );
      const gameEvents = await defaultGameRepository.getEventsForGame(
        activeGame.id
      );
      setGame(activeGame);
      setEvents(gameEvents);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading || !game) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading Live Game...</Text>
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
        {/* Top Bar: Date Pill, Position Pill, & + New Game (Doubleheader) */}
        <View style={styles.topBar}>
          {/* Date Pill with quick -1d / Today / +1d controls */}
          <View style={styles.datePillGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              onPress={() => handleChangeDate(-1)}
              style={styles.dateStepButton}
            >
              <Text style={styles.dateStepText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset date to today"
              onPress={() => handleChangeDate(0)}
              style={styles.datePillCenter}
            >
              <Text style={styles.pillLabel}>DATE</Text>
              <Text style={styles.pillValue}>{game.gameDate}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next day"
              onPress={() => handleChangeDate(1)}
              style={styles.dateStepButton}
            >
              <Text style={styles.dateStepText}>›</Text>
            </Pressable>
          </View>

          {/* Position Selector Pill */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Active position ${game.position}. Tap to change`}
            onPress={() => setShowPositionPicker((prev) => !prev)}
            style={[
              styles.positionPill,
              showPositionPicker && styles.positionPillActive,
            ]}
          >
            <Text style={styles.pillLabel}>POS</Text>
            <Text style={styles.positionPillValue}>{game.position} ▾</Text>
          </Pressable>

          {/* 1-Tap New Game (Doubleheader support) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new game"
            onPress={handleStartNewGame}
            style={({ pressed }) => [
              styles.newGamePill,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.newGameText}>+ NEW GAME</Text>
          </Pressable>
        </View>

        {/* Expandable 13-Position Selector Panel */}
        {showPositionPicker && (
          <View style={styles.positionDrawer}>
            <Text style={styles.positionDrawerTitle}>SELECT POSITION</Text>
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

        {/* Box Score Summary Tile (positioned at the bottom above Submit/Export) */}
        <LiveScoreStrip stats={stats} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  datePillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  dateStepButton: {
    paddingHorizontal: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateStepText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
  },
  datePillCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  positionPill: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionPillActive: {
    backgroundColor: '#334155',
    borderColor: '#94a3b8',
  },
  positionPillValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f8fafc',
  },
  newGamePill: {
    minHeight: 46,
    backgroundColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGameText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.4,
  },
  positionDrawer: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 12,
  },
  positionDrawerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 10,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  posChip: {
    minWidth: 54,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  posChipSelected: {
    backgroundColor: '#475569',
    borderColor: '#94a3b8',
  },
  posChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  posChipTextSelected: {
    color: '#f8fafc',
  },
  pressed: {
    opacity: 0.75,
  },
});

