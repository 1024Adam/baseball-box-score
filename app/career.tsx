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
import {
  extractAvailableYears,
  filterSheetGameRows,
} from '../src/domain/liveGameHelpers';
import { formatRateStat } from '../src/domain/sheetFormatter';
import { calculateAggregateStats } from '../src/domain/statCalculator';
import { SheetGameRow } from '../src/domain/types';
import { triggerLightHaptic } from '../src/services/hapticsService';
import { defaultGameRepository } from '../src/storage/gameRepository';

export default function CareerStatsScreen() {
  const [allRows, setAllRows] = useState<SheetGameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const loadCareerData = useCallback(async () => {
    setLoading(true);
    try {
      const gamesWithStats = await defaultGameRepository.listGamesWithStats();
      // Include games that have at least 1 recorded play or are completed
      const rows = gamesWithStats
        .filter((g) => g.eventCount > 0 || g.game.status === 'completed')
        .map((g) => g.stats);
      setAllRows(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCareerData();
  }, [loadCareerData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Loading Career Stats...</Text>
      </SafeAreaView>
    );
  }

  const availableYears = extractAvailableYears(allRows);
  const filteredRows = filterSheetGameRows(allRows, {
    year: selectedYear,
  });
  const agg = calculateAggregateStats(filteredRows);

  const countItems: Array<{ label: string; value: number }> = [
    { label: 'Games', value: agg.games },
    { label: 'PA', value: agg.pa },
    { label: 'AB', value: agg.ab },
    { label: 'H', value: agg.h },
    { label: '1B', value: agg.singles },
    { label: '2B', value: agg.doubles },
    { label: '3B', value: agg.triples },
    { label: 'HR', value: agg.hr },
    { label: 'RBI', value: agg.rbi },
    { label: 'BB', value: agg.bb },
    { label: 'E (Bat)', value: agg.eBatting },
    { label: 'FC', value: agg.fc },
    { label: 'K', value: agg.k },
    { label: 'FO', value: agg.fo },
    { label: 'GO', value: agg.go },
    { label: 'PO', value: agg.po },
    { label: 'Assists', value: agg.assists },
    { label: 'Errors', value: agg.errors },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>Stats</Text>

        {/* Season / Year Filter */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Season</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {['ALL', ...availableYears].map((yr) => {
              const active = selectedYear === yr;
              return (
                <Pressable
                  key={yr}
                  accessibilityRole="button"
                  onPress={() => {
                    void triggerLightHaptic();
                    setSelectedYear(yr);
                  }}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {yr === 'ALL' ? 'All Seasons' : yr}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Headline Rate Cards */}
        <View style={styles.rateCardGroup}>
          <Text style={styles.sectionTitle}>Rate Stats</Text>
          <View style={styles.rateGrid}>
            <View style={styles.rateCard}>
              <Text style={styles.rateLabel}>AVG</Text>
              <Text style={styles.rateValue}>
                {formatRateStat(agg.avg, {
                  omitLeadingZero: true,
                  nullRateOutput: '---',
                })}
              </Text>
            </View>
            <View style={styles.rateCard}>
              <Text style={styles.rateLabel}>OBP</Text>
              <Text style={styles.rateValue}>
                {formatRateStat(agg.obp, {
                  omitLeadingZero: true,
                  nullRateOutput: '---',
                })}
              </Text>
            </View>
            <View style={styles.rateCard}>
              <Text style={styles.rateLabel}>SLG</Text>
              <Text style={styles.rateValue}>
                {formatRateStat(agg.slg, {
                  omitLeadingZero: true,
                  nullRateOutput: '---',
                })}
              </Text>
            </View>
            <View style={styles.rateCard}>
              <Text style={styles.rateLabel}>OPS</Text>
              <Text style={styles.rateValue}>
                {formatRateStat(agg.ops, {
                  omitLeadingZero: true,
                  nullRateOutput: '---',
                })}
              </Text>
            </View>
            <View style={styles.rateCard}>
              <Text style={styles.rateLabel}>FLD PCT</Text>
              <Text style={styles.rateValue}>
                {formatRateStat(agg.fldPct, {
                  omitLeadingZero: true,
                  nullRateOutput: '---',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Counting Totals Grid */}
        <View style={styles.totalsCard}>
          <Text style={styles.sectionTitle}>Counting Totals</Text>
          <View style={styles.totalsGrid}>
            {countItems.map((item) => (
              <View key={item.label} style={styles.totalCell}>
                <Text style={styles.totalCellValue}>{item.value}</Text>
                <Text style={styles.totalCellLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  filterCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#2C2C2E',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: '#0A84FF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  rateCardGroup: {
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
  rateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rateCard: {
    flex: 1,
    minWidth: 92,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  totalCell: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  totalCellValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalCellLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 3,
  },
});
