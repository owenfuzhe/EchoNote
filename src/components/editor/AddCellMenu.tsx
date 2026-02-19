import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated'
import { CellType } from '@/types/cell'
import { colors, spacing, radius, font } from '@/components/ui/theme'

const CELL_OPTIONS: { type: CellType; icon: string; label: string; description: string }[] = [
  { type: 'text', icon: '✏️', label: 'Text', description: 'Markdown note' },
  { type: 'voice', icon: '🎙️', label: 'Voice', description: 'Record & transcribe' },
  { type: 'image', icon: '🖼️', label: 'Image', description: 'Photo + AI analysis' },
  { type: 'todo', icon: '☑️', label: 'Todos', description: 'Task checklist' },
  { type: 'chart', icon: '📊', label: 'Chart', description: 'AI-generated chart' },
  { type: 'correlation', icon: '🔗', label: 'Related', description: 'Find linked notes' },
]

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (type: CellType) => void
  isDark: boolean
}

export default function AddCellMenu({ visible, onClose, onSelect, isDark }: Props) {
  const theme = isDark ? colors.dark : colors.light

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.duration(250).springify()}
          exiting={FadeOut.duration(150)}
          style={[styles.sheet, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]}>Add cell</Text>
          <View style={styles.grid}>
            {CELL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={[styles.option, { backgroundColor: colors.cell[opt.type] + '14', borderColor: colors.cell[opt.type] + '33' }]}
                onPress={() => { onSelect(opt.type); onClose() }}
              >
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <Text style={[styles.optionLabel, { color: theme.text }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: theme.textTertiary }]}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    width: '47%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionIcon: { fontSize: 24 },
  optionLabel: { fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  optionDesc: { fontSize: font.sizes.xs },
})
