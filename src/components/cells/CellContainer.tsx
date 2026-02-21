import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated'
import { Cell, CellType } from '@/types/cell'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import TextCellComponent from './TextCell'
import VoiceCellComponent from './VoiceCell'
import ImageCellComponent from './ImageCell'
import AIOutputCellComponent from './AIOutputCell'
import TodoCellComponent from './TodoCell'
import ChartCellComponent from './ChartCell'
import CorrelationCellComponent from './CorrelationCell'

const CELL_ICONS: Record<CellType, string> = {
  text: '✏️',
  voice: '🎙️',
  image: '🖼️',
  ai_output: '✨',
  todo: '☑️',
  chart: '📊',
  correlation: '🔗',
  link: '🔗',
}

interface Props {
  cell: Cell
  isRunning?: boolean
  onRun: (cell: Cell) => void
  onUpdate: (id: string, updates: Partial<Cell>) => void
  onDelete: (id: string) => void
}

export default function CellContainer({ cell, isRunning, onRun, onUpdate, onDelete }: Props) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const accentColor = colors.cell[cell.type]
  const [isHovered, setIsHovered] = useState(false)

  const handleDelete = () =>
    Alert.alert('Delete cell', 'Remove this cell from the notebook?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(cell.id) },
    ])

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={Layout.springify()}
      style={[styles.container, { borderLeftColor: accentColor, backgroundColor: theme.surface }]}
    >
      {/* Cell header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeBadge, { backgroundColor: accentColor + '22' }]}>
            <Animated.Text style={[styles.typeIcon]}>{CELL_ICONS[cell.type]}</Animated.Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Run button */}
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: accentColor }]}
            onPress={() => onRun(cell)}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Animated.Text style={styles.runBtnText}>▶</Animated.Text>
            )}
          </TouchableOpacity>
          {/* Delete */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Animated.Text style={[styles.deleteBtnText, { color: theme.textTertiary }]}>✕</Animated.Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cell body */}
      <View style={styles.body}>
        {renderCell(cell, isDark, (updates) => onUpdate(cell.id, updates))}
      </View>
    </Animated.View>
  )
}

function renderCell(cell: Cell, isDark: boolean, onUpdate: (u: Partial<Cell>) => void) {
  switch (cell.type) {
    case 'text':
      return <TextCellComponent cell={cell} isDark={isDark} onUpdate={onUpdate} />
    case 'voice':
      return <VoiceCellComponent cell={cell} isDark={isDark} onUpdate={onUpdate} />
    case 'image':
      return <ImageCellComponent cell={cell} isDark={isDark} onUpdate={onUpdate} />
    case 'ai_output':
      return <AIOutputCellComponent cell={cell} isDark={isDark} />
    case 'todo':
      return <TodoCellComponent cell={cell} isDark={isDark} onUpdate={onUpdate} />
    case 'chart':
      return <ChartCellComponent cell={cell} isDark={isDark} />
    case 'correlation':
      return <CorrelationCellComponent cell={cell} isDark={isDark} />
  }
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeIcon: { fontSize: font.sizes.sm },
  runBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    minWidth: 36,
    alignItems: 'center',
  },
  runBtnText: { color: '#fff', fontSize: font.sizes.xs, fontWeight: font.weights.bold },
  deleteBtn: { padding: spacing.xs },
  deleteBtnText: { fontSize: font.sizes.md },
  body: { padding: spacing.md },
})
