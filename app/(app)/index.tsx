import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  useColorScheme, ScrollView, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, radius, font, layout } from '@/components/ui/theme'
import { useNotebookStore } from '@/store/notebook-store'
import { NotebookSummary } from '@/types/notebook'
import { 
  Mic, 
  Headphones,
  Clock,
  Tag,
  Bot,
  Map
} from 'lucide-react-native'

// 按日期分组
const groupByDate = (notebooks: NotebookSummary[]) => {
  const groups: Record<string, NotebookSummary[]> = {}
  
  notebooks.forEach(notebook => {
    const date = new Date(notebook.updated_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let key: string
    if (date.toDateString() === today.toDateString()) {
      key = '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = '昨天'
    } else {
      key = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    }
    
    if (!groups[key]) groups[key] = []
    groups[key].push(notebook)
  })
  
  return groups
}

export default function HomeScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  const { notebooks, fetchNotebooks } = useNotebookStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchNotebooks() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchNotebooks()
    setRefreshing(false)
  }

  const groupedNotes = groupByDate(notebooks)
  const sortedDates = Object.keys(groupedNotes).sort((a, b) => {
    if (a === '今天') return -1
    if (b === '今天') return 1
    if (a === '昨天') return -1
    if (b === '昨天') return 1
    return 0
  })

  const renderNoteCard = ({ item }: { item: NotebookSummary }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
      onPress={() => router.push(`/(app)/notebook/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.tagContainer}>
          {item.tags?.slice(0, 2).map((tag, idx) => (
            <View key={idx} style={[styles.tagBadge, { backgroundColor: theme.bgTertiary }]}>
              <Tag size={10} color={theme.textSecondary} />
              <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.timeText, { color: theme.textTertiary }]}>
          {new Date(item.updated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      
      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      
      {item.preview && (
        <Text style={[styles.cardPreview, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.preview}
        </Text>
      )}
      
      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Headphones size={12} color={theme.textTertiary} />
          <Text style={[styles.metaText, { color: theme.textTertiary }]}>15:32</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[styles.aiBadge, { color: colors.primary }]}>⚡ 3个待办</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderDateGroup = (date: string, items: NotebookSummary[]) => (
    <View key={date} style={styles.dateGroup}>
      <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>{date}</Text>
      {items.map((item, idx) => (
        <View key={item.id} style={idx !== items.length - 1 && styles.cardSpacing}>
          {renderNoteCard({ item })}
        </View>
      ))}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 快捷操作栏 */}
      <View style={[styles.quickActions, { backgroundColor: theme.bgSecondary }]}>
        <TouchableOpacity 
          style={styles.quickBtn}
          onPress={() => router.push('/(app)/topic-map')}
        >
          <View style={[styles.quickIcon, { backgroundColor: colors.primaryLight }]}>
            <Map size={20} color={colors.primary} />
          </View>
          <Text style={[styles.quickLabel, { color: theme.textSecondary }]}>主题地图</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickBtn}>
          <View style={[styles.quickIcon, { backgroundColor: colors.primaryLight }]}>
            <Bot size={20} color={colors.primary} />
          </View>
          <Text style={[styles.quickLabel, { color: theme.textSecondary }]}>AI助手</Text>
        </TouchableOpacity>
      </View>

      {/* 内容列表 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notebooks.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Mic size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>开始记录你的想法</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              点击下方语音按钮，用语音快速记录
            </Text>
          </View>
        ) : (
          sortedDates.map(date => renderDateGroup(date, groupedNotes[date]))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    padding: spacing['4'],
    gap: spacing['3'],
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['3'],
    borderRadius: radius.md,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: font.sizes.sm,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: spacing['4'],
    paddingBottom: spacing['8'],
  },
  dateGroup: {
    marginBottom: spacing['4'],
  },
  dateLabel: {
    fontSize: font.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing['3'],
  },
  cardSpacing: {
    marginBottom: spacing['3'],
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing['4'],
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2'],
  },
  tagContainer: {
    flexDirection: 'row',
    gap: spacing['2'],
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  timeText: {
    fontSize: font.sizes.xs,
  },
  cardTitle: {
    fontSize: font.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing['1'],
  },
  cardPreview: {
    fontSize: font.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing['2'],
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['1'],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: font.sizes.xs,
  },
  aiBadge: {
    fontSize: font.sizes.xs,
    fontWeight: '500',
  },
  // 空状态
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['12'],
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['4'],
  },
  emptyTitle: {
    fontSize: font.sizes.xl,
    fontWeight: '600',
    marginBottom: spacing['2'],
  },
  emptySubtitle: {
    fontSize: font.sizes.base,
    textAlign: 'center',
    paddingHorizontal: spacing['8'],
  },
})
