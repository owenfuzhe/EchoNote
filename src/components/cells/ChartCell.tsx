import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { ChartCellData } from '@/types/cell'
import { colors, font, spacing } from '@/components/ui/theme'

const { width } = Dimensions.get('window')
const CHART_WIDTH = width - 80

interface Props {
  cell: ChartCellData
  isDark: boolean
}

export default function ChartCell({ cell, isDark }: Props) {
  const theme = isDark ? colors.dark : colors.light
  const chartColor = cell.color ?? colors.cell.chart

  if (!cell.data?.length) {
    return (
      <View style={[styles.empty, { borderColor: theme.border }]}>
        <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
          Run a cell to generate chart data
        </Text>
      </View>
    )
  }

  const maxVal = Math.max(...cell.data.map(d => d.y))
  const barWidth = (CHART_WIDTH - 40) / cell.data.length

  return (
    <View>
      <Text style={[styles.title, { color: theme.text }]}>{cell.title}</Text>
      <View style={[styles.chartContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {cell.chart_type === 'bar' && (
          <View style={styles.barChart}>
            {cell.data.map((d, i) => (
              <View key={i} style={styles.barItem}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (Number(d.y) / maxVal) * 120,
                      backgroundColor: chartColor,
                      width: barWidth - 8
                    }
                  ]} 
                />
                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{String(d.x)}</Text>
              </View>
            ))}
          </View>
        )}
        {cell.chart_type === 'line' && (
          <View style={styles.lineChart}>
            <Text style={[styles.chartPlaceholder, { color: theme.textSecondary }]}>
              📈 Line chart: {cell.data.length} points
            </Text>
          </View>
        )}
        {cell.chart_type === 'pie' && (
          <View style={styles.pieChart}>
            <Text style={[styles.chartPlaceholder, { color: theme.textSecondary }]}>
              🥧 Pie chart: {cell.data.length} segments
            </Text>
          </View>
        )}
        {(cell.chart_type === 'area' || cell.chart_type === 'scatter') && (
          <View style={styles.lineChart}>
            <Text style={[styles.chartPlaceholder, { color: theme.textSecondary }]}>
              📊 {cell.chart_type} chart: {cell.data.length} points
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, marginBottom: spacing.xs },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.sizes.sm },
  chartContainer: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: spacing.sm,
  },
  barItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  lineChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholder: {
    fontSize: font.sizes.sm,
  },
})
