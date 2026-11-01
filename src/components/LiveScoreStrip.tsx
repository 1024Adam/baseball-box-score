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
      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>BATTING</Text>
          <Text style={styles.metricMainValue}>
            {stats.h}-{stats.ab}
          </Text>
          <Text style={styles.metricSubValue}>
            AVG {formatRateStat(stats.avg, { omitLeadingZero: true, nullRateOutput: '---' })}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ON-BASE / SLG</Text>
          <Text style={styles.metricMainValue}>
            {formatRateStat(stats.ops, { omitLeadingZero: true, nullRateOutput: '---' })}
          </Text>
          <Text style={styles.metricSubValue}>
            OBP {formatRateStat(stats.obp, { omitLeadingZero: true, nullRateOutput: '---' })} · SLG{' '}
            {formatRateStat(stats.slg, { omitLeadingZero: true, nullRateOutput: '---' })}
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
          <Text style={styles.metricLabel}>FIELDING</Text>
          <Text style={styles.metricMainValue}>
            {formatRateStat(stats.fldPct, { omitLeadingZero: true, nullRateOutput: '---' })}
          </Text>
          <Text style={styles.metricSubValue}>
            {stats.po} PO · {stats.assists} A · {stats.errors} E
          </Text>
        </View>
      </View>

      <View style={styles.stripLines}>
        <Text style={styles.stripText} numberOfLines={1}>
          <Text style={styles.stripTag}>BAT </Text>
          {battingLine}
        </Text>
        <Text style={styles.stripText} numberOfLines={1}>
          <Text style={styles.stripTag}>FLD </Text>
          {fieldingLine}
        </Text>
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
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metricMainValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  metricSubValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 2,
    textAlign: 'center',
  },
  stripLines: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    gap: 4,
  },
  stripText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  stripTag: {
    color: '#94a3b8',
    fontWeight: '800',
  },
});
