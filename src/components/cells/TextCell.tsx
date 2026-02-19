import React, { useState } from 'react'
import { TextInput, View, StyleSheet, Pressable } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { TextCellData } from '@/types/cell'
import { colors, font, spacing } from '@/components/ui/theme'

interface Props {
  cell: TextCellData
  isDark: boolean
  onUpdate: (updates: Partial<TextCellData>) => void
}

export default function TextCell({ cell, isDark, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(!cell.content)
  const theme = isDark ? colors.dark : colors.light

  if (isEditing) {
    return (
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        value={cell.content}
        onChangeText={(text) => onUpdate({ content: text })}
        onBlur={() => cell.content && setIsEditing(false)}
        placeholder="Write your thoughts here... (Markdown supported)"
        placeholderTextColor={theme.textTertiary}
        multiline
        autoFocus={!cell.content}
      />
    )
  }

  return (
    <Pressable onPress={() => setIsEditing(true)}>
      <Markdown
        style={{
          body: { color: theme.text, fontSize: font.sizes.md },
          heading1: { color: theme.text, fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
          heading2: { color: theme.text, fontSize: font.sizes.xl, fontWeight: font.weights.semibold },
          code_inline: { backgroundColor: theme.surfaceAlt, color: colors.primary },
          fence: { backgroundColor: theme.surfaceAlt },
          blockquote: { borderLeftColor: colors.primary, borderLeftWidth: 3, paddingLeft: spacing.md },
        }}
      >
        {cell.content || '*Empty — tap to edit*'}
      </Markdown>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: font.sizes.md,
    lineHeight: font.sizes.md * 1.6,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    padding: spacing.sm,
  },
})
