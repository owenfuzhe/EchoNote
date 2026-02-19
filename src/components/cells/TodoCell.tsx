import React, { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { TodoCellData, TodoItem } from '@/types/cell'
import { colors, font, spacing, radius } from '@/components/ui/theme'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'

interface Props {
  cell: TodoCellData
  isDark: boolean
  onUpdate: (updates: Partial<TodoCellData>) => void
}

export default function TodoCell({ cell, isDark, onUpdate }: Props) {
  const theme = isDark ? colors.dark : colors.light
  const accent = colors.cell.todo
  const [newText, setNewText] = useState('')

  const toggleItem = (id: string) => {
    onUpdate({
      items: cell.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    })
  }

  const addItem = () => {
    if (!newText.trim()) return
    const newItem: TodoItem = { id: uuid(), text: newText.trim(), completed: false, priority: 'medium' }
    onUpdate({ items: [...cell.items, newItem] })
    setNewText('')
  }

  const deleteItem = (id: string) => {
    onUpdate({ items: cell.items.filter((i) => i.id !== id) })
  }

  const done = cell.items.filter((i) => i.completed).length
  const total = cell.items.length

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>{cell.title}</Text>
        {total > 0 && (
          <Text style={[styles.progress, { color: theme.textSecondary }]}>
            {done}/{total}
          </Text>
        )}
      </View>

      {/* Progress bar */}
      {total > 0 && (
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[styles.progressFill, { backgroundColor: accent, width: `${(done / total) * 100}%` as any }]}
          />
        </View>
      )}

      {/* Todo items */}
      {cell.items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.item} onPress={() => toggleItem(item.id)}>
          <View style={[styles.checkbox, { borderColor: accent }, item.completed && { backgroundColor: accent }]}>
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text
            style={[
              styles.itemText,
              { color: item.completed ? theme.textTertiary : theme.text },
              item.completed && styles.strikethrough,
            ]}
          >
            {item.text}
          </Text>
          <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteItem}>
            <Text style={{ color: theme.textTertiary, fontSize: 12 }}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {/* Add item input */}
      <View style={[styles.addRow, { borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.addInput, { color: theme.text }]}
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={addItem}
          placeholder="Add item..."
          placeholderTextColor={theme.textTertiary}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={addItem} style={[styles.addBtn, { backgroundColor: accent }]}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  progress: { fontSize: font.sizes.sm },
  progressBar: { height: 3, borderRadius: 2, marginBottom: spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: font.weights.bold },
  itemText: { flex: 1, fontSize: font.sizes.md },
  strikethrough: { textDecorationLine: 'line-through' },
  deleteItem: { padding: spacing.xs },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  addInput: { flex: 1, fontSize: font.sizes.md },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18, lineHeight: 22 },
})
