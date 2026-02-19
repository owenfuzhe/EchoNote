import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useNotebookStore } from '@/store/notebook-store'
import NotebookEditor from '@/components/editor/NotebookEditor'
import { colors, spacing, font } from '@/components/ui/theme'

export default function NotebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  const { notebooks, activeCells, loadCells, isLoading } = useNotebookStore()
  const notebook = notebooks.find((n) => n.id === id)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  useEffect(() => { if (id) loadCells(id) }, [id])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          {isEditingTitle ? (
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              value={notebook?.title ?? ''}
              autoFocus
              onBlur={() => setIsEditingTitle(false)}
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {notebook?.title ?? ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Cell count */}
      <Text style={[styles.meta, { color: theme.textTertiary }]}>
        {activeCells.length} {activeCells.length === 1 ? 'cell' : 'cells'}
      </Text>

      {/* Editor */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <NotebookEditor notebookId={id} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: { width: 60 },
  backText: { fontSize: font.sizes.md },
  titleContainer: { flex: 1, alignItems: 'center' },
  title: { fontSize: font.sizes.lg, fontWeight: font.weights.bold },
  titleInput: { fontSize: font.sizes.lg, fontWeight: font.weights.bold, textAlign: 'center' },
  meta: { fontSize: font.sizes.xs, textAlign: 'center', marginBottom: spacing.xs },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
