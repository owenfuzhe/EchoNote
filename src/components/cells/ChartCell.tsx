import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { VictoryBar, VictoryLine, VictoryPie, VictoryScatter, VictoryChart, VictoryAxis, VictoryTheme, VictoryArea } from 'victory-native'
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

  const data = cell.data.map((d) => ({ x: d.x, y: d.y }))
  const victoryTheme = isDark ? VictoryTheme.grayscale : VictoryTheme.clean

  return (
    <View>
      <Text style={[styles.title, { color: theme.text }]}>{cell.title}</Text>
      <VictoryChart
        width={CHART_WIDTH}
        height={220}
        theme={victoryTheme}
        domainPadding={{ x: 20 }}
      >
        <VictoryAxis
          style={{ tickLabels: { fill: theme.textSecondary, fontSize: 10 }, grid: { stroke: theme.border } }}
        />
        <VictoryAxis
          dependentAxis
          style={{ tickLabels: { fill: theme.textSecondary, fontSize: 10 }, grid: { stroke: theme.border } }}
        />
        {cell.chart_type === 'bar' && (
          <VictoryBar data={data} style={{ data: { fill: chartColor, borderRadius: 4 } }} />
        )}
        {cell.chart_type === 'line' && (
          <VictoryLine data={data} style={{ data: { stroke: chartColor, strokeWidth: 2 } }} />
        )}
        {cell.chart_type === 'area' && (
          <VictoryArea data={data} style={{ data: { fill: chartColor + '44', stroke: chartColor, strokeWidth: 2 } }} />
        )}
        {cell.chart_type === 'scatter' && (
          <VictoryScatter data={data} style={{ data: { fill: chartColor } }} />
        )}
      </VictoryChart>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, marginBottom: spacing.xs },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.sizes.sm },
})
