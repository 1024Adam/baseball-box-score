import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SheetGameRow } from '../domain/types';

export interface SheetRowPreviewProps {
  stats: SheetGameRow;
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
          <Text style={styles.sectionTitle}>DATA SYNC</Text>
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
            {syncedToSheets ? '✓ COPIED' : 'UNSYNCED'}
          </Text>
        </View>
      </View>

      {/* Primary Copy Row Button & Secondary CSV Export */}
      <View style={styles.actionsColumn}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy 23-Column Row for Google Sheets"
          onPress={onCopyRow}
          style={({ pressed }) => [
            styles.primaryActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryActionTitle}>
            COPY 23-COLUMN ROW (TSV)
          </Text>
          <Text style={styles.primaryActionSub}>
            Copies tab-separated row to paste into Column A in Google Sheets
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export CSV file"
          onPress={onExportCsv}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonTitle}>EXPORT CSV</Text>
          <Text style={styles.secondaryButtonSub}>Download / Share .csv if needed</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.8,
  },
  syncBadge: {
    flexShrink: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  syncBadgeSynced: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  syncBadgeUnsynced: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  syncBadgeTextSynced: {
    color: '#ffffff',
  },
  actionsColumn: {
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.4,
  },
  primaryActionSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 3,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  secondaryButtonSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
