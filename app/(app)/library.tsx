import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  useColorScheme, TextInput, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, radius, font, layout } from '@/components/ui/theme'
import { 
  Mic, 
  FileText, 
  Link2, 
  Search,
  Headphones,
  Type
} from 'lucide-react-native'
import { useNotebookStore } from '@/store/notebook-store'
import { NotebookSummary } from '@/types/notebook'

// 来源类型
const SOURCE_TYPES = [
  { id: 'voice', icon: Headphones, label: '语音笔记', color: '#10B981' },
  { id: 'text', icon: Type, label: '文字笔记', color: '#6366F1' },
  { id: 'pdf', icon: FileText, label: '文档PDF', color: '#F59E0B' },
  { id: 'link', icon: Link2, label: '链接文章', color: '#3B82F6' },
]

// 标签
const TAGS = ['全部', '工作', '灵感', '会议', '待办', '学习']

export default function LibraryScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  const { notebooks, fetchNotebooks } = useNotebookStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('全部')

  useEffect(() => { fetchNotebooks() }, [])

  // 过滤笔记
  const filteredNotebooks = notebooks.filter(notebook => {
    const matchesSearch = notebook.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = selectedTag === '全部' || notebook.tags?.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  const renderNoteCard = ({ item }: { item: NotebookSummary }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.cover_color }]}
      onPress={() => router.push(`/(app)/notebook/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        {item.tags?.map((tag, idx) => (
          <View key={idx} style={styles.tagBadge}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        <Text style={styles.cardDate}>
          {new Date(item.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {item.preview && (
        <Text style={styles.cardPreview} numberOfLines={2}>{item.preview}</Text>
      )}
      
      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Mic size={12} color="rgba(255,255,255,0.8)" />
          <Text style={styles.metaText}>5:32</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>⚡ 3个待办</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 搜索框 */}
      <View style={[styles.searchContainer, { backgroundColor: theme.bgSecondary }]}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="搜索笔记内容..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* 来源分类 */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>来源分类</Text>
        <View style={styles.sourceGrid}>
          {SOURCE_TYPES.map((source) => (
            <TouchableOpacity 
              key={source.id}
              style={[styles.sourceCard, { backgroundColor: theme.bgTertiary }]}
            >
              <source.icon size={28} color={source.color} strokeWidth={2} />
              <Text style={[styles.sourceLabel, { color: theme.text }]}>{source.label}</Text>
              <Text style={[styles.sourceCount, { color: theme.textSecondary }]}>
                {source.id === 'voice' ? '24' : source.id === 'text' ? '12' : source.id === 'pdf' ? '8' : '15'} 条
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 标签筛选 */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>标签</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagPill,
                selectedTag === tag 
                  ? { backgroundColor: colors.primaryLight } 
                  : { backgroundColor: theme.bgTertiary, borderColor: theme.border }
              ]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text style={[
                styles.tagPillText,
                { color: selectedTag === tag ? colors.primary : theme.textSecondary }
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 最近添加 */}
        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>最近添加</Text>
          <TouchableOpacity>
            <Text style={[styles.viewAll, { color: colors.primary }]}>查看全部</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredNotebooks}
          keyExtractor={(n) => n.id}
          numColumns={2}
          columnWrapperStyle={styles.noteRow}
          renderItem={renderNoteCard}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>暂无笔记</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                点击下方语音按钮开始记录
              </Text>
            </View>
          }
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing['4'],
    marginVertical: spacing['3'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.xl,
    gap: spacing['2'],
  },
  searchInput: {
    flex: 1,
    fontSize: font.sizes.base,
    paddingVertical: 0,
  },
  content: {
    paddingHorizontal: spacing['4'],
    paddingBottom: spacing['8'],
  },
  sectionTitle: {
    fontSize: font.sizes.base,
    fontWeight: '600',
    marginTop: spacing['4'],
    marginBottom: spacing['3'],
  },
  // 来源分类
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['3'],
  },
  sourceCard: {
    width: '47%',
    padding: spacing['4'],
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing['1'],
  },
  sourceLabel: {
    fontSize: font.sizes.sm,
    fontWeight: '500',
    marginTop: spacing['1'],
  },
  sourceCount: {
    fontSize: font.sizes.xs,
  },
  // 标签
  tagsContainer: {
    flexDirection: 'row',
    gap: spacing['2'],
    paddingRight: spacing['4'],
  },
  tagPill: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1.5'],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: font.sizes.sm,
    fontWeight: '500',
  },
  // 最近添加
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['4'],
  },
  viewAll: {
    fontSize: font.sizes.sm,
  },
  noteRow: {
    gap: spacing['3'],
    marginBottom: spacing['3'],
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing['4'],
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2'],
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  cardTitle: {
    color: '#fff',
    fontSize: font.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing['2'],
  },
  cardPreview: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: font.sizes.sm,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['2'],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: font.sizes.xs,
  },
  // 空状态
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['8'],
    width: '100%',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing['3'],
  },
  emptyTitle: {
    fontSize: font.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing['1'],
  },
  emptySubtitle: {
    fontSize: font.sizes.sm,
    textAlign: 'center',
  },
  cardDate: {
    fontSize: font.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
})
