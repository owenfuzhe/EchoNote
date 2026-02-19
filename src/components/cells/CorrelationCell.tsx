import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { CorrelationCellData } from '@/types/cell'
import { colors, font, spacing, radius } from '@/components/ui/theme'

interface Props {
  cell: CorrelationCellData
  isDark: boolean
}

export default function CorrelationCell({ cell, isDark }: Props) {
  const theme = isDark ? colors.dark : colors.light
  const accent = colors.cell.correlation
  const router = useRouter()

  if (cell.is_loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Finding related notes...</Text>
      </View>
    )
  }

  if (!cell.related_notes?.length) {
    return (
      <View style={[styles.empty, { borderColor: theme.border }]}>
        <Text style={styles.emptyIcon}>🔗</Text>
        <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No related notes yet</Text>
        <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
          Run this cell to find semantically similar notes
        </Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={[styles.query, { color: theme.textSecondary }]}>Related to: "{cell.query}"</Text>
      {cell.related_notes.map((note) => (
        <TouchableOpacity
          key={note.notebook_id}
          style={[styles.noteCard, { backgroundColor: theme.surfaceAlt, borderLeftColor: accent }]}
          onPress={() => router.push(`/(app)/notebook/${note.notebook_id}`)}
        >
          <View style={styles.noteHeader}>
            <Text style={[styles.noteTitle, { color: theme.text }]}>{note.title}</Text>
            <Text style={[styles.similarity, { color: accent }]}>
              {Math.round(note.similarity * 100)}%
            </Text>
          </View>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={2}>
            {note.preview}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontSize: font.sizes.sm },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyIcon: { fontSize: 28 },
  emptyText: { fontSize: font.sizes.md, fontWeight: font.weights.medium },
  emptySubtext: { fontSize: font.sizes.sm, textAlign: 'center' },
  query: { fontSize: font.sizes.sm, marginBottom: spacing.sm, fontStyle: 'italic' },
  noteCard: { borderLeftWidth: 3, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  noteTitle: { fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  similarity: { fontSize: font.sizes.sm, fontWeight: font.weights.bold },
  preview: { fontSize: font.sizes.sm, lineHeight: font.sizes.sm * 1.5 },
})
