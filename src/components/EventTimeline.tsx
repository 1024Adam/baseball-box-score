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
            ? `↶ Undo Last Play (${lastEvent.eventType}${
                lastEvent.rbi > 0 ? ` +${lastEvent.rbi} RBI` : ''
              })`
            : '↶ Undo Last Play'}
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
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  undoButtonDisabled: {
    backgroundColor: '#1C1C1E',
    opacity: 0.45,
  },
  undoButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  undoButtonTitleDisabled: {
    color: '#8E8E93',
  },
  pressed: {
    opacity: 0.7,
  },
});
