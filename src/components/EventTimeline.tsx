import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameEvent } from '../domain/types';

export interface EventTimelineProps {
  events: readonly GameEvent[];
  onUndoLast: () => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function EventTimeline({
  events,
  onUndoLast,
}: EventTimelineProps) {
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Undo Last Play"
        disabled={!lastEvent}
        onPress={onUndoLast}
        style={({ pressed }) => [
          styles.undoButton,
          !lastEvent && styles.undoButtonDisabled,
          pressed && lastEvent && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.undoButtonTitle,
            !lastEvent && styles.undoButtonTitleDisabled,
          ]}
        >
          {lastEvent
            ? `↶ UNDO LAST PLAY (${lastEvent.eventType}${
                lastEvent.rbi > 0 ? ` +${lastEvent.rbi} RBI` : ''
              })`
            : '↶ UNDO LAST PLAY'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  undoButton: {
    backgroundColor: '#b45309',
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  undoButtonDisabled: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    opacity: 0.5,
  },
  undoButtonTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  undoButtonTitleDisabled: {
    color: '#94a3b8',
  },
  pressed: {
    opacity: 0.75,
  },
});
