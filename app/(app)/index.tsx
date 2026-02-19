import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  useColorScheme, TextInput, Modal, Pressable, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNotebookStore } from '@/store/notebook-store'
import { COVER_COLORS, CoverColor } from '@/types/notebook'
import { colors, spacing, radius, font } from '@/components/ui/theme'

export default function NotebooksScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  const { notebooks, fetchNotebooks, createNotebook, deleteNotebook } = useNotebookStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState<CoverColor>('#6366F1')
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchNotebooks() }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      console.log('Creating notebook:', newTitle.trim(), newColor)
      const id = await createNotebook(newTitle.trim(), newColor)
      console.log('Notebook created with id:', id)
      setShowCreate(false)
      setNewTitle('')
      console.log('Navigating to:', `/(app)/notebook/${id}`)
      router.push(`/(app)/notebook/${id}`)
    } catch (e: any) {
      console.error('Create notebook error:', e)
      Alert.alert('Error', e.message || 'Failed to create notebook')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete notebook', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNotebook(id) },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>EchoNotes</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notebooks}
        keyExtractor={(n) => n.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: item.cover_color }]}
            onPress={() => router.push(`/(app)/notebook/${item.id}`)}
            onLongPress={() => handleDelete(item.id, item.title)}
          >
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.updated_at).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No notebooks yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Tap "+ New" to capture your first thought
            </Text>
          </View>
        }
      />

      {/* Create notebook modal */}
      <Modal transparent visible={showCreate} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCreate(false)}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New notebook</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Notebook title"
              placeholderTextColor={theme.textTertiary}
              autoFocus
            />
            <Text style={[styles.colorLabel, { color: theme.textSecondary }]}>Cover color</Text>
            <View style={styles.colorRow}>
              {COVER_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, newColor === c && styles.colorDotSelected]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: newColor }]}
              onPress={handleCreate}
              disabled={creating}
            >
              <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
  newBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  newBtnText: { color: '#fff', fontWeight: font.weights.semibold },
  grid: { padding: spacing.md, paddingTop: 0 },
  row: { gap: spacing.md, marginBottom: spacing.md },
  card: { flex: 1, borderRadius: radius.xl, padding: spacing.lg, minHeight: 140, justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontSize: font.sizes.lg, fontWeight: font.weights.bold },
  cardDate: { color: 'rgba(255,255,255,0.7)', fontSize: font.sizes.xs },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold },
  emptySubtitle: { fontSize: font.sizes.md, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: spacing.xl },
  modalSheet: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold },
  modalInput: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: font.sizes.md },
  colorLabel: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  colorRow: { flexDirection: 'row', gap: spacing.sm },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  createBtn: { padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  createBtnText: { color: '#fff', fontWeight: font.weights.semibold, fontSize: font.sizes.md },
})
