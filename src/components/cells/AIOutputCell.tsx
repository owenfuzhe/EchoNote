import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { AIOutputCellData } from '@/types/cell'
import { colors, font, spacing, radius } from '@/components/ui/theme'

interface Props {
  cell: AIOutputCellData
  isDark: boolean
}

export default function AIOutputCell({ cell, isDark }: Props) {
  const theme = isDark ? colors.dark : colors.light
  const accent = colors.cell.ai_output

  return (
    <View>
      {/* Streaming indicator */}
      {cell.is_streaming && (
        <View style={styles.streamingRow}>
          <ActivityIndicator size="small" color={accent} />
          <Text style={[styles.streamingText, { color: theme.textSecondary }]}>Thinking...</Text>
        </View>
      )}

      {/* Markdown content */}
      {cell.content ? (
        <Markdown
          style={{
            body: { color: theme.text, fontSize: font.sizes.md },
            heading1: { color: accent },
            heading2: { color: accent },
            strong: { color: theme.text },
            code_inline: { backgroundColor: theme.surfaceAlt, color: accent },
          }}
        >
          {cell.content}
        </Markdown>
      ) : null}

      {/* Structured action items */}
      {cell.structured?.action_items?.length ? (
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: accent }]}>Action Items</Text>
          {cell.structured.action_items.map((item) => (
            <View key={item.id} style={styles.actionItem}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor(item.priority) }]} />
              <Text style={[styles.actionText, { color: theme.text }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Suggestions */}
      {cell.structured?.suggestions?.length ? (
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: accent }]}>Suggestions</Text>
          {cell.structured.suggestions.map((s, i) => (
            <Text key={i} style={[styles.suggestion, { color: theme.textSecondary }]}>
              → {s}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Tags */}
      {cell.structured?.tags?.length ? (
        <View style={styles.tags}>
          {cell.structured.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: accent + '22' }]}>
              <Text style={[styles.tagText, { color: accent }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Model attribution */}
      {cell.model ? (
        <Text style={[styles.attribution, { color: theme.textTertiary }]}>
          {cell.provider} · {cell.model}
        </Text>
      ) : null}
    </View>
  )
}

const priorityColor = (p: string) =>
  p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#10B981'

const styles = StyleSheet.create({
  streamingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  streamingText: { fontSize: font.sizes.sm },
  section: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, marginBottom: spacing.sm },
  actionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  actionText: { flex: 1, fontSize: font.sizes.md },
  suggestion: { fontSize: font.sizes.sm, marginBottom: spacing.xs, lineHeight: font.sizes.sm * 1.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  tagText: { fontSize: font.sizes.xs, fontWeight: font.weights.medium },
  attribution: { fontSize: font.sizes.xs, marginTop: spacing.md, textAlign: 'right' },
})
