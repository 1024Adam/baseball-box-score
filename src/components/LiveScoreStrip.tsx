import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatLiveBattingLine,
  formatLiveFieldingLine,
} from '../domain/liveGameHelpers';
import { formatRateStat } from '../domain/sheetFormatter';
import { SheetGameRow } from '../domain/types';

export interface LiveScoreStripProps {
  stats: SheetGameRow;
}

export function LiveScoreStrip({ stats }: LiveScoreStripProps) {
  const battingLine = formatLiveBattingLine(stats);
  const fieldingLine = formatLiveFieldingLine(stats);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Box Score</Text>
      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Batting</Text>
          <Text style={styles.metricMainValue}>
            {stats.h}-{stats.ab}
          </Text>
          <Text style={styles.metricSubValue}>
            AVG{' '}
            {formatRateStat(stats.avg, {
              omitLeadingZero: true,
              nullRateOutput: '---',
            })}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>OPS</Text>
          <Text style={styles.metricMainValue}>
            {formatRateStat(stats.ops, {
              omitLeadingZero: true,
              nullRateOutput: '---',
            })}
          </Text>
          <Text style={styles.metricSubValue}>
            OBP{' '}
            {formatRateStat(stats.obp, {
              omitLeadingZero: true,
              nullRateOutput: '---',
            })}{' '}
            · SLG{' '}
            {formatRateStat(stats.slg, {
              omitLeadingZero: true,
              nullRateOutput: '---',
            })}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>RBI / BB</Text>
          <Text style={styles.metricMainValue}>{stats.rbi} RBI</Text>
          <Text style={styles.metricSubValue}>
            {stats.bb} BB · {stats.k} K
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Fielding</Text>
          <Text style={styles.metricMainValue}>
            {formatRateStat(stats.fldPct, {
              omitLeadingZero: true,
              nullRateOutput: '---',
            })}
          </Text>
          <Text style={styles.metricSubValue}>
            {stats.po} PO · {stats.assists} A · {stats.errors} E
          </Text>
        </View>
      </View>

      <View style={styles.stripLines}>
        <Text style={styles.stripText} numberOfLines={1}>
          <Text style={styles.stripTag}>Batting </Text>
          {battingLine}
        </Text>
        <Text style={styles.stripText} numberOfLines={1}>
          <Text style={styles.stripTag}>Fielding </Text>
          {fieldingLine}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricMainValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricSubValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  stripLines: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    paddingTop: 10,
    gap: 6,
  },
  stripText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  stripTag: {
    color: '#8E8E93',
    fontWeight: '600',
  },
});
