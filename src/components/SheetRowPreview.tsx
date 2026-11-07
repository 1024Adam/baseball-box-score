import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SecondaryButton } from './SecondaryButton';

export interface SheetRowPreviewProps {
  syncedToSheets: boolean;
  onCopyRow: () => Promise<void>;
  onExportCsv: () => Promise<void>;
}

export function SheetRowPreview({
  syncedToSheets,
  onCopyRow,
  onExportCsv,
}: SheetRowPreviewProps) {
  return (
    <View style={styles.container}>
      {/* Section Header + Sync Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.sectionTitle}>Data Sync</Text>
        </View>

        <View
          style={[
            styles.syncBadge,
            syncedToSheets ? styles.syncBadgeSynced : styles.syncBadgeUnsynced,
          ]}
        >
          <Text
            style={[
              styles.syncBadgeText,
              syncedToSheets && styles.syncBadgeTextSynced,
            ]}
          >
            {syncedToSheets ? '✓ Copied' : 'Unsynced'}
          </Text>
        </View>
      </View>

      {/* Primary Copy Row Button & Secondary CSV Export */}
      <View style={styles.actionsColumn}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="COPY DATA ROW for Google Sheets"
          onPress={onCopyRow}
          style={({ pressed }) => [
            styles.primaryActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryActionTitle}>Copy Data Row (TSV)</Text>
        </Pressable>

        <SecondaryButton
          title="Export CSV"
          accessibilityLabel="Export CSV file"
          onPress={onExportCsv}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerTextBlock: {
    flex: 1,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  syncBadge: {
    flexShrink: 0,
    paddingVertical: 5,
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
  actionsColumn: {
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryActionSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
