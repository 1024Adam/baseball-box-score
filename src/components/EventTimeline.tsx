import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GameEvent } from '../domain/types';
import { SecondaryButton } from './SecondaryButton';

export interface EventTimelineProps {
  events: readonly GameEvent[];
  onUndoLast: () => void;
}

export function EventTimeline({ events, onUndoLast }: EventTimelineProps) {
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <View style={styles.container}>
      <SecondaryButton
        title={
          lastEvent
            ? `Undo Last Play (${lastEvent.eventType}${
                lastEvent.rbi > 0 ? ` +${lastEvent.rbi} RBI` : ''
              })`
            : 'Undo Last Play'
        }
        accessibilityLabel="Undo Last Play"
        disabled={!lastEvent}
        onPress={onUndoLast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
});
