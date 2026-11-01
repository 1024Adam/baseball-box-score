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
          <Text style={styles.metricLabel}>OPS</Text>
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
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metricMainValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  metricSubValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 4,
    textAlign: 'center',
  },
  stripLines: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    gap: 6,
  },
  stripText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  stripTag: {
    color: '#94a3b8',
    fontWeight: '900',
  },
});
