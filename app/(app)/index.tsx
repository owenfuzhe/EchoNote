import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  useColorScheme, Alert, StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useNotebookStore } from '@/store/notebook-store'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import AIAssistantModal from '@/components/AIAssistantModal'

export default function NotebooksScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  const { notebooks, fetchNotebooks, deleteNotebook } = useNotebookStore()
  const [showAIAssistant, setShowAIAssistant] = useState(false)

  useEffect(() => { fetchNotebooks() }, [])

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete notebook', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNotebook(id) },
    ])
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>EchoNotes</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.aiHeaderBtn}
            onPress={() => setShowAIAssistant(true)}
          >
            <Text style={styles.aiHeaderIcon}>🤖</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aiHeaderBtn}
            onPress={() => router.push('/(app)/topic-map')}
          >
            <Text style={styles.aiHeaderIcon}>🗺️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setShowAIAssistant(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={[styles.searchPlaceholder, { color: theme.textTertiary }]}>
          搜索或问 AI...
        </Text>
      </TouchableOpacity>

      {/* Notebook Grid */}
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
              Tap the ✨ button below to capture your first thought
            </Text>
          </View>
        }
      />

      {/* AI Float Button */}
      <TouchableOpacity
        style={[styles.aiFloatBtn, { backgroundColor: colors.primary }]}
        onPress={() => setShowAIAssistant(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.aiFloatIcon}>🤖</Text>
      </TouchableOpacity>

      <AIAssistantModal 
        visible={showAIAssistant} 
        onClose={() => setShowAIAssistant(false)} 
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  title: { 
    fontSize: font.sizes.xxl, 
    fontWeight: font.weights.bold 
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm 
  },
  aiHeaderBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  aiHeaderIcon: { fontSize: 24 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: spacing.lg, 
    marginBottom: spacing.md, 
    padding: spacing.md, 
    borderRadius: radius.xl, 
    borderWidth: 1 
  },
  searchIcon: { 
    fontSize: 18, 
    marginRight: spacing.sm 
  },
  searchPlaceholder: { 
    fontSize: font.sizes.md 
  },
  grid: { 
    padding: spacing.md, 
    paddingTop: 0 
  },
  row: { 
    gap: spacing.md, 
    marginBottom: spacing.md 
  },
  card: { 
    flex: 1, 
    borderRadius: radius.xl, 
    padding: spacing.lg, 
    minHeight: 140, 
    justifyContent: 'space-between' 
  },
  cardTitle: { 
    color: '#fff', 
    fontSize: font.sizes.lg, 
    fontWeight: font.weights.bold 
  },
  cardDate: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: font.sizes.xs 
  },
  empty: { 
    alignItems: 'center', 
    paddingTop: 80, 
    gap: spacing.sm 
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { 
    fontSize: font.sizes.xl, 
    fontWeight: font.weights.bold 
  },
  emptySubtitle: { 
    fontSize: font.sizes.md, 
    textAlign: 'center' 
  },
  aiFloatBtn: { 
    position: 'absolute', 
    right: spacing.lg, 
    bottom: spacing.xl, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  aiFloatIcon: { fontSize: 28 },
})
