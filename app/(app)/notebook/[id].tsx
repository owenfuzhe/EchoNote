import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Animated, Dimensions, ScrollView, TouchableWithoutFeedback } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useNotebookStore } from '@/store/notebook-store'
import NotebookEditor, { NotebookEditorRef } from '@/components/editor/NotebookEditor'
import { colors, spacing, font, radius } from '@/components/ui/theme'
import { AnalyzeResult } from '@/hooks/use-llm'
import { supabase } from '@/lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.4

interface RelatedNotebook {
  id: string
  title: string
  similarity: number
  preview: string
}

export default function NotebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  const { notebooks, activeCells, loadCells, isLoading } = useNotebookStore()
  const notebook = notebooks.find((n) => n.id === id)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  
  const editorRef = useRef<NotebookEditorRef>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [aiResult, setAIResult] = useState<AnalyzeResult | null>(null)
  const [relatedNotebooks, setRelatedNotebooks] = useState<RelatedNotebook[]>([])
  const [loadingRelated, setLoadingRelated] = useState(false)
  
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current

  useEffect(() => { if (id) loadCells(id) }, [id])

  useEffect(() => {
    setAIResult(null)
    setIsProcessing(false)
    setShowSidebar(false)
    if (activeCells.length > 0) {
      const aiCell = [...activeCells].reverse().find(cell => cell.type === 'ai_output')
      if (aiCell && aiCell.structured) {
        setAIResult(aiCell.structured as any)
      }
      loadRelatedNotebooks()
    }
  }, [id, activeCells])

  const loadRelatedNotebooks = async () => {
    if (!id) return
    setLoadingRelated(true)
    
    try {
      const { data: currentCells } = await supabase
        .from('cells')
        .select('embedding')
        .eq('notebook_id', id)
        .not('embedding', 'is', null)
        .limit(5)
      
      if (!currentCells || currentCells.length === 0) {
        setLoadingRelated(false)
        return
      }
      
      const embeddings = currentCells
        .map(c => c.embedding)
        .filter(Boolean)
      
      if (embeddings.length === 0) {
        setLoadingRelated(false)
        return
      }
      
      const avgEmbedding = embeddings[0].map((_: number, i: number) => 
        embeddings.reduce((sum: number, emb: number[]) => sum + emb[i], 0) / embeddings.length
      )
      
      const { data: similarCells } = await supabase.rpc('find_similar_cells', {
        query_embedding: avgEmbedding,
        match_threshold: 0.5,
        match_count: 5
      })
      
      if (similarCells && similarCells.length > 0) {
        const relatedMap = new Map<string, { id: string; title: string; preview: string; maxSimilarity: number }>()
        
        for (const cell of similarCells) {
          if (cell.notebook_id === id) continue
          if (relatedMap.has(cell.notebook_id)) {
            const existing = relatedMap.get(cell.notebook_id)!
            if (cell.similarity > existing.maxSimilarity) {
              relatedMap.set(cell.notebook_id, {
                id: cell.notebook_id,
                title: cell.notebook_title || '未命名笔记',
                preview: cell.content_preview || '',
                maxSimilarity: cell.similarity
              })
            }
          } else {
            relatedMap.set(cell.notebook_id, {
              id: cell.notebook_id,
              title: cell.notebook_title || '未命名笔记',
              preview: cell.content_preview || '',
              maxSimilarity: cell.similarity
            })
          }
        }
        
        const related = Array.from(relatedMap.values())
          .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
          .slice(0, 3)
          .map(r => ({
            id: r.id,
            title: r.title,
            similarity: r.maxSimilarity,
            preview: r.preview
          }))
        
        setRelatedNotebooks(related)
      }
    } catch (e) {
      console.error('Load related notebooks error:', e)
    }
    
    setLoadingRelated(false)
  }

  const openSidebar = () => {
    setShowSidebar(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowSidebar(false))
  }

  const handleAI = async () => {
    if (activeCells.length === 0) return
    
    if (aiResult) {
      openSidebar()
      return
    }
    
    if (!editorRef.current) return
    setIsProcessing(true)
    editorRef.current.triggerAI()
  }

  const handleRegenerate = async () => {
    if (!editorRef.current || activeCells.length === 0) return
    setAIResult(null)
    setIsProcessing(true)
    editorRef.current.triggerAI()
  }

  const handleAIResult = (result: AnalyzeResult) => {
    setAIResult(result)
    setIsProcessing(false)
    openSidebar()
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
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
        <TouchableOpacity 
          style={[
            styles.aiBtn, 
            (isProcessing || activeCells.length === 0) && styles.aiBtnDisabled
          ]}
          onPress={handleAI}
          disabled={isProcessing || activeCells.length === 0}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.aiBtnText}>✨</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.meta, { color: theme.textTertiary }]}>
        {activeCells.length} {activeCells.length === 1 ? 'cell' : 'cells'}
      </Text>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <NotebookEditor ref={editorRef} notebookId={id} onAIResult={handleAIResult} />
      )}

      {relatedNotebooks.length > 0 && (
        <View style={[styles.relatedSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.relatedTitle, { color: theme.textSecondary }]}>🔗 相关笔记</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {relatedNotebooks.map((related) => (
              <TouchableOpacity
                key={related.id}
                style={[styles.relatedCard, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={() => router.push(`/(app)/notebook/${related.id}`)}
              >
                <Text style={[styles.relatedCardTitle, { color: theme.text }]} numberOfLines={1}>
                  {related.title}
                </Text>
                <Text style={[styles.relatedCardPreview, { color: theme.textSecondary }]} numberOfLines={2}>
                  {related.preview}
                </Text>
                <View style={styles.relatedCardMeta}>
                  <Text style={[styles.relatedCardSimilarity, { color: colors.primary }]}>
                    {Math.round(related.similarity * 100)}% 相似
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showSidebar && (
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View 
        style={[
          styles.sidebar, 
          { 
            backgroundColor: theme.surface,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: theme.text }]}>✨ AI 分析</Text>
          <View style={styles.sidebarActions}>
            {aiResult && (
              <TouchableOpacity onPress={handleRegenerate} style={styles.regenerateBtn}>
                <Text style={styles.regenerateText}>🔄</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          {aiResult ? (
            <>
              {aiResult.summary && (
                <View style={styles.section}>
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    {aiResult.summary}
                  </Text>
                </View>
              )}

              {aiResult.atomic_ideas && aiResult.atomic_ideas.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💭 想法拆解</Text>
                  {aiResult.atomic_ideas.map((idea, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemEmoji}>{getIdeaTypeEmoji(idea.type)}</Text>
                      <Text style={[styles.itemText, { color: theme.text }]}>{idea.content}</Text>
                    </View>
                  ))}
                </View>
              )}

              {aiResult.insights && aiResult.insights.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💡 洞察</Text>
                  {aiResult.insights.map((insight, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemEmoji}>{getInsightTypeEmoji(insight.type)}</Text>
                      <Text style={[styles.itemText, { color: theme.text }]}>{insight.content}</Text>
                    </View>
                  ))}
                </View>
              )}

              {aiResult.action_items && aiResult.action_items.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>✅ 待办事项</Text>
                  {aiResult.action_items.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemEmoji}>{getPriorityEmoji(item.priority)}</Text>
                      <Text style={[styles.itemText, { color: theme.text }]}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {aiResult.follow_up && (
                <View style={[styles.followUpSection, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={styles.followUpLabel}>🤔 AI 追问</Text>
                  <Text style={[styles.followUpText, { color: theme.text }]}>
                    {aiResult.follow_up}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyAI}>
              <Text style={styles.emptyAIIcon}>🤖</Text>
              <Text style={[styles.emptyAIText, { color: theme.textSecondary }]}>
                点击右上角 ✨ 按钮开始 AI 分析
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

function getIdeaTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    fact: '📌',
    thought: '💭',
    question: '❓',
    plan: '📋',
    feeling: '❤️',
    commitment: '🤝',
  }
  return map[type] || '•'
}

function getInsightTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    pattern: '🔄',
    risk: '⚠️',
    opportunity: '🌟',
    gap: '🔍',
  }
  return map[type] || '•'
}

function getPriorityEmoji(priority: string): string {
  const map: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  }
  return map[priority] || '○'
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
  aiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnDisabled: {
    opacity: 0.5,
  },
  aiBtnText: {
    fontSize: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sidebarTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
  },
  sidebarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  regenerateBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateText: {
    fontSize: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
  },
  sidebarContent: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  summaryText: {
    fontSize: font.sizes.lg,
    lineHeight: 28,
    fontWeight: font.weights.medium,
  },
  sectionTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemEmoji: {
    width: 28,
    fontSize: 16,
  },
  itemText: {
    flex: 1,
    fontSize: font.sizes.md,
    lineHeight: 24,
  },
  followUpSection: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  followUpLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  followUpText: {
    fontSize: font.sizes.md,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  emptyAI: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyAIIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyAIText: {
    fontSize: font.sizes.md,
    textAlign: 'center',
  },
  relatedSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  relatedTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.sm,
  },
  relatedCard: {
    width: 140,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  relatedCardTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  relatedCardPreview: {
    fontSize: font.sizes.xs,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  relatedCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relatedCardSimilarity: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.medium,
  },
})
