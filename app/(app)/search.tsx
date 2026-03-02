import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  useColorScheme, FlatList, Keyboard
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { Search, X, Clock, ArrowRight } from 'lucide-react-native'
import { useNotebookStore } from '@/store/notebook-store'

// 搜索历史
const SEARCH_HISTORY = ['产品需求', '用户调研', '会议纪要', '设计灵感']

// 热门搜索
const TRENDING_SEARCHES = ['AI功能', '语音转文字', '待办管理', '知识库']

export default function SearchScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  const { notebooks } = useNotebookStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<typeof notebooks>([])
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (query.trim()) {
      const filtered = notebooks.filter(notebook => 
        notebook.title.toLowerCase().includes(query.toLowerCase()) ||
        notebook.preview?.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered)
      setShowResults(true)
    } else {
      setShowResults(false)
    }
  }, [query, notebooks])

  const handleClear = () => {
    setQuery('')
    setShowResults(false)
    Keyboard.dismiss()
  }

  const handleSearch = (text: string) => {
    setQuery(text)
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 搜索栏 */}
      <View style={[styles.searchBar, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <Search size={20} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="搜索笔记内容..."
          placeholderTextColor={theme.textTertiary}
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <X size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 搜索结果 */}
      {showResults ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContainer}
          ListEmptyComponent={
            <View style={styles.emptyResult}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                未找到相关笔记
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultItem, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
              onPress={() => router.push(`/(app)/notebook/${item.id}`)}
            >
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: theme.text }]}>{item.title}</Text>
                {item.preview && (
                  <Text style={[styles.resultPreview, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.preview}
                  </Text>
                )}
              </View>
              <ArrowRight size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.suggestions}>
          {/* 搜索历史 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={16} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>搜索历史</Text>
            </View>
            <View style={styles.tagCloud}>
              {SEARCH_HISTORY.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.tag, { backgroundColor: theme.bgTertiary }]}
                  onPress={() => handleSearch(item)}
                >
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 热门搜索 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>热门搜索</Text>
            </View>
            <View style={styles.tagCloud}>
              {TRENDING_SEARCHES.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.tag, styles.trendingTag, { backgroundColor: colors.primaryLight }]}
                  onPress={() => handleSearch(item)}
                >
                  <Text style={[styles.tagText, styles.trendingText, { color: colors.primary }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing['4'],
    marginTop: spacing['4'],
    marginBottom: spacing['3'],
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing['3'],
  },
  searchInput: {
    flex: 1,
    fontSize: font.sizes.base,
    paddingVertical: 0,
  },
  suggestions: {
    paddingHorizontal: spacing['4'],
  },
  section: {
    marginBottom: spacing['6'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    marginBottom: spacing['3'],
  },
  sectionTitle: {
    fontSize: font.sizes.base,
    fontWeight: '600',
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  tag: {
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
  },
  trendingTag: {
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  tagText: {
    fontSize: font.sizes.sm,
  },
  trendingText: {
    fontWeight: '500',
  },

  // 搜索结果
  resultsContainer: {
    paddingHorizontal: spacing['4'],
    paddingBottom: spacing['8'],
  },
  emptyResult: {
    alignItems: 'center',
    paddingVertical: spacing['8'],
  },
  emptyText: {
    fontSize: font.sizes.base,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['4'],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing['3'],
  },
  resultContent: {
    flex: 1,
    gap: spacing['1'],
  },
  resultTitle: {
    fontSize: font.sizes.base,
    fontWeight: '500',
  },
  resultPreview: {
    fontSize: font.sizes.sm,
  },
})
