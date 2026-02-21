import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput,
  useColorScheme, ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, Animated, Dimensions, TouchableWithoutFeedback, FlatList,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { useAIAssistant, QuickNoteResult, SearchResult, TodoItem, DailyReview, PodcastResult, InspirationResult, ClusterResult, KnowledgeGapResult, TimelineResult, PeriodicReview } from '@/hooks/use-ai-assistant'
import { TavilySearchResult } from '@/lib/tavily'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

type TabType = 'home' | 'search' | 'quick' | 'todos'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function AIAssistantModal({ visible, onClose }: Props) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [inputText, setInputText] = useState('')
  const [searchMode, setSearchMode] = useState<'notes' | 'web'>('notes')
  const [quickResult, setQuickResult] = useState<QuickNoteResult | null>(null)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [todos, setTodos] = useState<{ today: TodoItem[]; thisWeek: TodoItem[]; overdue: TodoItem[] } | null>(null)
  const [ragAnswer, setRagAnswer] = useState<{ answer: string; sources: Array<{ notebook_id: string; notebook_title: string }> } | null>(null)
  const [dailyReview, setDailyReview] = useState<DailyReview | null>(null)
  const [allTags, setAllTags] = useState<Array<{ tag: string; count: number }>>([])
  const [podcast, setPodcast] = useState<PodcastResult | null>(null)
  const [inspirations, setInspirations] = useState<InspirationResult | null>(null)
  const [externalResult, setExternalResult] = useState<{ answer: string; sources: TavilySearchResult[] } | null>(null)
  const [thinkingPrompt, setThinkingPrompt] = useState<{ question: string; context: string; hints: string[] } | null>(null)
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null)
  const [gapsResult, setGapsResult] = useState<KnowledgeGapResult | null>(null)
  const [timelineResult, setTimelineResult] = useState<TimelineResult | null>(null)
  const [reviewResult, setReviewResult] = useState<PeriodicReview | null>(null)
  const [reviewPeriod, setReviewPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const inputRef = useRef<TextInput>(null)
  
  const { loading, error, quickNote, globalSearch, getUpcomingTodos, ragQuery, getDailyReview, indexAllCells, getAllTags, searchByTag, generatePodcast, getInspirations, externalSearch, getThinkingPrompt, clusterNotes, detectKnowledgeGaps, getTimeline, getPeriodicReview } = useAIAssistant()

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
      loadInitialData()
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start()
      resetState()
    }
  }, [visible])

  const loadInitialData = async () => {
    const todoData = await getUpcomingTodos()
    setTodos(todoData)
    const tags = await getAllTags()
    setAllTags(tags)
  }

  const resetState = () => {
    setActiveTab('home')
    setInputText('')
    setQuickResult(null)
    setSearchResult(null)
    setRagAnswer(null)
    setDailyReview(null)
  }

  const handleClose = () => {
    onClose()
  }

  const handleQuickNote = async () => {
    if (!inputText.trim()) return
    
    const result = await quickNote(inputText.trim())
    if (result) {
      setQuickResult(result)
      setInputText('')
    }
  }

  const handleSearch = async () => {
    if (!inputText.trim()) return
    
    const result = await globalSearch(inputText.trim())
    if (result) {
      setSearchResult(result)
    }
  }

  const handleRAGQuery = async () => {
    if (!inputText.trim()) return
    
    const result = await ragQuery(inputText.trim())
    if (result) {
      setRagAnswer(result)
    }
  }

  const handleDailyReview = async () => {
    const result = await getDailyReview()
    if (result) {
      setDailyReview(result)
    }
  }

  const handleExternalSearch = async () => {
    if (!inputText.trim()) return
    
    const result = await externalSearch(inputText.trim())
    if (result) {
      setExternalResult(result)
    }
  }

  const handleThinkingPrompt = async () => {
    const result = await getThinkingPrompt()
    if (result) {
      setThinkingPrompt(result)
    }
  }

  const handleOpenNotebook = (notebookId: string) => {
    onClose()
    router.push(`/(app)/notebook/${notebookId}`)
  }

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab)
    setQuickResult(null)
    setSearchResult(null)
    setExternalResult(null)
    setThinkingPrompt(null)
    setClusterResult(null)
    setGapsResult(null)
    setTimelineResult(null)
    setReviewResult(null)
    if (tab === 'quick' || tab === 'search' || tab === 'external') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleCluster = async () => {
    const result = await clusterNotes()
    if (result) {
      setClusterResult(result)
    }
  }

  const handleGaps = async () => {
    const result = await detectKnowledgeGaps()
    if (result) {
      setGapsResult(result)
    }
  }

  const handleTimeline = async (days: number = 30) => {
    const result = await getTimeline(days)
    if (result) {
      setTimelineResult(result)
    }
  }

  const handleReview = async (period: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    setReviewPeriod(period)
    const result = await getPeriodicReview(period)
    if (result) {
      setReviewResult(result)
    }
  }

  const tabs = [
    { type: 'home' as TabType, icon: '🏠', label: '首页' },
    { type: 'search' as TabType, icon: '🔍', label: '搜索' },
    { type: 'quick' as TabType, icon: '💡', label: '速记' },
    { type: 'todos' as TabType, icon: '📋', label: '待办' },
  ]

  const renderHome = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeIcon}>🤖</Text>
        <Text style={[styles.welcomeTitle, { color: theme.text }]}>AI 助手</Text>
        <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
          有什么可以帮你的？
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: colors.primary + '15' }]}
          onPress={() => handleTabPress('quick')}
        >
          <Text style={styles.quickActionIcon}>💡</Text>
          <Text style={[styles.quickActionLabel, { color: theme.text }]}>速记</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: '#10B981' + '15' }]}
          onPress={() => handleTabPress('search')}
        >
          <Text style={styles.quickActionIcon}>🔍</Text>
          <Text style={[styles.quickActionLabel, { color: theme.text }]}>搜索</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: '#F59E0B' + '15' }]}
          onPress={() => handleTabPress('todos')}
        >
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={[styles.quickActionLabel, { color: theme.text }]}>待办</Text>
        </TouchableOpacity>
      </View>

      {todos && (todos.today.length > 0 || todos.thisWeek.length > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>📋 待办提醒</Text>
          
          {todos.today.length > 0 && (
            <View style={styles.todoGroup}>
              <Text style={[styles.todoGroupTitle, { color: '#EF4444' }]}>🔴 今天</Text>
              {todos.today.slice(0, 3).map((todo, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.todoItem, { backgroundColor: theme.surface }]}
                  onPress={() => handleOpenNotebook(todo.notebook_id)}
                >
                  <Text style={[styles.todoText, { color: theme.text }]}>{todo.text}</Text>
                  <Text style={[styles.todoNotebook, { color: theme.textSecondary }]}>
                    {todo.notebook_title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {todos.thisWeek.length > 0 && (
            <View style={styles.todoGroup}>
              <Text style={[styles.todoGroupTitle, { color: '#F59E0B' }]}>🟡 本周</Text>
              {todos.thisWeek.slice(0, 3).map((todo, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.todoItem, { backgroundColor: theme.surface }]}
                  onPress={() => handleOpenNotebook(todo.notebook_id)}
                >
                  <Text style={[styles.todoText, { color: theme.text }]}>{todo.text}</Text>
                  <Text style={[styles.todoNotebook, { color: theme.textSecondary }]}>
                    {todo.notebook_title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )

  const renderQuickNote = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>💡 快速想法转笔记</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        输入一个简短的想法，AI 帮你扩展成完整笔记
      </Text>

      <TextInput
        ref={inputRef}
        style={[styles.inputArea, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        value={inputText}
        onChangeText={setInputText}
        placeholder="例如：今天开会想到可以在产品里加个AI助手..."
        placeholderTextColor={theme.textTertiary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.primary }, loading && styles.actionBtnDisabled]}
        onPress={handleQuickNote}
        disabled={loading || !inputText.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionBtnText}>生成笔记</Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {quickResult && (
        <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.resultTitle, { color: theme.text }]}>{quickResult.title}</Text>
          <Text style={[styles.resultContent, { color: theme.textSecondary }]}>
            {quickResult.content.slice(0, 200)}...
          </Text>
          
          {quickResult.action_items.length > 0 && (
            <View style={styles.resultActions}>
              <Text style={[styles.resultActionsTitle, { color: theme.text }]}>待办事项:</Text>
              {quickResult.action_items.map((item, i) => (
                <Text key={i} style={[styles.resultActionItem, { color: theme.textSecondary }]}>
                  • {item.text}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.openNoteBtn}
            onPress={() => handleOpenNotebook((quickResult as any).notebookId)}
          >
            <Text style={styles.openNoteBtnText}>打开笔记 →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  const renderSearch = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🔍 搜索</Text>
      
      <View style={styles.searchTabs}>
        <TouchableOpacity
          style={[styles.searchTab, searchMode === 'notes' && { backgroundColor: colors.primary }]}
          onPress={() => setSearchMode('notes')}
        >
          <Text style={[styles.searchTabText, searchMode !== 'notes' && { color: theme.text }]}>笔记内</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.searchTab, searchMode === 'web' && { backgroundColor: colors.primary }]}
          onPress={() => setSearchMode('web')}
        >
          <Text style={[styles.searchTabText, searchMode !== 'web' && { color: theme.text }]}>互联网</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchInputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: theme.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={searchMode === 'notes' ? "搜索想法、主题、关键词..." : "搜索互联网..."}
          placeholderTextColor={theme.textTertiary}
          returnKeyType="search"
          onSubmitEditing={searchMode === 'notes' ? handleSearch : handleExternalSearch}
        />
        <TouchableOpacity 
          onPress={searchMode === 'notes' ? handleSearch : handleExternalSearch} 
          disabled={loading || !inputText.trim()}
        >
          <Text style={[styles.searchBtn, { opacity: inputText.trim() ? 1 : 0.5 }]}>搜索</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>搜索中...</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {searchMode === 'notes' && searchResult && (
        <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
          <Text style={[styles.searchAnswer, { color: theme.text }]}>{searchResult.answer}</Text>
          
          {searchResult.highlights.length > 0 && (
            <View style={styles.highlightsSection}>
              <Text style={[styles.highlightsTitle, { color: theme.textSecondary }]}>相关笔记</Text>
              {searchResult.highlights.map((h, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.highlightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleOpenNotebook(h.notebook_id)}
                >
                  <Text style={[styles.highlightTitle, { color: theme.text }]}>{h.notebook_title}</Text>
                  <Text style={[styles.highlightText, { color: theme.textSecondary }]} numberOfLines={3}>
                    {h.relevant_text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchResult.suggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={[styles.suggestionsTitle, { color: theme.textSecondary }]}>相关搜索</Text>
              <View style={styles.suggestionTags}>
                {searchResult.suggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={[styles.suggestionTag, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.suggestionTagText, { color: theme.text }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {searchMode === 'web' && externalResult && (
        <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
          <View style={[styles.answerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.answerLabel, { color: theme.textSecondary }]}>💡 回答</Text>
            <Text style={[styles.answerText, { color: theme.text }]}>{externalResult.answer}</Text>
          </View>
          
          {externalResult.sources.length > 0 && (
            <View style={styles.sourcesSection}>
              <Text style={[styles.sourcesTitle, { color: theme.textSecondary }]}>来源</Text>
              {externalResult.sources.slice(0, 5).map((source, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.sourceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(source.url)}
                >
                  <Text style={[styles.sourceTitle, { color: theme.text }]} numberOfLines={1}>{source.title}</Text>
                  <Text style={[styles.sourceContent, { color: theme.textSecondary }]} numberOfLines={2}>{source.content}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )

  const renderTodos = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>📋 待办事项</Text>
      
      {todos && (
        <>
          {todos.today.length > 0 && (
            <View style={styles.todoSection}>
              <Text style={[styles.todoSectionTitle, { color: '#EF4444' }]}>🔴 今天</Text>
              {todos.today.map((todo, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.todoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleOpenNotebook(todo.notebook_id)}
                >
                  <View style={styles.todoCardHeader}>
                    <Text style={[styles.todoCardText, { color: theme.text }]}>{todo.text}</Text>
                    <Text style={[styles.todoCardPriority, { color: getPriorityColor(todo.priority) }]}>
                      {getPriorityLabel(todo.priority)}
                    </Text>
                  </View>
                  <Text style={[styles.todoCardNotebook, { color: theme.textSecondary }]}>
                    📝 {todo.notebook_title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {todos.thisWeek.length > 0 && (
            <View style={styles.todoSection}>
              <Text style={[styles.todoSectionTitle, { color: '#F59E0B' }]}>🟡 本周</Text>
              {todos.thisWeek.map((todo, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.todoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleOpenNotebook(todo.notebook_id)}
                >
                  <View style={styles.todoCardHeader}>
                    <Text style={[styles.todoCardText, { color: theme.text }]}>{todo.text}</Text>
                    <Text style={[styles.todoCardPriority, { color: getPriorityColor(todo.priority) }]}>
                      {getPriorityLabel(todo.priority)}
                    </Text>
                  </View>
                  <Text style={[styles.todoCardNotebook, { color: theme.textSecondary }]}>
                    📝 {todo.notebook_title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {todos.today.length === 0 && todos.thisWeek.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>✨</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>太棒了！</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                暂无待办事项，继续保持！
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  )

  const renderRAG = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🧠 知识问答</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        基于你的笔记回答问题
      </Text>

      <View style={[styles.searchInputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: theme.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="问任何关于你笔记的问题..."
          placeholderTextColor={theme.textTertiary}
          returnKeyType="search"
          onSubmitEditing={handleRAGQuery}
        />
        <TouchableOpacity onPress={handleRAGQuery} disabled={loading || !inputText.trim()}>
          <Text style={[styles.searchBtn, { opacity: inputText.trim() ? 1 : 0.5 }]}>提问</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>思考中...</Text>
        </View>
      )}

      {ragAnswer && (
        <ScrollView style={styles.ragResults} showsVerticalScrollIndicator={false}>
          <View style={[styles.ragAnswerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.ragAnswerText, { color: theme.text }]}>{ragAnswer.answer}</Text>
          </View>
          
          {ragAnswer.sources.length > 0 && (
            <View style={styles.sourcesSection}>
              <Text style={[styles.sourcesTitle, { color: theme.textSecondary }]}>📚 参考来源</Text>
              {ragAnswer.sources.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.sourceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleOpenNotebook(s.notebook_id)}
                >
                  <Text style={[styles.sourceTitle, { color: theme.text }]}>{s.notebook_title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )

  const renderDaily = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>📅 每日回顾</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        总结今天记录的内容
      </Text>

      {!dailyReview && !loading && (
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={handleDailyReview}
        >
          <Text style={styles.generateBtnText}>生成今日回顾</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>生成中...</Text>
        </View>
      )}

      {dailyReview && (
        <View style={styles.dailyContent}>
          <View style={[styles.dailySummaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.dailySummaryLabel, { color: theme.textSecondary }]}>📝 今日总结</Text>
            <Text style={[styles.dailySummaryText, { color: theme.text }]}>{dailyReview.summary}</Text>
          </View>

          {dailyReview.key_topics.length > 0 && (
            <View style={styles.dailySection}>
              <Text style={[styles.dailySectionTitle, { color: theme.textSecondary }]}>🏷️ 关键主题</Text>
              <View style={styles.topicTags}>
                {dailyReview.key_topics.map((topic, i) => (
                  <View key={i} style={[styles.topicTag, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.topicTagText, { color: colors.primary }]}>{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {dailyReview.highlights.length > 0 && (
            <View style={styles.dailySection}>
              <Text style={[styles.dailySectionTitle, { color: theme.textSecondary }]}>✨ 重点内容</Text>
              {dailyReview.highlights.map((h, i) => (
                <View key={i} style={[styles.highlightItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.highlightItemText, { color: theme.text }]}>{h.content}</Text>
                  <Text style={[styles.highlightItemSource, { color: theme.textSecondary }]}>
                    📄 {h.notebook_title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {dailyReview.suggestions.length > 0 && (
            <View style={styles.dailySection}>
              <Text style={[styles.dailySectionTitle, { color: theme.textSecondary }]}>💡 明日建议</Text>
              {dailyReview.suggestions.map((s, i) => (
                <Text key={i} style={[styles.suggestionText, { color: theme.text }]}>• {s}</Text>
              ))}
            </View>
          )}

          {dailyReview.pending_todos.length > 0 && (
            <View style={styles.dailySection}>
              <Text style={[styles.dailySectionTitle, { color: '#EF4444' }]}>⏰ 待办提醒</Text>
              {dailyReview.pending_todos.map((t, i) => (
                <Text key={i} style={[styles.pendingTodoText, { color: theme.text }]}>• {t}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={handleDailyReview}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 重新生成</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderTags = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🏷️ 智能标签</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        按标签浏览和发现笔记
      </Text>

      {allTags.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🏷️</Text>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>暂无标签</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            创建笔记后，系统会自动生成标签
          </Text>
        </View>
      ) : (
        <View style={styles.tagsSection}>
          <Text style={[styles.tagsSectionTitle, { color: theme.textSecondary }]}>所有标签</Text>
          <View style={styles.tagsCloud}>
            {allTags.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.tagItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={async () => {
                  const results = await searchByTag(item.tag)
                  if (results.length > 0) {
                    handleOpenNotebook(results[0].id)
                  }
                }}
              >
                <Text style={[styles.tagItemText, { color: theme.text }]}>{item.tag}</Text>
                <Text style={[styles.tagItemCount, { color: theme.textSecondary }]}>{item.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )

  const handlePodcast = async () => {
    const result = await generatePodcast()
    if (result) {
      setPodcast(result)
    }
  }

  const handleInspire = async () => {
    const result = await getInspirations()
    if (result) {
      setInspirations(result)
    }
  }

  const renderPodcast = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🎙️ 每日播客</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        15分钟消化你的未读内容
      </Text>

      {!podcast && !loading && (
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={handlePodcast}
        >
          <Text style={styles.generateBtnText}>生成今日播客</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>生成播客脚本中...</Text>
        </View>
      )}

      {podcast && (
        <View style={styles.podcastContainer}>
          <View style={[styles.podcastHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.podcastTitle, { color: theme.text }]}>{podcast.title}</Text>
            <Text style={[styles.podcastDuration, { color: theme.textSecondary }]}>
              约 {podcast.duration_minutes} 分钟
            </Text>
          </View>

          {podcast.sections.map((section, i) => (
            <View key={i} style={[styles.podcastSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTypeIcon}>
                  {section.type === 'intro' ? '🎤' : section.type === 'content' ? '📝' : '📌'}
                </Text>
                <Text style={[styles.podcastSectionTitle, { color: theme.text }]}>{section.title}</Text>
                <Text style={[styles.sectionDuration, { color: theme.textSecondary }]}>
                  {Math.floor(section.duration_seconds / 60)}:{String(section.duration_seconds % 60).padStart(2, '0')}
                </Text>
              </View>
              <Text style={[styles.sectionContent, { color: theme.text }]}>{section.content}</Text>
            </View>
          ))}

          {podcast.key_points.length > 0 && (
            <View style={[styles.keyPointsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.keyPointsTitle, { color: theme.text }]}>💡 关键要点</Text>
              {podcast.key_points.map((point, i) => (
                <Text key={i} style={[styles.keyPointText, { color: theme.text }]}>• {point}</Text>
              ))}
            </View>
          )}

          {podcast.action_reminders.length > 0 && (
            <View style={[styles.actionCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={[styles.actionTitle, { color: '#92400E' }]}>⏰ 行动提醒</Text>
              {podcast.action_reminders.map((action, i) => (
                <Text key={i} style={[styles.actionText, { color: '#92400E' }]}>• {action}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={handlePodcast}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 重新生成</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderInspire = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>✨ 灵感推荐</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        基于你的笔记发现新思路
      </Text>

      {!inspirations && !loading && (
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={handleInspire}
        >
          <Text style={styles.generateBtnText}>获取灵感推荐</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>分析笔记中...</Text>
        </View>
      )}

      {inspirations && (
        <View style={styles.inspireContainer}>
          {inspirations.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>为你推荐</Text>
              {inspirations.recommendations.map((rec, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.recCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => rec.related_notebook_id && handleOpenNotebook(rec.related_notebook_id)}
                >
                  <View style={styles.recHeader}>
                    <Text style={styles.recTypeIcon}>
                      {rec.type === 'read' ? '📖' : rec.type === 'action' ? '🎯' : '🔍'}
                    </Text>
                    <View style={[styles.priorityBadge, { 
                      backgroundColor: rec.priority === 'high' ? '#FEE2E2' : rec.priority === 'medium' ? '#FEF3C7' : '#DBEAFE'
                    }]}>
                      <Text style={[styles.priorityText, {
                        color: rec.priority === 'high' ? '#DC2626' : rec.priority === 'medium' ? '#D97706' : '#2563EB'
                      }]}>
                        {rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.recTitle, { color: theme.text }]}>{rec.title}</Text>
                  <Text style={[styles.recDesc, { color: theme.textSecondary }]}>{rec.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {inspirations.trending_topics.length > 0 && (
            <View style={styles.trendingSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>🔥 热门主题</Text>
              <View style={styles.trendingTags}>
                {inspirations.trending_topics.map((topic, i) => (
                  <View key={i} style={[styles.trendingTag, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.trendingTagText, { color: theme.text }]}>{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {inspirations.connections.length > 0 && (
            <View style={styles.connectionsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>🔗 发现关联</Text>
              {inspirations.connections.map((conn, i) => (
                <Text key={i} style={[styles.connectionText, { color: theme.text }]}>• {conn}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={handleInspire}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 刷新推荐</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderExternal = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🌐 外部搜索</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        搜索互联网获取最新信息
      </Text>

      <View style={[styles.searchInputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="搜索任何问题..."
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          onPress={handleExternalSearch}
          disabled={loading || !inputText.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchBtnText}>搜索</Text>
          )}
        </TouchableOpacity>
      </View>

      {externalResult && (
        <View style={styles.externalResult}>
          <View style={[styles.answerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.answerLabel, { color: theme.textSecondary }]}>💡 回答</Text>
            <Text style={[styles.answerText, { color: theme.text }]}>{externalResult.answer}</Text>
          </View>

          {externalResult.sources.length > 0 && (
            <View style={styles.sourcesSection}>
              <Text style={[styles.sourcesLabel, { color: theme.textSecondary }]}>📚 来源</Text>
              {externalResult.sources.map((source, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.sourceItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(source.url)}
                >
                  <Text style={[styles.sourceTitle, { color: theme.text }]} numberOfLines={2}>
                    [{i + 1}] {source.title}
                  </Text>
                  <Text style={[styles.sourceContent, { color: theme.textSecondary }]} numberOfLines={2}>
                    {source.content}
                  </Text>
                  <Text style={[styles.sourceUrl, { color: colors.primary }]} numberOfLines={1}>
                    {new URL(source.url).hostname}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )

  const renderThinking = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>💭 每日思考</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        基于你的笔记生成思考问题
      </Text>

      {!thinkingPrompt && !loading && (
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={handleThinkingPrompt}
        >
          <Text style={styles.generateBtnText}>生成今日思考</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>分析笔记中...</Text>
        </View>
      )}

      {thinkingPrompt && (
        <View style={styles.thinkingContainer}>
          <View style={[styles.questionCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Text style={styles.questionIcon}>🤔</Text>
            <Text style={[styles.questionText, { color: theme.text }]}>{thinkingPrompt.question}</Text>
          </View>

          <View style={[styles.contextCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>📖 背景</Text>
            <Text style={[styles.contextText, { color: theme.text }]}>{thinkingPrompt.context}</Text>
          </View>

          {thinkingPrompt.hints.length > 0 && (
            <View style={styles.hintsSection}>
              <Text style={[styles.hintsLabel, { color: theme.textSecondary }]}>💡 思考方向</Text>
              {thinkingPrompt.hints.map((hint, i) => (
                <View key={i} style={[styles.hintItem, { backgroundColor: theme.surface }]}>
                  <Text style={styles.hintBullet}>→</Text>
                  <Text style={[styles.hintText, { color: theme.text }]}>{hint}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={handleThinkingPrompt}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 换一个问题</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderCluster = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🔮 想法聚类</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        发现笔记中的隐藏主题和模式
      </Text>

      {!clusterResult && !loading && (
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={handleCluster}
        >
          <Text style={styles.generateBtnText}>开始聚类分析</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>分析笔记相似性...</Text>
        </View>
      )}

      {clusterResult && (
        <View style={styles.clusterContainer}>
          {clusterResult.clusters.length > 0 && (
            <View style={styles.clustersSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>📊 发现的主题聚类</Text>
              {clusterResult.clusters.map((cluster, i) => (
                <View key={i} style={[styles.clusterCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.clusterHeader}>
                    <Text style={[styles.clusterTheme, { color: colors.primary }]}>{cluster.theme}</Text>
                    <Text style={[styles.clusterCount, { color: theme.textSecondary }]}>{cluster.notebook_ids.length}篇</Text>
                  </View>
                  {cluster.description && (
                    <Text style={[styles.clusterDesc, { color: theme.text }]}>{cluster.description}</Text>
                  )}
                  <View style={styles.clusterNotebooks}>
                    {cluster.notebook_titles.slice(0, 3).map((title, j) => (
                      <TouchableOpacity
                        key={j}
                        style={[styles.clusterNotebookChip, { backgroundColor: theme.bg }]}
                        onPress={() => {
                          onClose()
                          router.push(`/(app)/notebook/${cluster.notebook_ids[j]}`)
                        }}
                      >
                        <Text style={[styles.clusterNotebookText, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                      </TouchableOpacity>
                    ))}
                    {cluster.notebook_titles.length > 3 && (
                      <Text style={[styles.moreText, { color: theme.textSecondary }]}>+{cluster.notebook_titles.length - 3}</Text>
                    )}
                  </View>
                  {cluster.merge_suggestion && (
                    <View style={[styles.mergeSuggestion, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.mergeSuggestionText, { color: theme.text }]}>💡 {cluster.merge_suggestion}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {clusterResult.orphan_notes.length > 0 && (
            <View style={styles.orphansSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>🏝️ 孤立笔记</Text>
              {clusterResult.orphan_notes.map((orphan, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.orphanItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    onClose()
                    router.push(`/(app)/notebook/${orphan.id}`)
                  }}
                >
                  <Text style={[styles.orphanTitle, { color: theme.text }]}>{orphan.title}</Text>
                  <Text style={[styles.orphanReason, { color: theme.textSecondary }]}>{orphan.reason}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {clusterResult.insights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>💡 洞察</Text>
              {clusterResult.insights.map((insight, i) => (
                <Text key={i} style={[styles.insightText, { color: theme.text }]}>• {insight}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={handleCluster}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 重新分析</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderGaps = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>🎯 知识盲区</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        发现知识体系中的空白点
      </Text>

      {!gapsResult && !loading && (
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={handleGaps}
        >
          <Text style={styles.generateBtnText}>探测知识盲区</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>分析知识体系...</Text>
        </View>
      )}

      {gapsResult && (
        <View style={styles.gapsContainer}>
          <View style={[styles.scoreCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Text style={styles.scoreLabel}>知识覆盖度</Text>
            <Text style={[styles.scoreValue, { color: colors.primary }]}>{gapsResult.coverage_score}%</Text>
          </View>

          {gapsResult.gaps.length > 0 && (
            <View style={styles.gapsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>🔍 发现的知识盲区</Text>
              {gapsResult.gaps.map((gap, i) => (
                <View key={i} style={[styles.gapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.gapHeader}>
                    <Text style={[styles.gapTopic, { color: theme.text }]}>{gap.topic}</Text>
                    <View style={[styles.priorityBadge, { 
                      backgroundColor: gap.priority === 'high' ? '#FEE2E2' : gap.priority === 'medium' ? '#FEF3C7' : '#DBEAFE'
                    }]}>
                      <Text style={[styles.priorityText, {
                        color: gap.priority === 'high' ? '#DC2626' : gap.priority === 'medium' ? '#D97706' : '#2563EB'
                      }]}>
                        {gap.priority === 'high' ? '高' : gap.priority === 'medium' ? '中' : '低'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.gapDesc, { color: theme.textSecondary }]}>{gap.description}</Text>
                  {gap.suggested_actions.length > 0 && (
                    <View style={styles.gapActions}>
                      <Text style={[styles.gapActionsLabel, { color: theme.textSecondary }]}>建议行动：</Text>
                      {gap.suggested_actions.map((action, j) => (
                        <Text key={j} style={[styles.gapActionText, { color: theme.text }]}>→ {action}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {gapsResult.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>📋 整体建议</Text>
              {gapsResult.recommendations.map((rec, i) => (
                <Text key={i} style={[styles.recommendationText, { color: theme.text }]}>• {rec}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={handleGaps}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 重新探测</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderTimeline = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>📈 思维时间线</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        追踪想法的演化轨迹
      </Text>

      {!timelineResult && !loading && (
        <View style={styles.periodButtons}>
          <TouchableOpacity
            style={[styles.periodBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleTimeline(7)}
          >
            <Text style={styles.periodBtnText}>近7天</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleTimeline(30)}
          >
            <Text style={styles.periodBtnText}>近30天</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleTimeline(90)}
          >
            <Text style={styles.periodBtnText}>近90天</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>生成时间线...</Text>
        </View>
      )}

      {timelineResult && (
        <View style={styles.timelineContainer}>
          {timelineResult.themes.length > 0 && (
            <View style={styles.themesSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>📊 主题趋势</Text>
              <View style={styles.themesList}>
                {timelineResult.themes.map((t, i) => (
                  <View key={i} style={[styles.themeItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.themeName, { color: colors.primary }]}>{t.name}</Text>
                    <Text style={[styles.themeCount, { color: theme.textSecondary }]}>{t.count}次</Text>
                    <Text style={[
                      styles.themeTrend,
                      { color: t.trend === 'rising' ? '#10B981' : t.trend === 'declining' ? '#EF4444' : '#6B7280' }
                    ]}>
                      {t.trend === 'rising' ? '↑ 上升' : t.trend === 'declining' ? '↓ 下降' : '→ 稳定'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {timelineResult.events.length > 0 && (
            <View style={styles.eventsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>📅 时间线事件</Text>
              {timelineResult.events.slice(-15).reverse().map((event, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.eventItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    if (event.notebook_id) {
                      onClose()
                      router.push(`/(app)/notebook/${event.notebook_id}`)
                    }
                  }}
                >
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTypeIcon}>
                      {event.type === 'note' ? '📝' : event.type === 'link' ? '🔗' : event.type === 'insight' ? '💡' : '✅'}
                    </Text>
                    <Text style={[styles.eventDate, { color: theme.textSecondary }]}>{event.date}</Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>{event.title}</Text>
                  {event.tags.length > 0 && (
                    <View style={styles.eventTags}>
                      {event.tags.slice(0, 3).map((tag, j) => (
                        <View key={j} style={[styles.eventTag, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.eventTagText, { color: colors.primary }]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {timelineResult.insights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>💡 洞察</Text>
              {timelineResult.insights.map((insight, i) => (
                <Text key={i} style={[styles.insightText, { color: theme.text }]}>• {insight}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={() => handleTimeline(30)}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 刷新时间线</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderReview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>📊 定期知识回顾</Text>
      <Text style={[styles.tabSubtitle, { color: theme.textSecondary }]}>
        了解知识探索进展
      </Text>

      {!reviewResult && !loading && (
        <View style={styles.periodButtons}>
          <TouchableOpacity
            style={[styles.periodBtn, reviewPeriod === 'daily' ? { backgroundColor: colors.primary } : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => handleReview('daily')}
          >
            <Text style={[styles.periodBtnText, reviewPeriod !== 'daily' && { color: theme.text }]}>今日</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, reviewPeriod === 'weekly' ? { backgroundColor: colors.primary } : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => handleReview('weekly')}
          >
            <Text style={[styles.periodBtnText, reviewPeriod !== 'weekly' && { color: theme.text }]}>本周</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, reviewPeriod === 'monthly' ? { backgroundColor: colors.primary } : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => handleReview('monthly')}
          >
            <Text style={[styles.periodBtnText, reviewPeriod !== 'monthly' && { color: theme.text }]}>本月</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>生成回顾报告...</Text>
        </View>
      )}

      {reviewResult && (
        <View style={styles.reviewContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Text style={[styles.summaryText, { color: theme.text }]}>{reviewResult.summary}</Text>
          </View>

          <View style={styles.progressGrid}>
            <View style={[styles.progressItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.progressIcon}>📝</Text>
              <Text style={[styles.progressValue, { color: colors.primary }]}>{reviewResult.progress.new_notes}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>新笔记</Text>
            </View>
            <View style={[styles.progressItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.progressIcon}>✅</Text>
              <Text style={[styles.progressValue, { color: '#10B981' }]}>{reviewResult.progress.completed_todos}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>已完成</Text>
            </View>
            <View style={[styles.progressItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.progressIcon}>⏳</Text>
              <Text style={[styles.progressValue, { color: '#F59E0B' }]}>{reviewResult.progress.pending_todos}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>待处理</Text>
            </View>
            <View style={[styles.progressItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.progressIcon}>🔗</Text>
              <Text style={[styles.progressValue, { color: '#8B5CF6' }]}>{reviewResult.progress.new_links}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>新链接</Text>
            </View>
          </View>

          {reviewResult.key_topics.length > 0 && (
            <View style={styles.topicsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>📚 关注主题</Text>
              {reviewResult.key_topics.map((topic, i) => (
                <View key={i} style={[styles.topicItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.topicHeader}>
                    <Text style={[styles.topicName, { color: theme.text }]}>{topic.topic}</Text>
                    <Text style={[styles.topicCount, { color: theme.textSecondary }]}>{topic.note_count}篇</Text>
                  </View>
                  {topic.key_insight && (
                    <Text style={[styles.topicInsight, { color: theme.textSecondary }]}>{topic.key_insight}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {reviewResult.highlights.length > 0 && (
            <View style={styles.highlightsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>✨ 亮点</Text>
              {reviewResult.highlights.map((highlight, i) => (
                <Text key={i} style={[styles.highlightText, { color: theme.text }]}>• {highlight}</Text>
              ))}
            </View>
          )}

          {reviewResult.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>💡 建议</Text>
              {reviewResult.recommendations.map((rec, i) => (
                <Text key={i} style={[styles.recommendationText, { color: theme.text }]}>• {rec}</Text>
              ))}
            </View>
          )}

          {reviewResult.next_focus.length > 0 && (
            <View style={styles.nextFocusSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>🎯 下一步关注</Text>
              {reviewResult.next_focus.map((focus, i) => (
                <Text key={i} style={[styles.focusText, { color: colors.primary }]}>→ {focus}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.regenerateBtn, { borderColor: theme.border }]}
            onPress={() => handleReview(reviewPeriod)}
          >
            <Text style={[styles.regenerateBtnText, { color: theme.textSecondary }]}>🔄 刷新回顾</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHome()
      case 'quick': return renderQuickNote()
      case 'search': return renderSearch()
      case 'todos': return renderTodos()
      default: return renderHome()
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      
      <Animated.View 
        style={[
          styles.modalContainer, 
          { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>AI 助手</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.type}
                style={[styles.tabBtn, activeTab === tab.type && styles.tabBtnActive]}
                onPress={() => handleTabPress(tab.type)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, { color: activeTab === tab.type ? colors.primary : theme.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.content}>
            {renderContent()}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  )
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981',
  }
  return colors[priority] || '#6B7280'
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  return labels[priority] || ''
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  tabBtnActive: {
    backgroundColor: colors.primary + '15',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.medium,
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
    padding: spacing.lg,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: font.sizes.xxl,
    fontWeight: font.weights.bold,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: font.sizes.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.md,
  },
  todoGroup: {
    marginBottom: spacing.md,
  },
  todoGroupTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  todoItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  todoText: {
    fontSize: font.sizes.md,
    marginBottom: 2,
  },
  todoNotebook: {
    fontSize: font.sizes.xs,
  },
  emptyTodos: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTodosIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyTodosText: {
    fontSize: font.sizes.sm,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },
  tabTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    marginBottom: spacing.xs,
  },
  tabSubtitle: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.lg,
  },
  inputArea: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: font.sizes.md,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  actionBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  errorText: {
    color: '#EF4444',
    fontSize: font.sizes.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    marginBottom: spacing.sm,
  },
  resultContent: {
    fontSize: font.sizes.sm,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  resultActions: {
    marginBottom: spacing.md,
  },
  resultActionsTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  resultActionItem: {
    fontSize: font.sizes.sm,
    marginLeft: spacing.sm,
  },
  openNoteBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  openNoteBtnText: {
    color: '#fff',
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  searchTabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  searchTabText: {
    color: '#fff',
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: font.sizes.md,
  },
  searchBtn: {
    color: colors.primary,
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    padding: spacing.sm,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: font.sizes.sm,
  },
  searchResults: {
    flex: 1,
  },
  searchAnswer: {
    fontSize: font.sizes.lg,
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  highlightsSection: {
    marginBottom: spacing.lg,
  },
  highlightsTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  highlightCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  highlightTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  highlightText: {
    fontSize: font.sizes.sm,
    lineHeight: 20,
  },
  suggestionsSection: {
    marginBottom: spacing.lg,
  },
  suggestionsTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionTag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  suggestionTagText: {
    fontSize: font.sizes.sm,
  },
  answerCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  answerLabel: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  answerText: {
    fontSize: font.sizes.md,
    lineHeight: 22,
  },
  sourcesSection: {
    marginBottom: spacing.lg,
  },
  sourcesTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  sourceCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  sourceTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  sourceContent: {
    fontSize: font.sizes.xs,
    lineHeight: 18,
  },
  todoSection: {
    marginBottom: spacing.xl,
  },
  todoSectionTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.md,
  },
  todoCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  todoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  todoCardText: {
    fontSize: font.sizes.md,
    flex: 1,
    marginRight: spacing.sm,
  },
  todoCardPriority: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.semibold,
  },
  todoCardNotebook: {
    fontSize: font.sizes.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    fontSize: font.sizes.md,
  },
  ragResults: {
    flex: 1,
  },
  ragAnswerCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  ragAnswerText: {
    fontSize: font.sizes.md,
    lineHeight: 26,
  },
  sourcesSection: {
    marginBottom: spacing.lg,
  },
  sourcesTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  sourceCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  sourceTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.medium,
  },
  generateBtn: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  dailyContent: {
    flex: 1,
  },
  dailySummaryCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  dailySummaryLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  dailySummaryText: {
    fontSize: font.sizes.md,
    lineHeight: 24,
  },
  dailySection: {
    marginBottom: spacing.lg,
  },
  dailySectionTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  topicTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicTag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  topicTagText: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  highlightItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  highlightItemText: {
    fontSize: font.sizes.md,
    marginBottom: spacing.xs,
  },
  highlightItemSource: {
    fontSize: font.sizes.xs,
  },
  suggestionText: {
    fontSize: font.sizes.md,
    marginBottom: spacing.xs,
  },
  pendingTodoText: {
    fontSize: font.sizes.md,
    marginBottom: spacing.xs,
  },
  regenerateBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  regenerateBtnText: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  tagsSection: {
    marginBottom: spacing.lg,
  },
  tagsSectionTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.md,
  },
  tagsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagItemText: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
    marginRight: spacing.xs,
  },
  tagItemCount: {
    fontSize: font.sizes.xs,
  },
  podcastContainer: {
    gap: spacing.md,
  },
  podcastHeader: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  podcastTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    marginBottom: spacing.xs,
  },
  podcastDuration: {
    fontSize: font.sizes.sm,
  },
  podcastSection: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTypeIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  podcastSectionTitle: {
    flex: 1,
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  sectionDuration: {
    fontSize: font.sizes.xs,
  },
  sectionContent: {
    fontSize: font.sizes.sm,
    lineHeight: 22,
  },
  keyPointsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  keyPointsTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  keyPointText: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.xs,
  },
  actionCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.xs,
  },
  inspireContainer: {
    gap: spacing.lg,
  },
  recommendationsSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  recCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recTypeIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priorityText: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.medium,
  },
  recTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  recDesc: {
    fontSize: font.sizes.sm,
  },
  trendingSection: {
    gap: spacing.sm,
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trendingTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  trendingTagText: {
    fontSize: font.sizes.sm,
  },
  connectionsSection: {
    gap: spacing.xs,
  },
  connectionText: {
    fontSize: font.sizes.sm,
  },
  externalResult: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  answerCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  answerLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  answerText: {
    fontSize: font.sizes.md,
    lineHeight: 24,
  },
  sourcesLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  sourceItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  sourceContent: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.xs,
  },
  sourceUrl: {
    fontSize: font.sizes.xs,
  },
  thinkingContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  questionCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  questionIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  questionText: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.semibold,
    textAlign: 'center',
    lineHeight: 26,
  },
  contextCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  contextLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  contextText: {
    fontSize: font.sizes.md,
    lineHeight: 22,
  },
  hintsSection: {
    gap: spacing.sm,
  },
  hintsLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  hintBullet: {
    fontSize: font.sizes.md,
    color: colors.primary,
  },
  hintText: {
    fontSize: font.sizes.md,
    flex: 1,
  },
  clusterContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  clustersSection: {
    gap: spacing.md,
  },
  clusterCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clusterTheme: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  clusterCount: {
    fontSize: font.sizes.sm,
  },
  clusterDesc: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.sm,
  },
  clusterNotebooks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  clusterNotebookChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  clusterNotebookText: {
    fontSize: font.sizes.xs,
  },
  mergeSuggestion: {
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  mergeSuggestionText: {
    fontSize: font.sizes.sm,
  },
  orphansSection: {
    gap: spacing.sm,
  },
  orphanItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  orphanTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
  },
  orphanReason: {
    fontSize: font.sizes.xs,
    marginTop: spacing.xs,
  },
  insightsSection: {
    gap: spacing.xs,
  },
  insightText: {
    fontSize: font.sizes.sm,
    lineHeight: 20,
  },
  gapsContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  scoreCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  scoreLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: font.weights.bold,
  },
  gapsSection: {
    gap: spacing.md,
  },
  gapCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gapTopic: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    flex: 1,
  },
  gapDesc: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.sm,
  },
  gapActions: {
    gap: spacing.xs,
  },
  gapActionsLabel: {
    fontSize: font.sizes.xs,
  },
  gapActionText: {
    fontSize: font.sizes.sm,
  },
  moreText: {
    fontSize: font.sizes.xs,
  },
  recommendationText: {
    fontSize: font.sizes.sm,
    lineHeight: 20,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  periodBtnText: {
    color: '#fff',
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
  },
  timelineContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  themesSection: {
    gap: spacing.sm,
  },
  themesList: {
    gap: spacing.xs,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  themeName: {
    flex: 1,
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
  },
  themeCount: {
    fontSize: font.sizes.sm,
  },
  themeTrend: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.semibold,
  },
  eventsSection: {
    gap: spacing.sm,
  },
  eventItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  eventTypeIcon: {
    fontSize: 14,
  },
  eventDate: {
    fontSize: font.sizes.xs,
  },
  eventTitle: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.xs,
  },
  eventTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  eventTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  eventTagText: {
    fontSize: font.sizes.xs,
  },
  reviewContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  summaryText: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    textAlign: 'center',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  progressItem: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  progressIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: font.weights.bold,
  },
  progressLabel: {
    fontSize: font.sizes.xs,
    marginTop: spacing.xs,
  },
  topicsSection: {
    gap: spacing.sm,
  },
  topicItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicName: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
  },
  topicCount: {
    fontSize: font.sizes.xs,
  },
  topicInsight: {
    fontSize: font.sizes.xs,
    marginTop: spacing.xs,
  },
  nextFocusSection: {
    gap: spacing.xs,
  },
  focusText: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
})
